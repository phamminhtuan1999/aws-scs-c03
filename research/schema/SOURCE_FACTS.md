# Verified facts about the source text & tooling (main agent, 2026-09-30)

These are data/tooling facts, not answer information. Read before recording `source_issues`.

## Character set of the whole bank (all stems + all choices, checked by code point)
The ONLY non-ASCII characters in the 143 questions are:
- U+2019 `’` (right single quotation mark) — 20 occurrences, e.g. "company’s". **Not an encoding error.** Windows consoles may print it as `�`.
- U+2022 `•` (bullet) — 47 occurrences in hotspot option lists. Not an error.
- **Q052 option D** contains `ЕС2` written with CYRILLIC letters U+0415 `Е` and U+0421 `С` (in "CryptoCurrency:ЕС2/*"). This IS a real source anomaly (homoglyphs) — record it as `type: "data"` for Q052 only.
There is NO U+FFFD anywhere. Therefore any "encoding error / broken character" claim for any other question is a console artifact and must not be recorded (remove it in the final record and note the correction in `history`).

## Service Authorization Reference pages
They fetch fine with `tools/fetch_doc.py` when the page name is right. Wrong names redirect to the empty index. Look the name up in
https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html
(e.g. KMS = `list_kms.html`, S3 = `list_s3.html`, IAM = `list_iam.html`).
