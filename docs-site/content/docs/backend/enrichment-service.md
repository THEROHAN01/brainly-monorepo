---
title: Enrichment Service
description: The background polling service — fair batching, bounded concurrency, retries, and crash recovery.
---

**File:** `backend/src/services/enrichment.service.ts`

A background polling service that enriches saved content with metadata from
platform APIs. See [Enrichment Pipeline](/docs/architecture/enrichment-pipeline)
for the conceptual state machine.

## Constants & lifecycle

```ts
const BATCH_SIZE = 5;       // Max items per poll cycle
const CONCURRENCY = 3;      // Max parallel extractor calls

export async function startEnrichmentService(): Promise<void>;  // Start polling
export function stopEnrichmentService(): void;                   // Stop polling (used in tests)
```

## How it works

1. On server boot, `startEnrichmentService()` is called after `connectDB()`.
2. It first resets any content stuck in `processing` back to `pending` (crash recovery).
3. Runs `processNextBatch()` immediately, then every `pollIntervalMs` (30s).
4. Skips the interval tick if a batch is still processing (`isProcessing` flag).

## Processing flow

1. **Guard check:** if `isProcessing` is true, skip this cycle (prevents
   overlapping polls).
2. **Fair batch selection:** an aggregation pipeline groups by `userId`, picks one
   pending item per user, sorts oldest-first, limited to `BATCH_SIZE`.
3. **Atomic claim:** `findOneAndUpdate({ _id, enrichmentStatus: 'pending' }, { enrichmentStatus: 'processing' })`.
   Returns `null` if another instance already claimed it — safe for multi-instance.
4. **Bounded concurrency:** `runWithConcurrency(tasks, 3)` processes up to
   `CONCURRENCY` items simultaneously via a `Promise.race` pool.
5. **Extract:** calls `extractor.extract(url, contentId)`.
6. **On success:** writes metadata, sets `enrichmentStatus: 'enriched'`.
7. **On failure:** increments `enrichmentRetries`; if `retries >= maxRetries (3)`
   sets `failed`, else back to `pending`.

## Per-user fairness

The aggregation pipeline ensures that if User A has 100 pending items and User B
has 1, both get served in the same cycle.

```ts
[
    { $match: { enrichmentStatus: 'pending', /* retry eligibility */ } },
    { $sort: { createdAt: 1 } },           // Oldest first
    { $group: {
        _id: '$userId',                     // One item per user
        docId: { $first: '$_id' },
        // ... other fields
    }},
    { $sort: { createdAt: 1 } },           // Oldest-user-item first across users
    { $limit: BATCH_SIZE },
]
```

## Bounded concurrency

```ts
async function runWithConcurrency(
    tasks: Array<() => Promise<void>>,
    limit: number
): Promise<void>
```

Maintains up to `limit` in-flight promises; when one resolves, the next task
starts. This prevents overwhelming external APIs.

## Query patterns

**Crash recovery (startup):**

```ts
ContentModel.updateMany(
    { enrichmentStatus: 'processing' },
    { enrichmentStatus: 'pending' }
);
```

**Atomic claim (optimistic locking):**

```ts
ContentModel.findOneAndUpdate(
    { _id, enrichmentStatus: 'pending' },   // Only if still pending
    { enrichmentStatus: 'processing' },
    { new: true }
);
// Returns null if another instance claimed it
```

**On success:**

```ts
ContentModel.updateOne(
    { _id },
    {
        enrichmentStatus: 'enriched',
        $unset: { enrichmentError: 1 },
        enrichedAt: new Date(),
        metadata,
    }
);
```

**On failure:**

```ts
ContentModel.updateOne(
    { _id },
    {
        enrichmentStatus: retries >= max ? 'failed' : 'pending',
        enrichmentError: err.message,
        enrichmentRetries: retries,
    }
);
```

**On no extractor:**

```ts
ContentModel.updateOne(
    { _id },
    {
        enrichmentStatus: 'skipped',
        enrichmentError: `No configured extractor for type: ${type}`,
    }
);
```

## Design decisions

- **Plugin architecture** — adding a content type is one provider file, one
  extractor file, one line in each registry, and one config flag.
- **Fail-safe defaults** — missing keys → `skipped`; extractor throws → retry then
  `failed`; generic extractor never throws; YouTube transcript failure is non-fatal.
- **Optimistic locking** — atomic `findOneAndUpdate` prevents double-processing
  across instances.
- **Fair scheduling** — per-user grouping prevents queue monopolization.
- **Observability** — Pino child loggers give per-item context; `enrichmentStatus`
  and `enrichmentError` make every attempt traceable.
- **Migration-friendly schema** — `metadata` is a structured sub-document (not
  `Mixed`), so it maps cleanly to Postgres columns later.
