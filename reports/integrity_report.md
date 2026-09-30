# Integrity report — SCS-C03 trainer (2026-09-30)

## 1. Original data untouched
- `tools/hash_tree.py before|after`: SHA-256 of 55 files (2 source HTML, 2 root PDFs, all of `output/**` incl. JSON, MD, PDFs, ZIP, 35 images, reports).
- Result: **0 changed, 0 missing, 0 added** (`baseline/hashes_before.json` vs `baseline/hashes_after.json`).
- `verify_exports.py` was never run in place (it would overwrite `output/verification_report.json`).

## 2. Data layer vs original sources (independent of app code)
`python tools/verify_data.py` → `reports/data_integrity.json`: **PASS, 0 issues**.
- Decodes both HTML files with lxml (embedded scripts never executed) and compares with `data/normalized/bank.json`:
  143 questions Q001–Q143 in order; types 112 MC / 24 MR / 3 ordering / 4 matching; 572 choices with identical letter order;
  1,006 text blocks equal after whitespace collapsing only; 28 stem/choice images byte-identical (SHA-256) and on the right question/role/position.
- Source keys: 136 text keys equal to the HTML answer; 7 hotspot keys equal to the answer images' transcription; answer images SHA-256-identical.
- Normalization audit (`data/normalized/normalization_audit.json`): 0 text blocks changed by the whitespace rule.
- Visual checks by the main agent: all 14 hotspot images (7 stem + 7 answer) at original resolution — slot/row counts, dropdown option order and every green-bordered selection.
  Policy/code images of Q001, Q003, Q004, Q006, Q007, Q086, Q088, Q136, Q143 were re-read character by character by the reconcilers and again by independent auditors (`research/audit_log.md`).
- Source anomalies recorded, never fixed: Q008 duplicate rows (ungradable), Q052 option D Cyrillic `ЕС2` (U+0415/U+0421), typos listed in `research/discrepancies.md`.

## 3. Rendering (app) vs original JSON
From `reports/test_report.md` (re-run 2026-09-30 after the final research sync: Vitest 125/125, Playwright/Edge 21/21):
- DOM integrity: every one of the 143 questions' stem + choices rendered and compared with `data/original/question_bank.json` read directly (not via the app loader), whitespace-collapse only → 143/143; 572 choices; 35 image hashes; none of the 7 answer images present before grading.
- Leak tests: before Check answer / submit, no explanation, keyword, tip, research status, source key or answer image in the DOM (question view, review screen, dialogs, zoom viewer, 16 locked routes during an exam).

## 4. Blind research set
- `research/blind_set/LEAK_CHECK.json`: no forbidden fields; 28 images only (stem/choice); no answer-image hash; 0 green-marker pixels (answer images: 3,759–14,486); visual check PASS.

## 5. Research records (structure + evidence plumbing)
- `tools/validate_research.py blind` → 143 records, 0 errors; `final` → 143 records, 0 errors. Checks: every unit reviewed exactly once (628/628), IDs/answers well-formed, Choose-N, matching reuse rule, reference IDs, **every quote found verbatim (whitespace-insensitive) in its local snapshot**, no exam-dump URLs, blind record SHA-256 and independent verdict copied unchanged into the final record, source_answer equals the immutable key, status/confidence rules, keywords are real substrings of the stem, no absolute "always serverless" tips, timestamps not later than the file write time.
- Evidence: 739 local snapshots of AWS pages/PDFs (`research/sources/snapshots`, index in `research/sources/index.json`).
- This validates structure and that cited text exists; it does not by itself prove the technical judgement — that is what the blind/reconcile/audit passes are for.

## 6. Incidents (recorded, not hidden)
- Several agents first wrote estimated (future) timestamps. Detected by comparing with file write times; corrected (timestamp fields only) with an audit trail (`research/corrections_log.md`, `timestamp_correction` fields); validator now rejects such timestamps; write-time snapshots in `research/mtime_snapshots.jsonl`. No blind record was written after its final record. Some history entries still show the originally estimated times (cosmetic).
- `tools/fetch_doc.py` had a syntax error for a few minutes after the PDF patch; one stale snapshot (raw PDF bytes) was refreshed; broken caches now auto-refetch.
- Several agents listed the `research/blind/` directory once (file names only, no content opened) and disclosed it in their attestation.
