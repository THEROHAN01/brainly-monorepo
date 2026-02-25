/**
 * Content Enrichment Service
 *
 * Background service that polls for content with enrichmentStatus='pending',
 * runs the appropriate extractor, and saves the extracted metadata.
 *
 * Phase 1: Simple setInterval polling (no Redis/Bull needed).
 * Phase 2: Migrate to BullMQ when scaling requires it.
 */

import { eq, and, or, lt, sql } from 'drizzle-orm';
import { db, schema } from '../db/index';
import { config } from '../config';
import { getExtractor, isExtractorConfigured } from '../extractors/registry';
import { logger } from '../logger';

const BATCH_SIZE = 5;
const CONCURRENCY = 3;

const log = logger.child({ service: 'enrichment' });

let intervalId: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/**
 * Start the enrichment polling loop.
 * Called once on server boot (after DB is connected).
 */
export async function startEnrichmentService(): Promise<void> {
    if (!config.extractors.enabled) {
        log.info('Enrichment service disabled via config');
        return;
    }

    // Recovery: reset any documents stuck in 'processing' from a previous crash
    const staleResult = await db
        .update(schema.contents)
        .set({ enrichmentStatus: 'pending' })
        .where(eq(schema.contents.enrichmentStatus, 'processing'))
        .returning();

    if (staleResult.length > 0) {
        log.warn({ count: staleResult.length }, 'Reset stale processing documents to pending');
    }

    log.info({ pollIntervalMs: config.extractors.pollIntervalMs }, 'Enrichment service started');

    processNextBatch();

    intervalId = setInterval(() => {
        if (!isProcessing) {
            processNextBatch();
        }
    }, config.extractors.pollIntervalMs);
}

/**
 * Stop the enrichment service.
 */
export function stopEnrichmentService(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
        log.info('Enrichment service stopped');
    }
}

/**
 * Process the next batch of pending content.
 * Uses per-user fairness via DISTINCT ON: selects at most one item per user
 * to prevent a single user with many saved links from monopolizing the queue.
 */
async function processNextBatch(): Promise<void> {
    isProcessing = true;

    try {
        const retryAfter = new Date(Date.now() - config.extractors.retryDelayMs);

        // DISTINCT ON (user_id) gives per-user fairness — one item per user per batch
        const rawResult = await db.execute(sql`
            SELECT DISTINCT ON (user_id)
                id, type, link, content_id, title, user_id, enrichment_retries, created_at
            FROM contents
            WHERE enrichment_status = 'pending'
              AND (
                enrichment_retries = 0
                OR (
                    enrichment_retries > 0
                    AND enrichment_retries < ${config.extractors.maxRetries}
                    AND updated_at < ${retryAfter}
                )
              )
            ORDER BY user_id, created_at ASC
            LIMIT ${BATCH_SIZE}
        `);

        const rows: any[] = (rawResult as any).rows ?? (rawResult as any);

        const items = rows.map((row: any) => ({
            id: row.id as string,
            type: row.type as string,
            link: row.link as string,
            contentId: row.content_id as string | null,
            title: row.title as string,
            userId: row.user_id as string,
            enrichmentRetries: (row.enrichment_retries as number) || 0,
        }));

        if (items.length > 0) {
            log.debug({ count: items.length }, 'Processing enrichment batch');
        }

        await runWithConcurrency(
            items.map((content: typeof items[0]) => () => processContent(content)),
            CONCURRENCY
        );
    } catch (err) {
        log.error({ err }, 'Enrichment batch error');
    } finally {
        isProcessing = false;
    }
}

/**
 * Process a single content item.
 * Uses UPDATE ... WHERE enrichment_status='pending' for atomic claim.
 */
async function processContent(content: {
    id: string;
    type: string;
    link: string;
    contentId: string | null;
    title: string;
    userId: string;
    enrichmentRetries: number;
}): Promise<void> {
    const { id, type, link, contentId, userId } = content;
    const contentLog = log.child({ contentId: id, type, userId });

    // Check if extractor is configured for this type
    if (!isExtractorConfigured(type)) {
        await db.update(schema.contents)
            .set({ enrichmentStatus: 'skipped', enrichmentError: `No configured extractor for type: ${type}` })
            .where(eq(schema.contents.id, id));
        contentLog.info('Skipped — no configured extractor');
        return;
    }

    // Atomic claim: only proceed if we successfully transition from pending → processing
    const [claimed] = await db
        .update(schema.contents)
        .set({ enrichmentStatus: 'processing' })
        .where(and(eq(schema.contents.id, id), eq(schema.contents.enrichmentStatus, 'pending')))
        .returning();

    if (!claimed) return; // Another instance already claimed it

    try {
        const extractor = getExtractor(type);
        contentLog.info({ extractor: extractor.displayName, link }, 'Enriching content');

        const metadata = await extractor.extract(link, contentId ?? '');

        await db.update(schema.contents).set({
            enrichmentStatus: 'enriched',
            enrichmentError: null,
            enrichedAt: new Date(),
            metaTitle: metadata.title ?? null,
            metaDescription: metadata.description ?? null,
            metaAuthor: metadata.author ?? null,
            metaAuthorUrl: metadata.authorUrl ?? null,
            metaThumbnail: metadata.thumbnailUrl ?? null,
            metaPublishedAt: metadata.publishedDate ? new Date(metadata.publishedDate) : null,
            metaTags: metadata.tags ?? null,
            metaLanguage: metadata.language ?? null,
            fullText: metadata.fullText ?? null,
            fullTextType: metadata.fullTextType ?? null,
            transcriptSegments: metadata.transcriptSegments ?? null,
            providerData: metadata.providerData ?? null,
            extractedAt: metadata.extractedAt ?? new Date(),
            extractorVersion: metadata.extractorVersion ?? null,
        }).where(eq(schema.contents.id, id));

        contentLog.info({ extractor: extractor.displayName, title: content.title }, 'Enrichment complete');
    } catch (err) {
        const retries = content.enrichmentRetries + 1;
        const maxedOut = retries >= config.extractors.maxRetries;

        await db.update(schema.contents).set({
            enrichmentStatus: maxedOut ? 'failed' : 'pending',
            enrichmentError: (err as Error).message,
            enrichmentRetries: retries,
        }).where(eq(schema.contents.id, id));

        contentLog.error(
            { err, attempt: retries, maxRetries: config.extractors.maxRetries, final: maxedOut },
            'Enrichment failed'
        );
    }
}

/**
 * Run async tasks with bounded concurrency.
 */
async function runWithConcurrency(tasks: Array<() => Promise<void>>, limit: number): Promise<void> {
    const executing = new Set<Promise<void>>();

    for (const task of tasks) {
        const p = task().then(() => { executing.delete(p); }, () => { executing.delete(p); });
        executing.add(p);
        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
}
