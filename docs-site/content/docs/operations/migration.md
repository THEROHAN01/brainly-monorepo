---
title: Monorepo Migration
description: How two separate repositories were merged into this monorepo while preserving full git history.
---

This monorepo was created by merging two separate repositories using a **git
subtree merge** (`git read-tree --prefix`), preserving complete git history.

- **Migration date:** February 5, 2026.
- **Frontend** (`brainly-frontend/` → `frontend/`): 22 commits, React 19 + Vite + Tailwind 4.
- **Backend** (`Brainly/` → `backend/`): 34 commits, Express + TypeScript + MongoDB.

## Why git subtree merge?

The `git read-tree --prefix` approach:

- Preserves all commits with original timestamps and authors.
- Creates clear merge commits showing when repos were combined.
- No commit rewriting (safer than `git filter-repo`).
- Keeps full file history traceable via `git log --follow`.

## Steps executed

```bash
# 1. Safety backups
mkdir -p /home/rohan/playground/brainly-backup
cp -r brainly-frontend brainly-backup/
cp -r Brainly brainly-backup/

# 2. Initialize monorepo
mkdir brainly-monorepo && cd brainly-monorepo
git init && git branch -m main

# 3. Merge frontend
git remote add frontend-origin ../brainly-frontend
git fetch frontend-origin
git merge -s ours --no-commit --allow-unrelated-histories frontend-origin/main
git read-tree --prefix=frontend/ -u frontend-origin/main
git commit -m "chore: merge brainly-frontend repository into frontend/"

# 4. Merge backend
git remote add backend-origin ../Brainly
git fetch backend-origin
git merge -s ours --no-commit --allow-unrelated-histories backend-origin/main
git read-tree --prefix=backend/ -u backend-origin/main
git commit -m "chore: merge Brainly backend repository into backend/"
```

## Verifying history

```bash
# Count preserved commits
git log --oneline -- frontend/ | wc -l   # ~22
git log --oneline -- backend/  | wc -l   # ~34

# Trace individual file history
git log --follow -- frontend/package.json

# View merge points
git log --oneline --graph --all
git log --merges --oneline
```

## Commit statistics

- Initial monorepo setup: 1 commit.
- Frontend merge: 1 commit (+22 historical).
- Backend merge: 1 commit (+34 historical).
- **Total accessible commits: ~59.** Historical commits preserved: 56.

## Future considerations

- Root-level scripts for common operations (e.g. `npm run dev:all`).
- A workspace tool (npm workspaces or Turborepo) if cross-package coordination grows.
- Root-level GitHub Actions for CI/CD across both packages — now in place via
  `.github/workflows/ci.yml`.
