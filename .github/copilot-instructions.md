# CareBridge — Copilot Instructions

These instructions are read on every Copilot request. Follow them for all code in this repo.

## What this app does

CareBridge converts a free-text patient complaint into:

1. A color-coded clinical **timeline** with deterministic **red-flag chips**, and
2. A plain-language, accessible **medication-safety briefing**.

A **clinician view** and a **patient view** share one data model (`PatientStory`); the views are just different renderers.

## Tech stack

- **Frontend:** TypeScript + React (Vite). Tailwind or CSS modules. Optional Radix UI for accessible primitives.
- **API layer:** Node/Express or serverless functions — exists to keep the GitHub PAT server-side and to cache.
- **LLM:** GitHub Models `openai/gpt-4o-mini` via the OpenAI-compatible endpoint (`https://models.github.ai/inference`). PAT lives in `process.env.GITHUB_TOKEN`, server-side only.
- **Interaction data:** DDInter (bundled CSV → normalized JSON/SQLite) + openFDA Drug Label API (`https://api.fda.gov/drug/label.json`) fetched live with caching.
- **Synthetic patients:** MITRE Synthea fixtures (static JSON).
- **Voice:** browser Web Speech API (`SpeechSynthesis` for TTS, optional `SpeechRecognition` for dictation). No Azure Speech.
- **MCP server:** local Node server exposing `check_interactions`, `lookup_drug_label`, `detect_red_flags`, `get_synthetic_patient`.

## Hard safety rules (NEVER violate)

1. **The LLM must NEVER decide red flags or drug-interaction severity.** Those are deterministic only.
   - Red flags come from a curated, clinically-referenced symptom-term → urgency map in `/src/rules`.
   - Interaction severity comes from DDInter (`major`/`moderate`/`minor`) and openFDA label text — looked up by code, not generated.
   - The LLM's only jobs: extract structure from free text, and rewrite clinical text into plain language. Language tasks only.
2. **Never output a diagnosis or treatment recommendation.** The app emits structure, summaries, follow-up _questions_, and safety _flags_ — never a diagnosis. Prompt the LLM with an explicit "do not diagnose, do not recommend treatment" instruction, and post-filter outputs for diagnosis-like language.
3. **Synthetic data only.** Ship only Synthea-derived examples. Surface a "Do not enter real patient information" notice. Run a light PII scrub on input as defense-in-depth even though data is synthetic.
4. **Validate every LLM response with Zod.** The model returns strict JSON (`response_format: { type: "json_object" }`). Parse with a Zod schema. On validation failure: one repair retry, then fall back to a deterministic regex skeleton parse so the UI never hard-fails.
5. **Never commit secrets.** The PAT and any keys live in `.env` (gitignored). Use `.env.example` for shape. PAT is server-side only — never reaches the browser.

## Provenance (required on every output field)

- Every AI-produced field carries `provenance: "ai-generated"`.
- Every safety field (`RedFlag`, `Interaction`) carries `provenance: "deterministic-rule"` plus a `ruleId`.
- The UI must visually label AI-generated content and show the `ruleId`/source for safety fields.

## Coding guidelines

- **Strict TypeScript.** Validate all external data (LLM output, openFDA responses, DDInter rows) at the boundary with Zod before use.
- **Accessibility-first in the patient view:** semantic HTML, correct heading hierarchy, ARIA (`aria-live="polite"` for status, `role="alert"` for major interaction warnings), full keyboard navigation, visible focus, WCAG AA+ contrast (target ≥7:1 in patient view), no information conveyed by color alone (pair color with icon + text), respect `prefers-reduced-motion`.
- **TTS:** split utterances to < 200 chars (Chrome truncates longer ones); provide pause/resume; prefer a local voice.
- **Caching:** cache every LLM response keyed by a hash of (input + prompt version). Cache openFDA responses by drug name for 24h. Add exponential backoff on HTTP 429 for both GitHub Models and openFDA.
- **Graceful failure:** on LLM/openFDA failure or 429, fall back to cache or the deterministic skeleton parse. Never show a stack trace. Show "AI explanation unavailable, showing structured data only."

## Project structure

```
/src/client    React views (clinician + patient renderers)
/src/server     API layer + MCP server (PAT lives here)
/src/rules      red-flag engine + interaction engine (deterministic)
/data           DDInter (CSV→JSON), Synthea fixtures
```

## Data model (shared)

- `PatientNarrative` { id, rawText, source: paste|dictation|sample, createdAt }
- `TimelineEvent` { id, type, label, timeRef, severityHint, sourceSpan }
- `Symptom` { term, normalizedTerm, bodySystem, onset, isRedFlag }
- `Medication` { name, normalizedName, rxnormHint?, atcCode?, dose?, frequency?, sourceSpan }
- `Interaction` { drugA, drugB, severity: major|moderate|minor, mechanism, management, source, ruleId, provenance }
- `RedFlag` { id, triggeringTerms[], rule, message, urgency, provenance }
- `Summary` { clinicianSummary, suggestedFollowUps[], patientPlainSummary }
- `ReminderItem` { medication, timeOfDay, instructions, voiceText }
