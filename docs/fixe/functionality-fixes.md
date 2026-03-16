# Functionality Fixes Log

Fixes for issues that break or degrade app functionality, applied on 2026-03-16.

| # | Issue | Severity | Files Changed | Commit | Description |
|---|-------|----------|---------------|--------|-------------|
| 1 | Public share route has no try-catch | **Critical** | `backend/src/index.ts` | `d1355cd` | The `GET /brain/:shareLink` endpoint had no error handling. Any DB error caused an unhandled promise rejection that crashed the Express process. Added try-catch and fixed incorrect 411 status codes to proper 404 responses. |
| 2 | No pagination on content retrieval | **High** | `backend/src/index.ts` | `79810f3` | `GET /content` and `GET /brain/:shareLink` returned all items with no limit. As content grows, this causes request timeouts and browser freezes. Added `limit`/`skip` query params (default 100, max 1000), sorted by newest first, with total count and `hasMore` flag. |
| 3 | Expired JWT token leaves broken dashboard | **High** | `frontend/src/lib/api.ts` (new), `frontend/src/hooks/useContents.tsx`, `frontend/src/hooks/useUser.ts`, `frontend/src/hooks/useTags.tsx`, `frontend/src/pages/dashboard.tsx` | `90cdbed` | After the 7-day JWT expiry, all API calls returned 401 but the frontend never detected it — users saw empty content or generic errors with no way to recover. Created a centralized Axios instance with a response interceptor that clears the token and redirects to `/signin` on 401. |
| 4 | Notion provider registered but has no extractor | **Medium** | `backend/src/config.ts` | `10373bd` | The Notion content provider was enabled but no corresponding extractor existed. Saving a Notion URL would accept it, then the enrichment service would pick it up and fail — leaving content permanently stuck in `pending` status. Disabled the provider flag until an extractor is implemented. |
| 5 | No double-submit protection on actions | **Medium** | `frontend/src/pages/dashboard.tsx`, `frontend/src/components/ui/ConfirmDialog.tsx` | `a1c0f58` | Delete, share, and content creation had no loading guards. Rapid clicks fired multiple API calls, creating duplicate entries or triggering redundant deletes (with error toasts on the second call). Added `deleting`/`sharing` state guards and loading indicators on the confirm button. |

## Code Review Follow-up Fixes

Applied after code review of the above changes.

| # | Issue | Severity | Files Changed | Commit | Description |
|---|-------|----------|---------------|--------|-------------|
| 6 | ConfirmDialog closes before async delete completes | **Critical** | `frontend/src/components/ui/ConfirmDialog.tsx`, `frontend/src/pages/dashboard.tsx` | `901f2b2` | The confirm button called `onCancel()` immediately after `onConfirm()`, closing the dialog before the delete API call finished — hiding the loading spinner. Removed premature `onCancel()`, dialog now closes in `confirmDelete`'s `finally` block. |
| 7 | `GET /content` endpoint missing try-catch | **Critical** | `backend/src/index.ts` | `901f2b2` | Same class of bug fixed on the share route — if MongoDB throws during content fetch, the unhandled promise rejection would crash Express. Added try-catch with 500 error response. |
| 8 | CreateContentModal bypasses centralized API instance | **Critical** | `frontend/src/components/ui/CreateContentModal.tsx` | `901f2b2` | Content creation and URL validation calls used raw `localStorage` and manual axios with hardcoded headers, bypassing the 401 interceptor. Migrated to the centralized `api` instance. |
| 9 | Multiple simultaneous 401 redirects | **Important** | `frontend/src/lib/api.ts` | `901f2b2` | When JWT expires, all three hooks fire in parallel and each triggers `window.location.href = "/signin"`. Added `isRedirecting` flag so only the first 401 triggers navigation. |
| 10 | Default pagination limit too low for frontend without pagination UI | **Important** | `backend/src/index.ts` | `901f2b2` | Default was 100 items but frontend has no "load more" mechanism, silently truncating content for users with >100 items. Raised default to 1000 until frontend pagination is implemented. |
