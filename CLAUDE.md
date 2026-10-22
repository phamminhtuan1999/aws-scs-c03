# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An offline, backend-free practice trainer for a 143-question AWS SCS-C03 bank, plus the independent research that decides
which answers are trustworthy. Two halves that only meet through JSON files:

- `app/` — React 18 + TypeScript + Vite SPA (zod for every data/storage contract, hash router, `localStorage` persistence).
- `data/`, `research/`, `tools/` — the data layer and research records, built/validated by standalone Python scripts.

`README.md` is a short project overview; `docs/REFERENCE.md` is the detailed user-facing spec (modes, grading bases, storage, security). `docs/APP_SPEC.md` and `PLAN.md` (Vietnamese)
hold the original requirements; `research/schema/RESEARCH_FORMAT.md` defines research record structure.

## Commands

All npm commands run from `app/` (Node 24, npm 11):

```bash
npm install
npm run dev          # predev runs sync-data first
npm run build        # prebuild sync-data, then tsc --noEmit + vite build -> app/dist
npm run serve        # static server for dist on :4173 (PORT to change); the app does not work from file://
npm test             # Vitest (jsdom), tests/**/*.test.{ts,tsx}
npm run typecheck
npm run e2e          # pree2e builds; Playwright against dist on :4180 (E2E_PORT) using installed Microsoft Edge (channel msedge)
npm run sync-data    # copy data + research into app/public/data and verify image sha256s
```

Single tests: `npx vitest run tests/grading.test.ts`, `npx vitest run -t "<test name>"`, `npx playwright test e2e/exam.spec.ts`.

Python tools run from the repo root:

```bash
python tools/validate_research.py blind|final [Q001 ...]   # structural + evidence-quote check; exit 1 on errors
python tools/build_research.py                               # merge research/reviews/*.json -> research/question_reviews.json + coverage
python tools/fetch_doc.py URL [--grep REGEX]                 # snapshot an AWS doc page into research/sources/snapshots
```

`build_data.py`, `verify_data.py`, `hash_tree.py` and `compare_r1_r2_community.py` read the frozen originals (`output/pdf/question_bank.json`,
source HTML/PDFs) from the **parent** directory of this repo, which is not checked in — they cannot run from a bare clone.

CI (`.github/workflows/pages.yml`): on push to `main`, `npm ci && npm test && npm run build`, then deploys `app/dist` to GitHub Pages.
E2E is not run in CI.

## Data flow

1. `data/original/` (frozen export + 35 images) → `tools/build_data.py` → `data/normalized/bank.json` (question content only, no keys),
   `data/interactions/hotspot.json` (ordering/matching mappings), `data/keys/source_keys.json` (immutable source keys).
   The only allowed normalization is whitespace collapsing; question text is kept verbatim, typos included.
2. Research: `research/blind/Q*.json` (made from the key-free `research/blind_set/`) → `research/reviews/Q*.json` (final) →
   `tools/build_research.py` → `research/question_reviews.json` (the app contract, carries `research_version`). Records that fail
   validation become `pending`. Revisions (r1→r2→r3) append `history` entries; blind records and source keys are never edited.
3. `app/scripts/sync-data.mjs` copies those four JSON files + images into `app/public/data/` (gitignored) and fails on any image hash
   mismatch. `app/src/data/loader.ts` re-validates everything with zod at load: a contract violation is a fatal error screen, but a
   single malformed review entry is downgraded to `pending` and surfaced on the Research coverage page.

Updating research never requires app code changes — the app handles any mix of `verified / disputed / ambiguous / outdated / unresolved / pending`.

## App architecture (`app/src`)

- `data/` — `schema.ts` (zod), `loader.ts` (`buildAppData` → `AppData`), `units.ts` (gradable units per question; 628 total), `derive.ts` (display helpers).
- `grading/engine.ts` — pure, all-or-nothing grading. Two **bases**: `research` (only `verified` + `gradable_by_research`, scored against the
  researched answer) and `source` (source keys, minus unscorable ones like Q008). `keyFor` / `eligibleIds` encode this; bases are never mixed
  and never silently fall back to each other.
- `session/` — `prng.ts` seeded draw (mulberry32), `plan.ts` exam planning (shorter exam + scaled minutes when too few eligible),
  `exam.ts` immutable exam state machine. A session snapshots the keys of its drawn questions and the `research_version` at creation, so
  later research never changes past results. Timer is derived from a stored deadline; submit is idempotent; expired-on-load exams are graded once.
- `storage/` — `store.ts` versioned, zod-validated envelopes in `localStorage` under `scs-c03-trainer:v1:` with a swappable `Backend`
  (`MemoryBackend` in tests); corrupt data is moved to `...:corrupt:<ts>`. `slots.ts` declares each slot; `exportImport.ts` validates imports.
- `time/clock.ts` — `getClock()/setClock()`; use it (not `Date.now()`) in session/UI logic so tests can inject `FakeClock`.
- `router.ts` — minimal hash router (`#/path?query`), `navigate()` / `href()`.
- `ui/` — screens; `ui/feedback/outcome.ts` computes what Study/Results show from source key vs research.

## Invariants (enforced by tests — don't break them)

- **No answer leaks**: explanations, keys, research details and answer-role images must not be mounted before *Check answer* (Study)
  or exam submission (Results), including on the review screen, dialogs and route changes (leak tests in `tests/exam-ui.test.tsx`,
  `tests/study.test.tsx`). `tests/dom-integrity.test.tsx` compares all 143 rendered questions against `data/original/question_bank.json` directly.
- Answer options are never shuffled; question text is rendered verbatim.
- No `dangerouslySetInnerHTML`; all source text renders as React text nodes. Production build injects a CSP meta tag (see `vite.config.ts`).
- Non-verified questions are never reported as "wrong" in Study; source key and research conclusion are shown separately.
- Stats aggregate only within the same basis + `research_version`.

## Testing notes

- `tests/helpers/data.ts` loads the real JSON from the repo root (not `public/data`), so `npm test` works without `sync-data`.
  `loadRealData(reviewsOverride)` swaps in alternate research.
- Behaviour that needs non-`verified` statuses uses hand-written fixtures in `tests/helpers/fixtures.ts`; every fixture string carries a
  `FIXTURE_` marker and fixtures are never shipped.
- `tests/setup.ts` installs a fresh `MemoryBackend`, resets the clock and clears notices before each test.
- E2E saves screenshots to `reports/screenshots/`; results are summarized in `reports/test_report.md`.
