# SCS-C03 practice trainer

An **independent** practice tool for an AWS Certified Security - Specialty (SCS-C03) question bank of 143 questions.
It is not affiliated with, endorsed by, or a copy of AWS or Pearson VUE. It runs locally in your browser, offline after build,
with no backend, no login, no LLM calls and no network requests other than loading its own `./data/*` files.

- Question text is shown **verbatim** (source typos included) and answer options are **never shuffled**.
- Explanations (Vietnamese), keywords, tips, research details, source keys and answer images are **never mounted** before you press
  *Check answer* (study) or finish the exam (results).
- Everything the app knows about answers comes from two separate layers: the immutable **source keys** copied from the supplied HTML,
  and the **research** (`research/question_reviews.json`), which is produced independently and versioned (see Research status below).

## Research status (research_version r1, 2026-09-30)

All 143 questions and all 628 units (572 choices, 17 ordering steps, 39 matching rows/responses) have a blind record
(`research/blind/`, written without access to any key) and a final record (`research/reviews/`), checked by
`python tools/validate_research.py blind|final` (0 errors), plus an independent audit of 61 high-risk / sampled questions (`research/audit_log.md`).

| status | questions | graded "By research" |
|---|---|---|
| verified | 135 (Q056, Q107 differ from the source key) | yes |
| ambiguous | 8 — Q005, Q008, Q024, Q077, Q087, Q118, Q122, Q133 | no |
| disputed / outdated / unresolved / pending | 0 | — |

Details: `research/discrepancies.md`, `research/progress.md` (method, limitations, incidents), `research/coverage.csv`.
Verified ≠ "100 % certain": see confidence and open issues per question; no claim of being bias-free is made.

## Requirements (Windows)

Node 24 + npm 11 (Microsoft Edge is used for the browser tests; no browser download is needed).

## Install, run, build, serve (from `scs-c03-trainer\app`)

```powershell
cd scs-c03-trainer\app
npm install                 # one time
npm run dev                 # dev server (runs sync-data first)
npm run build               # sync-data + type-check + production build into app\dist
npm run serve               # static server for dist\ on http://localhost:4173  (set PORT to change)
npm test                    # unit + DOM-integrity + UI tests (Vitest, jsdom)
npm run e2e                 # builds, then Playwright end-to-end tests with Microsoft Edge (port 4180)
npm run sync-data           # re-copy data + research into public\data and verify image hashes
```

