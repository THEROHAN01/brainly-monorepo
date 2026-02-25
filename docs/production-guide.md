# Brainly — Production Guide

> What it takes to run this system in production. Current gaps, fixes, and the path to scaling.

---

## Current Production Readiness: MVP / Small Beta

The system is well-built for a personal project or closed beta (up to ~100 concurrent users). The data model, schema, and API design are sound and don't need structural changes to scale. What's missing is **operational infrastructure** — observability, job queuing, secrets management, and deployment automation.

---

## Short-Term Fixes (Before Any Real Users)

### 1. Add a Health Check Endpoint

**Why it matters:** Load balancers, uptime monitors, and Kubernetes readiness probes all need a `/health` endpoint. Without it, you can't tell if the server is alive without SSHing in.

**Fix:**

```typescript
// Add to src/index.ts before the route groups
app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');  // verify DB connectivity
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    } catch {
        res.status(503).json({ status: 'error', message: 'Database unavailable' });
    }
});
```

---

### 2. Add Body Size Limit

**Why it matters:** Without a size limit, a malicious client can send a 100MB JSON body and exhaust server memory.

**Fix:**
```typescript
// Change in src/index.ts
app.use(express.json({ limit: '1mb' }));
```

---

### 3. Add Restart Policies to Docker Compose

**Why it matters:** The vectorizer worker can crash silently. Without a restart policy, embeddings stop being generated indefinitely.

**Fix:** Add to `docker-compose.yml`:
```yaml
services:
  db:
    restart: unless-stopped
    # ... existing config

  vectorizer-worker:
    restart: unless-stopped
    # ... existing config
```

---

### 4. Add Error Tracking (Sentry)

**Why it matters:** Currently, when a 500 error happens, you only know about it if you're watching logs. In production you need alerts.

**Fix:**
```bash
npm install @sentry/node
```

```typescript
// In src/index.ts, before all routes
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());

// After all routes
app.use(Sentry.Handlers.errorHandler());
```

---

### 5. Use Environment-Specific Configuration

**Why it matters:** Dev, staging, and production need different values for `LOG_LEVEL`, `DB_POOL_MAX`, rate limits, etc. A single `.env` file doesn't model this.

**Fix:** Use a secrets manager (recommended: **Doppler** for simplicity, **AWS Secrets Manager** for AWS deployments). Set environment-specific variables through CI/CD, not committed files.

Minimum: never commit `.env` with real secrets. The `.env.example` in the repo is the template; actual values live in your deployment platform.

---

## Medium-Term Improvements (Scaling to Thousands of Users)

### Replace Polling with a Job Queue

**Current problem:** The enrichment service uses `setInterval(30s)` to poll for pending content. This means:

1. Up to 30-second delay between saving content and enrichment starting
2. If you run 2 Node.js instances, you get 2 polling loops hitting the DB simultaneously
3. No job prioritization, no visibility into queue depth

**Solution: BullMQ + Redis**

```
User saves content → POST /api/v1/content
    │
    ▼
INSERT into contents (status='pending')
    │
    ▼
await enrichmentQueue.add('enrich', { contentId }, { priority: 1 })
    ↑ Redis job, processed immediately, not after 30s

Separate worker process:
    enrichmentQueue.process(async (job) => {
        await processContent(job.data.contentId)
    })
```

Benefits:
- Near-instant enrichment (no polling delay)
- Horizontal scaling: N worker processes pull from the same Redis queue
- Job progress, retries, and dead-letter queues built in
- Queue dashboard (Bull Board) for visibility

This migration doesn't require schema changes — `enrichmentStatus` columns stay as the source of truth. BullMQ becomes the triggering mechanism.

---

### Separate Enrichment Workers from HTTP Server

**Current problem:** Enrichment runs inside the HTTP server process. A crash or memory leak in enrichment affects request handling.

**Solution:**

```
┌─────────────────────────┐    ┌─────────────────────────────┐
│  HTTP Server Process     │    │  Worker Process(es)          │
│  Express routes only     │    │  Enrichment only             │
│  No background timers    │    │  No HTTP listening           │
│  Stateless — scale freely│    │  Scale independently         │
└─────────────────────────┘    └─────────────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                    Redis + BullMQ
```

In a containerized environment (Docker / Kubernetes), this means two separate container images with different entrypoints but sharing the same codebase.

---

### Add Observability

**Three pillars:** Logs (already have Pino), Metrics, Traces.

**Metrics** (Prometheus + Grafana):

```typescript
import { register, Counter, Histogram } from 'prom-client';

const httpRequests = new Counter({
    name: 'http_requests_total',
    labelNames: ['method', 'route', 'status_code']
});

const dbPoolSize = new Gauge({
    name: 'db_pool_connections',
    collect() { this.set(pool.totalCount); }
});

app.get('/metrics', (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
});
```

**Tracing** (OpenTelemetry):

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
const sdk = new NodeSDK({ traceExporter: new OtlpExporter() });
sdk.start();
```

Tracing lets you see the full path of a slow request: which DB query took 200ms, which extractor timed out, etc.

---

### Database Backups

**Current state:** Data lives in a Docker named volume. `docker compose down -v` destroys everything permanently.

**Minimum viable backup strategy:**

```bash
# Daily backup script (cron)
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
pg_dump $DATABASE_URL | gzip > /backups/brainly-$DATE.sql.gz

# Upload to S3
aws s3 cp /backups/brainly-$DATE.sql.gz s3://your-bucket/brainly-backups/

