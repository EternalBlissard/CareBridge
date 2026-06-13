# CareBridge

Converts free-text patient narratives into a structured timeline and medication list.  
**Frontend:** Vite + React (port 5173) · **Backend:** Express API (port 3001)

## Prerequisites

- Node.js 18+
- GitHub PAT with `models:read` (for LLM calls — server-side only)

```bash
cp .env.example .env
# Add your token: GITHUB_TOKEN=github_pat_...
```

## Install

```bash
npm install
```

## Start both (recommended)

Runs the React dev server and Express API together:

```bash
npm run dev
```

| Service  | URL                          |
|----------|------------------------------|
| Frontend | http://localhost:5173        |
| API      | http://localhost:3001/api    |

The Vite dev server proxies `/api/*` to Express, so the browser only needs port 5173.

## Start separately

**API only** (Express on :3001):

```bash
npm run dev:server
```

**Frontend only** (Vite on :5173 — needs API running for `/api` routes):

```bash
npm run dev:client
```

## Verify setup

Health check (API must be running):

```bash
curl http://localhost:3001/api/health
# → {"ok":true,"service":"carebridge-api"}
```

GitHub Models token (Phase 0 gate):

```bash
npm run test:token
```

## Build

```bash
npm run build    # client → dist/client/
npm run preview  # preview production build
```
