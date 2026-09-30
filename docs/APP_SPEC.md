# SCS-C03 Trainer — Web app specification (for implementation)

Source of truth for requirements: `../../output/PROMPT_AGENT_WEB_AWS.md` (sections 3, 5–10) and `../PLAN.md`.
This file turns them into a concrete build contract. Where this file is silent, follow the prompt.

## 0. Stack & layout
- `scs-c03-trainer/app/`: Vite + React 18 + TypeScript (strict). Runtime deps kept minimal: `react`, `react-dom`, `zod`. Dev: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test` (use installed Microsoft Edge: `channel: "msedge"` — do NOT run `playwright install`).
- Hash router (hand-written, no router lib needed). `base: "./"` in Vite so `dist/` works from any static path.
- `npm run sync-data` (Node script `app/scripts/sync-data.mjs`): copies into `app/public/data/`:
  `../data/normalized/bank.json`, `../data/interactions/hotspot.json`, `../data/keys/source_keys.json`,
  `../research/question_reviews.json`, and `../data/original/images/*` → `public/data/images/`. Verifies every image sha256 against bank.json; writes `public/data/manifest.json` {files: {path: sha256}, research_version, generated_at}. Fails loudly on mismatch. `predev`/`prebuild` run it.
- `npm run serve` → tiny zero-dependency Node static server (`app/scripts/serve.mjs`) serving `dist/` on http://localhost:4173 (configurable `PORT`). The app is NOT expected to work from `file://`.
- Never use `dangerouslySetInnerHTML`. All source text rendered as React text nodes. Add CSP meta: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'`.
- Everything works offline after build (external links to AWS docs excepted). No LLM calls, no network calls except loading `./data/*`.

## 1. Data contracts (read-only in the app; validate with zod at load, show a fatal error screen if invalid)

### bank.json
`{ exam, questions: Question[], images: {[file]: {question_id, role: "stem"|"choice"|"answer", sha256}} }`
`Question = { id:"Q001", number, type:"multiple_choice"|"multiple_response"|"ordering"|"matching", topic, source_file, source_question_id, choose: number|null, stem: Block[], choices: {id:"Q001:A", letter, blocks: Block[]}[], content_hash }`
`Block = {id, type:"text", text} | {id, type:"image", file:"images/Q001_image_01.jpg", label, width, height, sha256, role}`
- Render blocks in order. Text verbatim (already whitespace-normalized; CSS `white-space: pre-wrap` not needed). Keep every character (typos, `•`, quotes).
- Answer images (role "answer") are NOT in any question/choice block; they're referenced only from source_keys (`answer_image`).

### hotspot.json (7 questions: Q002, Q005, Q073 ordering; Q008, Q079, Q081, Q082 matching)
`questions[Qid] = { kind:"ordering", slots:3, steps:[{id:"Q002:S1", text, source_block, bullet_stripped}], reuse:false, rule_source_text, stem_image, source_notes[], ui_labels_note }`
`| { kind:"matching", prompts:[{id:"Q079:P1", text, source}], responses:[{id:"Q079:R1", text, ...}], reuse:false, rule_source_text, reuse_note?, stem_image, source_notes[] }`
- The full stem (including the listed options and the dropdown-layout image) is rendered verbatim above the control; the control is an added UI layer. Show a small note "Step/row labels are added by this practice tool" and keep a "View original image" button (zoom dialog) on the stem image.

### source_keys.json
`keys[Qid] = { type, choice_ids?: string[] (sorted), sequence?: string[], pairs?: {[promptId]: responseId}, gradable: boolean, ungradable_reason?, answer_image?: "images/Q002_image_02.png", derivation }`
- Q008 has `gradable:false` (never scored in either basis; still viewable in study with the note).

### question_reviews.json (regenerated as research progresses; may be all `pending` initially)
`{ research_version, generated_at, questions: {[Qid]: Review} }`
`Review = { status:"verified"|"disputed"|"ambiguous"|"outdated"|"unresolved"|"pending", researched_answer, source_answer, comparison, differs_from_source, confidence:{level,reason_vi,open_issues}|null, option_reviews:[{unit_id, unit_type, verdict, reason_vi, reference_ids, evidence_kind, ...}], references:[{id,url,title,section,accessed_at,page_last_updated,quote,supports,kind}], explanation_vi:{why_correct, others:{[unitId]:string}}|null, keywords:[{phrase,meaning_vi}], memory_tip_vi, tags:{domains[],services[],reason_vi}|null, source_issues:[{type,location,detail_vi}], requirements, image_transcriptions, researched_at, last_reviewed_at, independent_verdict, reconciliation_vi, history, research_version, source_key_gradable, source_key_ungradable_reason, gradable_by_research }`
Answer value shapes: choice types → sorted array of choice IDs; ordering → array of step IDs in order; matching → {promptId: responseId}.
Build the fixtures for tests from these shapes; never fabricate research content for the UI — if a question is pending, the UI says so.

## 2. Grading engine (`src/grading/`, pure, fully unit-tested)
- `Response`: MC → `string|null` choice ID; MR → `string[]`; ordering → `string[]` (slot order, may contain gaps as null); matching → `{[promptId]: responseId|null}`.
- `gradeQuestion(type, response, key) → "correct"|"incorrect"|"unanswered_incorrect"|"ungradable"`; all-or-nothing: exact set for MR (order-insensitive), exact sequence for ordering (all slots), all pairs for matching. Empty response on a gradable question = incorrect (`unanswered_incorrect` for reporting). No partial credit.
- `keyFor(basis, qid, snapshot)`: basis `"research"` → researched_answer iff `gradable_by_research`; basis `"source"` → source key iff `gradable`. Otherwise ungradable.
- IDs are stable, so shuffling question order can never shift a mapping. Choices are never shuffled.

## 3. Modes (English UI chrome; Vietnamese explanations)

Home screen: short identity line "Independent practice tool — not affiliated with, endorsed by, or a copy of AWS or Pearson VUE." + 4 entry cards (plain, not decorative) + links to Question bank, Research coverage, History & stats, Saved tips, Settings, Export/Import.

### 3.1 Practice in order — Q001 → Q143 (requested by user)
- Walks all 143 questions in original order; remembers position; "Resume at Qxxx" and "Jump to Q…".
- Same answering/check flow as Study (3.2). Progress bar "n / 143 checked".
- Per-question result stored (by basis + research_version) for "wrong" / "not attempted" filters.

### 3.2 Study (custom set)
- Pick set: all / ID list or range / domain / service (from research tags; untagged questions listed as "Not yet classified") / wrong last time / flagged-bookmarked / not attempted. Order: original or shuffled (seeded). Option order always original.
- Before **Check answer**: no correctness, no colours, no explanation/keywords/tip/research — those components are not mounted.
- After Check: header line `Answer: … | You chose: …` (letters / step order / pairs rendered with text), grading basis shown ("By research" if verified, otherwise "No settled conclusion" + source key labelled "Source key — not technically verified").
  - `status == verified`: ✓/✗ against researched answer; if `differs_from_source`, also show "Source key: X (differs — see research)".
  - other statuses: never say "wrong" absolutely; show source key and research conclusion separately with status label and Vietnamese reason.
  - `pending`: "Research pending — showing source key only (not verified)".
  - Explanation panel (Vietnamese): Vì sao đúng / Các lựa chọn còn lại (one line each) / Keyword (≤3) / Mẹo nhớ / Nguồn AWS (links). Collapsible "Research details": per-unit verdicts, evidence quotes, dates, confidence, source issues, independent verdict vs final, history.
  - Answer images (green-bordered) shown only here (after check), labelled "Source answer image".
- Buttons: Next, Bookmark, Save tip (stores tip text + Qid), Flag.

### 3.3 Exam simulation — 65 questions / 170 minutes (default)
- Start screen: basis selector (default **By research**), shows eligible pool size. If pool < 65: show count, offer "Take a shorter exam (n questions)" or explicitly switch to **By source key — not guaranteed technically correct**. Never mix bases. Ungradable questions are excluded from the default draw.
- Seed shown on start screen (editable, reproducible). Draw = seeded shuffle (mulberry32 or similar) of eligible IDs, take N, keep order.
- Snapshot at start (stored in session): `{basis, research_version, question_ids, keys: {qid: key|null}, ungradable_ids}`. Later research updates never alter this session's grading.
- No pause.

### 3.4 Custom exam
- Number of questions, duration, basis, optional "include not-scorable questions (shown, not scored)" — the start screen states exactly which IDs will be unscored and that they are excluded from the denominator. Optional pause toggle, labelled "Practice configuration — pause enabled". Label every custom exam "Practice configuration".

### 3.5 Exam UI (both 3.3 and 3.4)
- Header: exam name ("AWS Certified Security – Specialty (SCS-C03) · Practice"), `Question i of n`, timer (hh:mm:ss), `Flag for review` toggle, `Help`.
- Main: stem blocks verbatim; images inline with click-to-zoom (modal dialog, zoom in/out/reset, drag/scroll pan, Esc closes, focus trapped/restored). Choices as full-width clickable rows: radio (single) / checkbox (multiple; show the source "(Choose two.)" as is; don't block extra selections, just count "n selected").
- Ordering control: "Available steps" list and "Your answer" list with exactly `slots` positions; buttons Add ▸, ◂ Remove, ▲ Move up, ▼ Move down, all keyboard operable (Tab/Enter/Space; optional drag as extra). Respect `reuse:false`.
- Matching control: one row per prompt, a `<select>` of responses ("Select…" default); when `reuse:false` a response chosen in another row is disabled in the others (show why).
- Footer (fixed, never covers content — add bottom padding): Previous · Next · Review · End exam. Next/Previous never force an answer; changing question never grades.
- Review screen: grid of all questions (answered / unanswered / flagged, filter buttons), click jumps to question; "Return to question" and "End exam".
- End exam: confirm dialog with counts of unanswered and flagged; "Return to exam" / "End exam". Timeout auto-submits exactly once.
- While an exam is in progress: no navigation to bank/study/coverage/research/answers; direct URL shows "Exam in progress" with a button back. No source IDs/topic/source notes/research status visible in the exam UI (show only "Question i of n").
- Timer: `deadline = startedAt + duration` stored; remaining = `deadline − clock.now()`; recompute on interval + `visibilitychange`; refresh/close/reopen never resets. Session persisted on every change (answers, current index, flags, status, deadline). On load, an expired in-progress session is graded once and locked.
- Submission is idempotent (status transition `in_progress → submitted` once; second submit or a second tab is a no-op; listen to `storage` events).
- Clock abstraction `src/time/clock.ts` so tests can inject a fake clock; Playwright tests may use `page.clock`.

### 3.6 Results & review
- Raw `correct / scored` and %, time used, basis + research_version, counts of incorrect / unanswered / flagged / ungradable (listed separately, excluded from denominator). Explicitly: "Raw practice score — not an AWS scaled score; does not predict a pass."
- Per-question review: your answer vs key, correct/incorrect, then the same explanation panel as Study, source/research differences, answer images.

## 4. Question bank, research coverage, history
- Bank (disabled during an exam): search by `Qxxx` or text, filters (type, domain/service, research status, wrong / not attempted / bookmarked). Opening a question goes to a study view (check-answer gating still applies).
- Research coverage page: totals by status, `gradable_by_research` count, `differs_from_source` count, units reviewed / 628, table of 143 questions (status, confidence, differs, units reviewed); pending never shown as verified. Question research detail page: per-unit reviews, references (title + link + quote + accessed date + page_last_updated if any + direct/inference), independent verdict vs final, source issues, history.
- History & stats: list of finished exams (date, basis, research_version, score, duration); aggregated stats only within the same basis+research_version; frequently-missed questions; saved tips page.
- Export/Import: JSON `{format:"scs-c03-trainer-progress", version:1, exported_at, app_version, data:{sessions, practice, study, bookmarks, tips, settings}}`. Import validates with zod (reject wrong format/version, unknown question IDs, oversized >5 MB, strings >10 k chars), never touches bank/keys/research, treats all strings as text. Show a clear error on failure; keep existing data unless the user confirms replace/merge.
- Settings: font size (4 steps), high-contrast toggle; persisted.

## 5. Accessibility & layout
- Light background, exam-like calm layout, not a dashboard. Desktop-first; responsive down to 360 px for review.
- Visible focus ring, WCAG AA contrast, labels on all controls, `aria-live` for timer warnings (e.g. 15/5 min left), dialogs with proper roles.
- Long text wraps (no clipping); images max-width 100% with zoom.

## 6. Storage
- `localStorage` keys prefixed `scs-c03-trainer:v1:`; one schema (zod) per key with `version`; migration function; corrupt/unknown data → quarantine to `...:corrupt:<ts>` and continue with defaults (show a notice).

## 7. Tests (must pass before hand-off; write results to `../reports/test_report.md`)
- Unit (Vitest): grading (MC/MR set, ordering sequence, matching pairs, empty, changed answer, negative cases e.g. extra choice, wrong order, one wrong pair, reversed letters), keyFor/basis/ungradable, seeded draw reproducibility, session state machine (submit once, timeout, restore, expired-on-load), snapshot immutability when research changes, storage migration/corruption, import validation (bad version, script/HTML strings stay text, unknown IDs).
- DOM integrity (Vitest + jsdom): render every one of the 143 questions' stem+choices with `data-block-id`; compare text to `../data/original/question_bank.json` read directly (NOT through the app loader), whitespace-collapse only; check image `src` file + that no `role:"answer"` image appears before grading. Report 143/143.
- Leak tests: before check/submit the DOM contains no explanation/keyword/tip/answer text or answer images, including via Review screen, dialogs and route changes.
- E2E (Playwright, Edge): exam from start → answer MC, MR, an image-policy question (Q004/Q007/Q088), ordering, matching → flag/unflag → review jump → End exam dialog → results → per-question review; refresh mid-exam restores answers/timer; timeout auto-submits once (short custom duration or page.clock); study flow gating; practice-in-order resume; bank search; coverage page; export → import round trip; mobile viewport review. No console errors; no broken images. Save screenshots of main screens (desktop + mobile) to `../reports/screenshots/`.
