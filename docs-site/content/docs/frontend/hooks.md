---
title: Hooks
description: The data-fetching custom hooks — useContents, useUser, and useTags.
---

## useContents (`hooks/useContents.tsx`)

Fetches `GET /api/v1/content` on mount.

```ts
{
  contents: Content[],
  loading: boolean,
  error: string | null,
  refetch: () => void
}
```

`Content` type: `{ _id, title, link, type, contentId, tags: { _id, name }[], userId, createdAt }`.

## useUser (`hooks/useUser.ts`)

Fetches `GET /api/v1/me` on mount.

```ts
{
  user: User | null,
  loading: boolean,
  logout: () => void,    // clears the token and resets user state
  refetch: () => void
}
```

> `logout()` clears the stored token and nulls the user; the redirect to
> `/signin` is performed by the consumer (e.g. `UserAvatar`).

## useTags (`hooks/useTags.tsx`)

Fetches `GET /api/v1/tags` on mount.

```ts
{
  tags: Tag[],
  loading: boolean,
  error: string | null,
  createTag: (name: string) => Promise<Tag | null>,
  deleteTag: (tagId: string) => Promise<void>,
  refetch: () => void
}
```

`createTag` and `deleteTag` both call the respective API endpoints and then call
`refetch()`. `createTag` resolves to `null` when the tag already exists.