The app is **not** expected to work from `file://`: open it through `npm run serve` (or any static server pointed at `dist\`).
To pick up newer research, run `python tools/build_research.py` (repo root), then `npm run build` (or just `npm run sync-data` in dev);
no code changes are needed and the app handles any mix of `verified / disputed / ambiguous / outdated / unresolved / pending`.

`sync-data` copies `data/normalized/bank.json`, `data/interactions/hotspot.json`, `data/keys/source_keys.json`,
`research/question_reviews.json` and `data/original/images/*` into `app/public/data/`, verifies the sha256 of all 35 images against
`bank.json`, and fails loudly on any mismatch. The app validates every file again with zod at load and shows a fatal error screen if
a contract is violated (a single malformed research entry is instead treated as `pending` and listed on the Research coverage page).

## Modes

| Mode | What it does |
|---|---|
| **Practice in order (Q001 -> Q143)** | Walks all 143 questions in original order, remembers the position (Resume / Jump to Q...), progress bar "n / 143 checked". Same check flow as Study. |
| **Exam simulation (65 questions / 170 minutes)** | Timed, nothing checked until the end. Seeded draw of 65 different questions (seed shown and editable). No pause. |
| **Study (custom set)** | All / ID list or range / domain / service (from research tags; untagged = "Not yet classified") / wrong last time / flagged-bookmarked / not attempted; original or seeded-shuffled order. Buttons: Check answer, Next, Bookmark, Flag, Save tip. |
| **Custom exam** | Your own number of questions and duration, optional pause, optional "include not-scorable questions (shown, not scored)". Always labelled *Practice configuration*. |

Also: Question bank (search `Qxxx` or text, filters), Research coverage (status totals, `gradable_by_research`, `differs_from_source`,
units reviewed / 628, per-question research record), History & stats, Saved tips, Settings (text size, high contrast, colour scheme),
Export / Import of progress.

## Grading bases (important)

Every exam is graded on exactly **one** basis, chosen on the start screen and stored with the session together with the
`research_version` and a **snapshot of the keys** of exactly the drawn questions. Later research updates never change an existing exam's result.

1. **By research** (default): only questions whose research `status` is `verified` with `gradable_by_research = true` are eligible;
   the scoring key is the *researched answer* (which may differ from the source key).
   If fewer than 65 questions are eligible the app shows the count and offers *Take a shorter exam (n questions)* (duration scaled from
   170 minutes) or an explicit switch to the other basis. It never silently falls back to the source key.
2. **By source key - not guaranteed technically correct**: the whole bank except questions whose source key is unscorable.
   Source keys are copied from the supplied material and are **not technically verified**.

Bases are never mixed in one exam, and statistics are aggregated only within the same basis + research_version.
Grading is all-or-nothing (exact set for multiple response, exact sequence for ordering, all pairs for matching); an empty answer to a
scorable question is incorrect; there is no partial credit. **Q008** is unscorable in both bases (identical row text with different source
answers): it can be viewed in Study, and can be included in a custom exam as *shown, not scored*; it is always excluded from the denominator.
Questions that are `disputed`, `ambiguous`, `outdated`, `unresolved` or `pending` are never reported as "wrong" in Study: the source key and
the research conclusion are shown separately with their status, and pending questions say "Research pending - showing source key only (not verified)".

## UI simulation level

The exam screen is a **similar layout, not a copy** of the official AWS Exam Demo (Pearson VUE). What was actually observed on
2026-09-30 (see `research/exam_format.md`): title bar with exam name, time remaining and "Question i of n"; tool bar with Flag for Review
and a colour-scheme selector; bottom navigation with Help, End Exam, Review Screen, Previous, Next (Alt+N etc.). The demo's ordering and
matching screens could not be observed, so those controls follow the AWS description of a **drop-down per step / per prompt**; layout
details beyond that are this tool's own. The four question types (multiple choice, multiple response, ordering, matching) are supported.
The source bank says "(Choose two.)"; that wording is kept as is. Colour schemes: default, black on white, white on black, black on light yellow.
Keyboard shortcuts: Alt+N / Alt+P / Alt+F (flag) / Alt+R (review screen).

## Raw score limits

The result is a **raw practice score** (correct / scored, and %). It is **not** an AWS scaled score and does not predict a pass.
The real exam has 50 scored and 15 unscored questions that candidates cannot identify and uses compensatory scaled scoring; this app
scores every scorable question it shows and does not try to reproduce AWS's model. The 65-question simulation draws 65 distinct questions
from the eligible pool of the chosen basis; it is not a statement about AWS's blueprint weights.

## Progress storage

Progress lives in this browser's `localStorage` under keys prefixed `scs-c03-trainer:v1:` (versioned envelopes, zod-validated, with a
migration hook). Corrupt or unknown data is moved to `scs-c03-trainer:v1:corrupt:<timestamp>` and the app continues with defaults and a notice.
The exam timer is derived from a stored deadline, so refreshing, switching tabs or closing and reopening never resets it; an exam found
expired on load is graded once and locked. Submission is idempotent and a second tab cannot reopen or overwrite a submitted exam.
*Export / Import* writes and reads a versioned JSON file; import rejects wrong format/version, unknown question ids, files over 5 MB and
strings over 10 000 characters, cannot touch questions, keys or research, renders every string as text, and asks you to choose Merge or Replace.
The local clock is not an anti-cheating mechanism.

## Security

No `dangerouslySetInnerHTML`; all source text is rendered as React text nodes. The production build carries a CSP meta tag
(`default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`). External links (AWS docs) open with `rel="noopener noreferrer"`.

## Tests

`npm test` (Vitest): grading engine, key selection by basis, seeded draw, session state machine / timer / expiry / snapshot immutability,
storage migration and corruption, import validation, DOM integrity of all 143 questions against `data/original/question_bank.json`
(read directly, not through the app loader), leak tests (nothing about answers before check/submit, including review screen, dialogs and
route changes), and UI flows. Tests that need `verified/disputed/...` behaviour use small hand-written, clearly test-only fixtures
(`app/tests/helpers/fixtures.ts`; every string carries a `FIXTURE_` marker); no fixture is ever shipped.
`npm run e2e` drives the production build in Microsoft Edge and saves screenshots to `reports/screenshots/`. Results: `reports/test_report.md`.
(Screenshots with "FIXTURE" in the file name use the test-only research fixture.)

## Layout

`app/src/data` loaders + zod schemas, `app/src/grading` pure grading, `app/src/session` seeded draw + exam state machine,
`app/src/storage` versioned store + export/import, `app/src/time` clock abstraction, `app/src/ui` screens, `app/scripts` sync-data and static server,
`app/tests` Vitest, `app/e2e` Playwright.
