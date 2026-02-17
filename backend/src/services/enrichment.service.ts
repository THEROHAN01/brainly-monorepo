/**
 * Content Enrichment Service
 *
 * Background service that polls for content with enrichmentStatus='pending',
 * runs the appropriate extractor, and saves the extracted metadata.
 *
 * Phase 1: Simple setInterval polling (no Redis/Bull needed).
 * Phase 2: Migrate to BullMQ when scaling requires it.
 */

import { ContentModel } from '../db';
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
    const staleResult = await ContentModel.updateMany(
        { enrichmentStatus: 'processing' },
        { enrichmentStatus: 'pending' }
    );
    if (staleResult.modifiedCount > 0) {
        log.warn({ count: staleResult.modifiedCount }, 'Reset stale processing documents to pending');
    }

    log.info({ pollIntervalMs: config.extractors.pollIntervalMs }, 'Enrichment service started');

    // Run immediately on start, then poll
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
 * Uses per-user fairness: selects at most one item per user to prevent
 * a single user with many saved links from monopolizing the queue.
 */
async function processNextBatch(): Promise<void> {
    isProcessing = true;

    try {
        // Find content that needs enrichment, respecting retry delay
        const retryAfter = new Date(Date.now() - config.extractors.retryDelayMs);

        // Per-user fair batching: aggregate to pick one pending item per user,
        // then limit to BATCH_SIZE total
        const pendingContent = await ContentModel.aggregate([
            {
                $match: {
                    enrichmentStatus: 'pending',
                    $or: [
                        { enrichmentRetries: { $exists: false } },
                        { enrichmentRetries: 0 },
                        {
                            enrichmentRetries: { $gt: 0, $lt: config.extractors.maxRetries },
                            updatedAt: { $lt: retryAfter },
                        },
                    ],
                },
            },
            { $sort: { createdAt: 1 } },
            // Group by user, take only the oldest item per user
            {
                $group: {
                    _id: '$userId',
                    docId: { $first: '$_id' },
                    type: { $first: '$type' },
                    link: { $first: '$link' },
                    contentId: { $first: '$contentId' },
                    title: { $first: '$title' },
                    enrichmentRetries: { $first: '$enrichmentRetries' },
                    createdAt: { $first: '$createdAt' },
                },
            },
            { $sort: { createdAt: 1 } },
            { $limit: BATCH_SIZE },
        ]);

        // Remap aggregation output to match what processContent expects
        const items = pendingContent.map(doc => ({
            _id: doc.docId,
            type: doc.type,
            link: doc.link,
            contentId: doc.contentId,
            title: doc.title,
            enrichmentRetries: doc.enrichmentRetries,
            userId: doc._id,
        }));

        if (items.length > 0) {
            log.debug({ count: items.length }, 'Processing enrichment batch');
        }

        // Process concurrently with bounded parallelism
        await runWithConcurrency(
            items.map(content => () => processContent(content)),
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
 * Uses findOneAndUpdate for atomic claim to prevent duplicate processing.
 */
async function processContent(content: any): Promise<void> {
    const { _id, type, link, contentId, userId } = content;

    const contentLog = log.child({ contentId: _id.toString(), type, userId: userId?.toString() });

    // Check if extractor is configured for this type
    if (!isExtractorConfigured(type)) {
        await ContentModel.updateOne(
            { _id },
            { enrichmentStatus: 'skipped', enrichmentError: `No configured extractor for type: ${type}` }
        );
        contentLog.info('Skipped — no configured extractor');
        return;
    }

    // Atomic claim: only proceed if we successfully transition from pending → processing
    const claimed = await ContentModel.findOneAndUpdate(
        { _id, enrichmentStatus: 'pending' },
        { enrichmentStatus: 'processing' },
        { new: true }
    );
    if (!claimed) return; // Another instance already claimed it

    try {
        const extractor = getExtractor(type);
        contentLog.info({ extractor: extractor.displayName, link }, 'Enriching content');

        const metadata = await extractor.extract(link, contentId);

        await ContentModel.updateOne(
            { _id },
            {
                enrichmentStatus: 'enriched',
                $unset: { enrichmentError: 1 },
                enrichedAt: new Date(),
                metadata,
            }
        );

        contentLog.info({ extractor: extractor.displayName, title: content.title }, 'Enrichment complete');
    } catch (err) {
        const retries = (content.enrichmentRetries || 0) + 1;
        const maxedOut = retries >= config.extractors.maxRetries;

        await ContentModel.updateOne(
            { _id },
            {
                enrichmentStatus: maxedOut ? 'failed' : 'pending',
                enrichmentError: (err as Error).message,
                enrichmentRetries: retries,
            }
        );

        contentLog.error(
            { err, attempt: retries, maxRetries: config.extractors.maxRetries, final: maxedOut },
            'Enrichment failed'
        );
    }
}

/**
 * Run async tasks with bounded concurrency.
 * At most `limit` tasks execute simultaneously.
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
