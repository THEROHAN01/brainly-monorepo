---
title: Glossary
description: The domain vocabulary Brainly's documentation assumes.
icon: BookA
---

A canonical reference for the terms used throughout these docs.

| Term | Definition |
| --- | --- |
| **Brain** | A user's entire collection of saved content. "Sharing a brain" exposes it via a public read-only link. |
| **Provider** | A plugin that parses and classifies a URL synchronously (type, `contentId`, embed/canonical URLs). Runs on both frontend and backend. Pure string parsing, zero I/O. See [Provider System](/docs/backend/providers). |
| **Extractor** | A plugin that fetches rich metadata for a saved item from a platform API in the background. Runs on the backend only. See [Extractor System](/docs/backend/extractors). |
| **Enrichment** | The background process of fetching and storing metadata (titles, descriptions, transcripts, READMEs) for saved content. See [Enrichment Pipeline](/docs/architecture/enrichment-pipeline). |
| **enrichmentStatus** | The lifecycle state of a content item: `pending` → `processing` → `enriched` / `failed` / `skipped`. |
| `pending` | Newly created, or previously failed and eligible for retry. |
| `processing` | Atomically claimed by a worker; prevents double processing. |
| `enriched` | Metadata successfully extracted and stored in `metadata`. |
| `failed` | All retries exhausted; `enrichmentError` holds the last error. |
| `skipped` | No configured extractor for this content type (e.g. missing API key). |
| **contentId** | The platform-specific identifier extracted from a URL (a YouTube video ID, a tweet ID, or an MD5 hash for generic links). |
| **shareLink / hash** | A 10-char alphanumeric token that maps to a user's public brain (`GET /api/v1/brain/:shareLink`). |
| **fullText / fullTextType** | The extracted body text used for future search/RAG, tagged as `transcript`, `article`, `markdown`, or `plain`. |
| **Innertube** | YouTube's internal player API, used by the YouTube extractor to fetch transcripts without an API key (the extractor still requires `YOUTUBE_API_KEY` to run at all). |
| **SSRF** | Server-Side Request Forgery — the attack class that `safeFetch` defends against by blocking requests to private IP ranges. See [Security](/docs/backend/security). |
| **Fair batching** | The enrichment poller's per-user grouping that prevents one user from monopolizing the queue. |
| **Provider mirror** | The frontend copy of the provider system that validates/classifies URLs client-side without a server round-trip. |
