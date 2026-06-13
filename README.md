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

## Responsible AI & safety

CareBridge is a **demo triage assistant**, not a clinical product.

- **Not a diagnostic tool. Not medical advice.** Output is for understanding and
  demo purposes only.
- **Synthetic data only** — never enter real patient information. The UI shows a
  persistent safety banner and blocks nothing, but the app is designed for bundled
  Synthea-style samples.
- **Provenance labels** — every field is tagged in the UI:
  - `AI-generated` — timeline, meds, symptoms, and plain-language patient cards
    from the LLM.
  - `Deterministic rule` + `ruleId` — red-flag urgency, DDInter interaction
    severity, follow-up questions, and safety cards. The LLM never sets these.
- **Graceful degradation** — on LLM failure, HTTP 429, or openFDA rate limits the
  app falls back to cache, skeleton/template parse, or rule-only data. Users see a
  plain-language warning banner; **stack traces are never shown** in the UI.
- **Caching** — see [LLM response cache](#llm-response-cache). Pre-warm demo
  narratives before judging live.

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
- **openFDA** drug label text (CC0): live lookup with 24h cache; stale cache used
  on HTTP 429. Attribution: "Data provided by the U.S. Food and Drug Administration."

## LLM response cache

Validated LLM parses are cached in `.cache/llm-parse/` keyed by
SHA-256 of prompt version + model + input text. Re-parsing the same
narrative hits the cache and uses zero GitHub Models quota — pre-warm
demo narratives by parsing them once.
