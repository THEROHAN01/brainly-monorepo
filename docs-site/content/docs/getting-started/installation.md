---
title: Installation
description: Get the backend and frontend running locally, with MongoDB via Docker.
---

## 1. Start MongoDB

The repo ships a `docker-compose.yml` that runs a local MongoDB on the default port:

```bash
# from the repo root
docker compose up -d      # start MongoDB in the background
docker compose down       # stop it (add -v to also wipe the database volume)
```

This exposes MongoDB at `mongodb://localhost:27017` with a persistent
`brainly-mongo-data` volume. If you prefer MongoDB Atlas, skip this and use your
Atlas connection string in `MONGO_URI` instead.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Update `.env` with your credentials (see [Environment Variables](/docs/getting-started/environment-variables)):

```bash
MONGO_URI=mongodb://localhost:27017/brainly
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_super_secure_jwt_secret_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
PORT=5000
```

Build and start the server:

```bash
npm run build
npm run start
```

The backend runs at `http://localhost:5000`.

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

Update `.env` with your backend URL and Google Client ID:

```bash
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

Start the dev server:

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.

## 4. Verify

1. Open `http://localhost:5173` — the landing page should load.
2. Sign up with a username/password.
3. Paste a YouTube URL to save your first piece of content.
4. Within ~30 seconds the background enrichment service fetches its metadata.
