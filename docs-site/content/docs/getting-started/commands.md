---
title: Commands
description: The npm scripts available in each package.
---

## Backend

```bash
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled server (dist/index.js)
npm run dev        # Build and start (npm run build && npm run start)
npm test           # Run all tests (Vitest)
npm run test:watch # Run tests in watch mode
```

## Frontend

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript check + Vite production build
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm test           # Run all tests (Vitest)
npm run test:watch # Run tests in watch mode
```

## Documentation site (`docs-site/`)

```bash
npm run dev        # Start the Fumadocs dev server (http://localhost:3000)
npm run build      # Production build of the docs site
npm run start      # Serve the production build
```

> The docs site requires Node.js 22+ (Fumadocs/Next.js 16 requirement), whereas
> the app packages target Node 20. Use a version manager such as `fnm` or `nvm`
> if you switch between them.
