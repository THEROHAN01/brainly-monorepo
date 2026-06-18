---
title: Overview
description: The React 19 + Vite SPA — entry point, router, config, and route table.
---

The frontend is a React 19 + Vite + TypeScript single-page app styled with
Tailwind CSS v4.

## Entry point (`src/main.tsx`)

React root entry. Wraps the app in
`<GoogleOAuthProvider clientId={config.GOOGLE_CLIENT_ID}>` from
`@react-oauth/google`, then calls `ReactDOM.createRoot(...).render(...)`.

## Router (`src/App.tsx`)

React Router v7 route tree:

```text
/                  → <Landing />
/signup            → <Signup />
/signin            → <Signin />
/dashboard         → <ProtectedRoute><Dashboard /></ProtectedRoute>
/share/:shareLink  → <SharedBrain />
*                  → <Navigate to="/" />
```

Also renders `<Toaster position="top-right" richColors />` (sonner) globally.

## Config (`src/config.ts`)

```ts
export const config = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
};
```

## Routes

| Path | Component | Auth | Description |
| --- | --- | --- | --- |
| `/` | `Landing` | Public | Marketing page |
| `/signup` | `Signup` | Public | Create account |
| `/signin` | `Signin` | Public | Log in |
| `/dashboard` | `Dashboard` | Protected | Main app |
| `/share/:shareLink` | `SharedBrain` | Public | Read-only shared brain |
| `*` | — | — | Redirects to `/` |
