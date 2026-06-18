---
title: Contributing
description: Workflow conventions and a step-by-step recipe for adding a new content type.
icon: GitPullRequest
---

## Workflow

1. Branch off `main`.
2. Make your change in `backend/` and/or `frontend/`.
3. Run the relevant test + type-check suites locally (see [Commands](/docs/getting-started/commands) and [Testing](/docs/testing)):
   ```bash
   cd backend  && npx tsc --noEmit && npm test
   cd frontend && npm run lint && npx tsc --noEmit && npm test
   ```
4. Open a pull request to `main`. CI ([`.github/workflows/ci.yml`](/docs/operations/ci-cd))
   runs the backend and frontend jobs in parallel and must pass.

Keep changes scoped to one package where possible — `backend/` and `frontend/`
have independent `package.json` files and no shared workspace.

## Recipe: add a new content type

The provider/extractor architecture is designed so a new platform is a handful of
small, isolated additions. To add one (say, "vimeo"):

1. **Backend provider** — add `backend/src/providers/vimeo.provider.ts`
   implementing `ContentProvider` (hostnames, `canHandle`, `extractId`,
   `getCanonicalUrl`, optional `getEmbedUrl`). Register it in
   `backend/src/providers/index.ts` behind a `config.providers.vimeo` flag.
2. **Frontend mirror** — add the same provider under `frontend/src/providers/` and
   register it, so client-side validation recognizes the URL. Add the flag to
   `frontend/src/config/providers.ts`.
3. **Backend extractor** — add `backend/src/extractors/vimeo.extractor.ts`
   implementing `ContentExtractor` (`isConfigured`, `extract`). Add it to the
   static array in `backend/src/extractors/registry.ts`.
4. **Config** — add any required API key to `backend/src/config.ts` (`apiKeys`)
   and document it in [Environment Variables](/docs/getting-started/environment-variables).
5. **Tests** — add `parseUrl` cases to the provider tests on both sides.
6. **Docs** — add the provider to [Provider System](/docs/backend/providers) and
   the extractor to [Extractor System](/docs/backend/extractors).

See [Architecture → Providers vs Extractors](/docs/architecture) for why the two
layers are separate, and the [Glossary](/docs/glossary) for the vocabulary.

## Updating these docs

This documentation site (`docs-site/`) is itself part of the repo. When you change
behavior, update the matching page under `docs-site/content/docs/`. Ported source
material lives in the repo's top-level `docs/` directory. Run the docs site with
`fnm use 22 && npm run dev` from `docs-site/`.

### Automated doc sync (post-commit hook)

The repo ships a tracked git hook at `.githooks/post-commit` that keeps docs in
sync with code automatically. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

After any commit that touches `backend/src/`, `frontend/src/`, or a package
manifest, the hook launches **Claude Code in headless mode** in the background to
update the relevant pages under `docs-site/content/docs/`. It is restricted to
file-editing tools (no shell access) and scoped to the docs directory; the result
is left in your working tree for review — **nothing is committed automatically**.

| Env var | Effect |
| --- | --- |
| `DOCS_HOOK_DISABLED=1` | Skip the hook entirely for a commit |
| `DOCS_HOOK_AUTOCOMMIT=1` | Auto-commit the generated doc updates (recursion-guarded) |
| `DOCS_HOOK_MODEL=<id>` | Override the model passed to `claude` |

Watch progress with `tail -f .git/docs-hook.log`. Requires the `claude` CLI on
your `PATH`; if it's absent the hook no-ops.
