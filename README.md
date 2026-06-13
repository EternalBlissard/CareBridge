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

## Data sources & attribution

**Synthetic data only — never enter real patient information.**

- **Sample patient** (`data/synthea/`): hand-authored synthetic narrative
  modeled on [MITRE Synthea](https://synthetichealth.github.io/synthea/)
  output. Not a real Synthea export and not real patient data.
- **Drug-interaction severity** (`data/ddinter/`): hand-curated demo subset
  informed by [DDInter 2.0](https://pubmed.ncbi.nlm.nih.gov/39180399/)
  (ATC B01AC + M01AE). Not the DDInter download — swap in the real export
  once its license is confirmed.
- Red-flag urgency and interaction severity come from deterministic rules
  and bundled lookups, never the LLM.

## LLM response cache

Validated LLM parses are cached in `.cache/llm-parse/` keyed by
SHA-256 of prompt version + model + input text. Re-parsing the same
narrative hits the cache and uses zero GitHub Models quota — pre-warm
demo narratives by parsing them once.
