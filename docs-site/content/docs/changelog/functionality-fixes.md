---
title: Functionality Fixes
description: A dated log of correctness fixes applied to the app (2026-03-16).
---

Fixes for issues that broke or degraded app functionality, applied on
**2026-03-16**.

| # | Issue | Severity | Files Changed | Commit | Description |
| --- | --- | --- | --- | --- | --- |
| 1 | Public share route has no try-catch | **Critical** | `backend/src/index.ts` | `d1355cd` | `GET /brain/:shareLink` had no error handling — any DB error caused an unhandled rejection that crashed Express. Added try-catch and fixed incorrect 411 status codes to proper 404s. |
| 2 | No pagination on content retrieval | **High** | `backend/src/index.ts` | `79810f3` | `GET /content` and `GET /brain/:shareLink` returned all items with no limit. Added `limit`/`skip` query params (default 100, max 1000), newest-first, with total count and `hasMore`. |
| 3 | Expired JWT leaves a broken dashboard | **High** | `frontend/src/lib/api.ts` (new), hooks, `dashboard.tsx` | `90cdbed` | After 7-day JWT expiry, all API calls returned 401 but the frontend never detected it. Added a centralized Axios instance with a response interceptor that clears the token and redirects to `/signin` on 401. |
| 4 | Notion provider registered but has no extractor | **Medium** | `backend/src/config.ts` | `10373bd` | The Notion provider was enabled but no extractor existed — saved Notion URLs got stuck permanently in `pending`. Disabled the provider flag until an extractor is implemented. |
| 5 | No double-submit protection on actions | **Medium** | `dashboard.tsx`, `ConfirmDialog.tsx` | `a1c0f58` | Delete, share, and content creation had no loading guards. Added `deleting`/`sharing` state guards and loading indicators. |

## Code review follow-up fixes

Applied after code review of the above changes.

| # | Issue | Severity | Files Changed | Commit | Description |
| --- | --- | --- | --- | --- | --- |
| 6 | ConfirmDialog closes before async delete completes | **Critical** | `ConfirmDialog.tsx`, `dashboard.tsx` | `901f2b2` | The confirm button called `onCancel()` immediately after `onConfirm()`, hiding the spinner. Dialog now closes in `confirmDelete`'s `finally` block. |
| 7 | `GET /content` missing try-catch | **Critical** | `backend/src/index.ts` | `901f2b2` | Same class of bug as the share route — added try-catch with a 500 response. |
| 8 | CreateContentModal bypasses centralized API | **Critical** | `CreateContentModal.tsx` | `901f2b2` | Used raw `localStorage` + manual axios, bypassing the 401 interceptor. Migrated to the centralized `api` instance. |
| 9 | Multiple simultaneous 401 redirects | **Important** | `frontend/src/lib/api.ts` | `901f2b2` | All three hooks fired in parallel, each triggering navigation. Added an `isRedirecting` flag so only the first 401 navigates. |
| 10 | Default pagination limit too low | **Important** | `backend/src/index.ts` | `901f2b2` | Default of 100 silently truncated content for users with >100 items (no "load more" UI yet). Raised the default to 1000 until frontend pagination ships. |
