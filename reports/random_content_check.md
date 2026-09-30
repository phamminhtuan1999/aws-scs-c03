# Random content check — app vs source PDF (2026-09-30)

Sample: 10 questions drawn with `random.seed(20261001)` from Q001–Q143: Q020, Q032, Q035, Q039, Q049, Q061, Q083, Q093, Q101, Q136
(8 multiple choice, 2 multiple response, 1 with a policy image; no ordering/matching question was drawn — those 7 were checked visually against their images earlier, see `integrity_report.md`).

Method:
- App side: production build at http://localhost:4173, route `#/practice/Qxxx`; DOM text of every `[data-block-id]` block (stem + choices) and image `src`; then one answer selected and **Check answer** pressed to read the displayed key.
- PDF side: text extracted with pypdf from `output/pdf/AWS_SCS-C03_Q001-Q100_NotebookLM.pdf` / `..._Q101-Q143_...pdf`, split at the `Qxxx | Question #n` headings, footer removed.
- Comparison ignores whitespace only (PDF line wrapping). Checks: (1) concatenated stem blocks == the PDF stem section exactly (no missing/extra/reordered text, image placeholders at the same position); (2) every choice block present under the same letter, letters in the same order; (3) served image bytes == `output/pdf/images` file (SHA-256); (4) key shown after Check answer == "Correct answer – as provided in the source" in the PDF; (5) nothing about the answer in the DOM before Check.

| Q | type | text blocks | images | letters | PDF key | app key | stem exact | leak before check | problems |
|---|---|---|---|---|---|---|---|---|---|
| Q020 | MC | 6 | 0 | A–D | A | A | yes | no | 0 |
| Q032 | MR | 9 | 0 | A–E | BC | B, C | yes | no | 0 |
| Q035 | MC | 6 | 0 | A–D | B | B | yes | no | 0 |
| Q039 | MC | 6 | 0 | A–D | D | D | yes | no | 0 |
| Q049 | MC | 6 | 0 | A–D | B | B | yes | no | 0 |
| Q061 | MR | 7 | 0 | A–E | AD | A, D | yes | no | 0 |
| Q083 | MC | 6 | 0 | A–D | B | B | yes | no | 0 |
| Q093 | MC | 7 | 0 | A–D | C | C | yes | no | 0 |
| Q101 | MC | 8 | 0 | A–D | A | A | yes | no | 0 |
| Q136 | MC | 7 | 1 (SHA-256 equal) | A–D | D | D | yes | no | 0 |

Result: **0 differences**. Source typos are reproduced verbatim (e.g. Q035 "do lo resolve", Q039 "this rote", Q101 "Development. Staging", Q136 "arn:aws :iam ::"), and "company’s" keeps U+2019.
All 10 are `verified` with the research answer equal to the source key, so the displayed key is both the research answer and the PDF key.
