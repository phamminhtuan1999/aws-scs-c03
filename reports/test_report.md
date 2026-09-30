# Test report: SCS-C03 practice web app

Run on 2026-09-30, Windows 11, Node 24.14, Microsoft Edge 154 (Playwright `channel: "msedge"`, no browser downloaded).
Research data at the time of the run: `research_version r1`, 143 questions = 52 verified (52 gradable by research), 2 ambiguous, 89 pending.
The research agents keep regenerating `research/question_reviews.json`; the tests were written to pass for any mix of statuses
(unit/UI tests use their own data: all-pending or a clearly test-only fixture; e2e tests read the served research file to compute expectations).

## Summary

| Suite | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` (part of `npm run build`) | passes |
| Production build | `npm run build` | passes (sync-data: 4 JSON files, 35 images sha256-verified) |
| Unit + DOM integrity + UI (Vitest, jsdom) | `npm test` | **125 / 125 passed** in 7 files |
| End to end (Playwright, Edge, production build) | `npm run e2e` | **21 / 21 passed** (about 1.1 minutes) |

No failing tests and no skipped tests at the time of this report (one e2e test, "coverage detail of a verified question", skips itself only if the research file has no verified question).

## Vitest (125 tests)

| File | Tests | What it covers |
|---|---|---|
| `tests/grading.test.ts` | 26 | MC / MR exact set (reversed letters, extra choice, missing, duplicates), ordering exact sequence (wrong order, gap, extra, short), matching all pairs (one wrong pair, missing row, unknown row), empty responses (`unanswered_incorrect`), changed answer, ungradable, key type mismatch, `keyFor` per basis with real source keys (142 scorable, Q008 never scored in either basis), research basis with all pending (pool 0, source key never substituted), research answer differing from source, malformed researched answers, scoring denominator, stable IDs under reordering |
| `tests/session.test.ts` | 24 | seeded draw reproducibility / order independence / known PRNG values, snapshot (keys, basis, research_version, ungradable ids), **snapshot immutability when research changes**, deep copy, answering / clearing, flags, navigation never grades, submit grading, **submit idempotent**, locked after submit, deadline-derived remaining time, **timeout exactly once**, answers rejected after the deadline, **expired-on-load**, pause / resume, persistence round trip, stale in-progress write from another tab discarded |
| `tests/storage.test.ts` | 16 | prefix + versioned envelope, defaults, **corrupt JSON quarantined** with notice, schema-invalid and newer-version data quarantined, **migration chain** (incl. pre-envelope v0), quota errors, export/import round trip (replace and merge, no duplicates), in-progress sessions not imported, **bad version / format / unknown question IDs / oversized / over-long strings rejected**, **script and HTML strings stay inert text**, unknown fields dropped, inconsistent session rejected |
| `tests/dom-integrity.test.tsx` | 5 | **143 / 143 questions rendered by the real question component and compared block by block with `data/original/question_bank.json` (read directly, not through the app loader)**: block ids and order, text equal after whitespace collapsing only, image `src` and file, 572 lettered choices, 35 images present with matching sha256 and question/role, 28 stem/choice images displayed and **none of the 7 answer images present**; Q004/Q007/Q088 show four image choices; all 7 ordering/matching option layers come from the original text |
| `tests/controls.test.tsx` | 11 | radio / checkbox behaviour ("n selected", extra selections allowed, source "(Choose two.)" text kept), ordering drop-downs (used steps disabled with reason, swap up/down, Clear, keyboard Enter/Space), matching (used responses disabled with "(used in row n)"), Q008 renders five rows, zoom dialog (zoom in/out/reset, Esc, focus restored, focus trap) |
| `tests/study.test.tsx` | 22 | **gate: before Check answer no explanation / keyword / tip / research / source key / status / answer image in the DOM**, verified+match, verified+differs (both directions), disputed never says wrong, pending wording, ordering answer image only after check, Q008 not scorable, Try again, attempts recorded with basis + research_version, bookmark / flag / Save tip (plain text), Practice in order (position, n / 143 checked, Resume, Jump), study sets (ID range, shuffle seeded, domain / not classified / wrong / not attempted), bank search and filters, coverage totals and pending never verified, research detail page |
| `tests/exam-ui.test.tsx` | 21 | exam chrome and labels, only "Question i of n" (no ids / topic / status), timer from deadline, Alt+N/P/F/R, **full five-question exam (MC, MR, ordering, matching, policy image) to results and per-question review**, unanswered / ungradable handling, End dialog (incomplete ordering, Escape, focus restore), **leak tests** (question, review screen, Help, End dialog, zoom viewer, every question, and 16 other routes locked with "Exam in progress"), explanations appear only after submit, **refresh restore**, **timeout while open (once)**, **expired-on-load**, **second tab submitting**, pause, aria-live warnings at 15 / 5 min, start screens (research default, pool 0, shorter exam, explicit switch, seed reproducibility, custom exam unscored-ID list and denominator wording, validation) |

## Playwright e2e (21 tests, Microsoft Edge, production build)

Every test fails on any console error, page error, failed request or HTTP status 400 or above (this also exercises the CSP meta tag), and checks for broken images where screens contain images.

| Area | Test |
|---|---|
| Exam | custom exam over the whole bank (143 questions, seed `e2e-all`): answers MC, MR, policy-image questions (Q001, Q004, Q007, Q088), ordering (correct, reversed, incomplete), matching (correct, one wrong pair, unanswered, unscorable Q008), flag / unflag, review screen with filters and jump, zoom dialog with keyboard and focus restore, End dialog (return and confirm), results (`Raw score: 6 / 142 (4.2%)` and counts verified), per-question review with the green "Source answer image", wrong policy-image choice, Q008 not scorable, history row |
| Exam | refresh mid-exam restores answers, current question, flag, and the timer is not reset |
| Exam | timeout auto-submits exactly once and locks the exam (Playwright `page.clock`); more clock ticks change nothing; the exam cannot be reopened |
| Exam | exam expired while the tab was closed: graded on load as `expired_on_load` |
| Exam | other areas locked ("Exam in progress") by direct URL, nothing leaks, Return to exam keeps the same timer |
| Exam | standard start screen (default "By research", pool size from the served research file, shorter exam / explicit switch, Start exam 65 questions / 170 minutes on the source basis, no pause, finish with 0 / 65) |
| Exam | ordering and matching fully keyboard operable (drop-downs, swap, Clear, disabled used options) |
| Home | identity line, four entry cards, secondary links |
| Study | no answer material in the DOM before Check answer; appears only after; Try again |
| Study | policy image choices (Q004) and answer images (Q005, Q081) only after check |
| Study | verified-differs-from-source and disputed behaviour (intercepting `question_reviews.json` with the test-only fixture; screenshots carry `FIXTURE` in their names) |
| Study | set picker, resume after reload, bookmark, Save tip stored as text |
| Practice | start at Q001, check, Next, `1 / 143 checked`, reload, Resume at Q002, Jump to Q143 (Finish instead of Next) |
| Bank | search by Qxxx and text, type / progress filters, opening a question shows no feedback |
| Coverage | totals per status, gradable, differs, units reviewed / 628 all equal values computed from the served `question_reviews.json`; pending rows never show a verified badge; detail page |
| Settings | text size, high contrast, colour scheme persist across reload (computed font size checked) |
| Export / import | export download, wipe, import (replace and merge), hostile tip text stays literal (`window.__pwned` undefined), wrong version / format / unknown question id / non-JSON files rejected with the existing data untouched |
| Mobile | 375 px and 360 px: home, exam, review screen, end dialog, results, coverage, study ordering; no horizontal scrolling; the fixed footer never covers the last element |

Screenshots (desktop and mobile) are in `reports/screenshots/` (53 files). I looked at the policy-image question (Q001 stem and choice images; Q004 image choices seen behind the End dialog),
the ordering and matching screens, the review grid, the End dialog, results, the per-question review with the ordering answer image, and the mobile review screen.

## Known gaps and honest limits

- The exam UI is a similar layout, not a copy, of the official AWS Exam Demo; the demo's ordering / matching screens could not be observed (see `research/exam_format.md` and the README).
- Image-answer questions (7) were not re-examined by eye in this task beyond the screenshots; the data layer's transcriptions and keys come from `data/` and were not modified.
- No automated contrast audit (axe) was run; colours were chosen for WCAG AA contrast and the four colour schemes plus high contrast were inspected in screenshots only for the settings page.
- Screen-reader behaviour was not tested with a real screen reader; only roles, labels and `aria-live` regions are asserted.
- The "verified / disputed" UI paths are tested with hand-written test-only fixtures (plus the real research as it existed during the run); they are not shipped and no research was fabricated.
- Cross-tab behaviour is tested by calling the same store functions a second tab would (and through `storage` event plumbing in the store), not by two real browser tabs.
- Dev-dependency versions are recent majors (Vite 8, Vitest 5, jsdom 27, zod 4). `jsdom` 27 was chosen because jsdom 30 needs Node >= 24.15 and the machine has 24.14.