# Keep last 30 days locally
find /backups -name "*.sql.gz" -mtime +30 -delete
```

**Production-grade:** Use managed PostgreSQL (Supabase, Railway, Neon, AWS RDS) — all provide automated daily backups and point-in-time recovery out of the box.

---

### Move to Managed PostgreSQL

**Why:** Running `timescaledb-ha` in Docker is fine for development but adds operational burden in production:

- You manage upgrades, disk space, backups, failover
- `timescaledb-ha` is a heavy image (includes many tools)

**Options:**

| Provider | pgai support | Notes |
|----------|-------------|-------|
| **Timescale Cloud** | ✅ Native | pgai + pgvector + TimescaleDB pre-installed |
| **Supabase** | ⚠️ Partial | pgvector yes, pgai extension needs verification |
| **Neon** | ⚠️ Partial | pgvector yes, pgai extension needs verification |
| **AWS RDS** | ❌ No pgai | Would need to handle embeddings differently |

**Recommended:** Timescale Cloud — designed for this exact stack. pgai vectorizer worker connects to their managed DB.

---

## Secrets Management

Never store real secrets in `.env` files on servers.

**Recommended approaches:**

| Approach | Complexity | Best For |
|----------|-----------|---------|
| **Doppler** | Low | Simple, works with any deployment |
| **AWS Secrets Manager** | Medium | AWS deployments |
| **HashiCorp Vault** | High | Self-hosted, maximum control |
| **Vercel / Railway env vars** | Low | PaaS deployments |

Minimum: inject secrets via environment at container start time. The container image itself contains no secrets.

---

## Deployment Options

### Option A: Single VPS (DigitalOcean / Hetzner) — Simplest

```
VPS (4 CPU, 8GB RAM)
├── Docker Compose
│   ├── nginx (TLS termination, reverse proxy)
│   ├── brainly-api (Node.js HTTP server)
│   ├── brainly-worker (enrichment worker)
│   ├── timescaledb-ha or connect to Timescale Cloud
│   └── pgai-vectorizer-worker
└── Automated backup cron
```

Cost: ~$40-60/month. Handles hundreds of concurrent users comfortably.

---

### Option B: PaaS (Railway / Render) — Least Ops

- Deploy HTTP server as a web service
- Deploy worker as a background worker service
- Use Railway's managed PostgreSQL (or Timescale Cloud for pgai)
- No server management

Cost: ~$20-50/month depending on usage.

---

### Option C: Kubernetes — Most Scalable

```yaml
# HTTP server — horizontally scalable, stateless
apiVersion: apps/v1
kind: Deployment
metadata: { name: brainly-api }
spec:
  replicas: 3  # scale freely
  containers:
    - image: brainly-api:latest
      env: [DATABASE_URL, JWT_SECRET, ...]

# Enrichment worker — scale independently
apiVersion: apps/v1
kind: Deployment
metadata: { name: brainly-worker }
spec:
  replicas: 2  # each pulls from BullMQ queue
```

Only makes sense if you need automatic scaling or high availability guarantees.

---

## Horizontal Scaling Prerequisites

Before running multiple HTTP server instances, verify:

| Requirement | Status | Notes |
|-------------|--------|-------|
| HTTP server is stateless | ✅ | No in-memory session state, JWT is stateless |
| All state in PostgreSQL | ✅ | No in-process caches |
| Enrichment uses atomic DB claims | ✅ | Safe with multiple instances polling |
| Enrichment moved to BullMQ | 🔲 | Needed before scaling workers |
| Session/JWT not stored server-side | ✅ | JWT is self-contained |

The HTTP server can be scaled horizontally today behind a load balancer with no code changes.

Enrichment workers need the BullMQ migration before horizontal scaling is efficient.

---

## Performance Baselines

### Current (single instance, no load testing done)

Estimated based on architecture:

| Operation | Expected Latency | Notes |
|-----------|-----------------|-------|
| `POST /signup` | ~100ms | bcrypt hash (cost 10) dominates |
| `POST /signin` | ~100ms | bcrypt compare dominates |
| `GET /content` | ~10ms | Simple indexed select |
| `POST /content` | ~15ms | Insert + optional tag join |
| `GET /brain/:hash` | ~20ms | Two selects with joins |
| Semantic search (Phase 1) | ~200-500ms | Depends on embedding API latency |
| Enrichment per item | ~1-30s | Depends on extractor (YouTube transcript = slow) |

### Database

- Connection pool: max 20 connections, 5s timeout, 30s idle timeout
- Hot path indexes: `idx_contents_user_created` on `(user_id, created_at)` for `GET /content`
- Enrichment index: `idx_contents_enrichment` on `(enrichment_status, created_at)` for batch queries

---

## Security Checklist for Production

- [ ] `JWT_SECRET` is at least 32 random characters, stored in secrets manager
- [ ] `POSTGRES_PASSWORD` is strong, not the default `brainly_dev`
- [ ] `.env` files are in `.gitignore` and never committed
- [ ] HTTPS enabled (TLS via Nginx, Caddy, or load balancer)
- [ ] `CORS_ORIGIN` set to the exact production frontend domain (not `*`)
- [ ] `DB_POOL_MAX` tuned to available PostgreSQL connections
- [ ] Rate limits reviewed — current values (100/15min global) may need adjustment for production load
- [ ] Sentry (or equivalent) configured for error alerting
- [ ] Database backups verified (test a restore)
- [ ] Secrets rotated from any values ever committed to git history
- [ ] `restart: unless-stopped` on all Docker services
- [ ] Log aggregation configured (Loki, Datadog, CloudWatch, etc.)
