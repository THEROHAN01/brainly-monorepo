# Brainly Docs

The engineering documentation site for the Brainly monorepo, built with
[Fumadocs](https://fumadocs.dev) (Next.js 16 + Fumadocs MDX).

It is fully isolated from `frontend/` and `backend/` — its own workspace, its own
`package.json`, its own Node version.

## Requirements

- **Node.js 22+** (Fumadocs / Next.js 16 requirement). The app packages target
  Node 20, so use a version manager (`fnm`, `nvm`) when switching.

```bash
fnm use 22   # or: nvm use 22
```

## Commands

```bash
npm install        # install dependencies (runs `fumadocs-mdx` postinstall)
npm run dev        # dev server at http://localhost:3000 (redirects to /docs)
npm run build      # production build
npm run start      # serve the production build
```

## Structure

```
docs-site/
├── app/                       # Next.js App Router
│   ├── (home)/page.tsx        # redirects / → /docs
│   ├── docs/                  # docs layout + catch-all page
│   ├── api/search/route.ts    # full-text search endpoint
│   ├── layout.tsx             # root layout + RootProvider
│   ├── layout.config.tsx      # shared navbar options
│   └── global.css             # Tailwind v4 + Fumadocs theme
├── content/docs/              # ← all documentation lives here (MDX/MD)
│   ├── getting-started/
│   ├── architecture/
│   ├── backend/
│   ├── api-reference/
│   ├── frontend/
│   ├── operations/
│   ├── changelog/
│   ├── roadmap/
│   └── testing.md
├── components/mdx/mermaid.tsx  # renders ```mermaid fences as diagrams
├── lib/source.ts              # Fumadocs content source loader
├── mdx-components.tsx          # MDX component registry
└── source.config.ts           # Fumadocs MDX config (+ mermaid remark plugin)
```

## Editing content

Add or edit Markdown/MDX files under `content/docs/`. Each file needs frontmatter
with at least a `title`. Folder order and section titles are controlled by
`meta.json` files. ` ```mermaid ` code fences are rendered as diagrams
automatically.

The content here is ported from the hand-written docs in the repo's top-level
`docs/` directory, `README.md`, and `MIGRATION.md`.
