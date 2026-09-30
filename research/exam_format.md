# SCS-C03 exam format & UI reference (observed 2026-09-30)

All pages below were opened and read on 2026-09-30; snapshots in `research/sources/snapshots/<id>.txt`.

## Exam format
| Fact | Source (snapshot) |
|---|---|
| 170 minutes; "65 questions, either multiple choice or multiple response"; 300 USD | AWS overview page https://aws.amazon.com/certification/certified-security-specialty/ (`0bcf1858a493`) |
| Question types: multiple choice (1 correct of 4), multiple response (≥2 correct of ≥5), **ordering** (3–5 responses, select and order; credit only if all correct), **matching** (responses to 3–7 prompts; all pairs must match) | SCS-C03 exam guide https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html (`02261bae5e51`) |
| 50 scored + 15 unscored questions (unscored not identified); unanswered = incorrect; no guessing penalty; pass/fail, compensatory scaled scoring | exam guide (`02261bae5e51`) |
| Domains: 1 Detection 16%, 2 Incident Response 14%, 3 Infrastructure Security 18%, 4 IAM 20%, 5 Data Protection 18%, 6 Security Foundations and Governance 14% | exam guide (`02261bae5e51`) |
| Help button in the exam lists service short names | overview page (`0bcf1858a493`) |
| Ordering and matching use a **drop-down mechanism** (one drop-down per step / per prompt); some questions use all responses, others only some; matching may use responses once, multiple times or not at all — the question instructions say which | AWS T&C blog "Addition of new exam question types" (`a8fa3a006baf`, page date 2024-09-05) |

**Discrepancy recorded:** the overview page says "65 questions, either multiple choice or multiple response", while the SCS-C03 exam guide lists four types including ordering and matching. Per the task rules the exam-specific guide takes precedence; the app supports all four types present in this bank.

App consequence: default exam simulation = 65 questions / 170 minutes. The app does NOT pick 15 "unscored" questions (the real exam's unscored items are unidentified and chosen by AWS); raw app score ≠ AWS scaled score.

## Official UI reference: AWS Exam Demo (Pearson VUE)
- Link found on https://www.pearsonvue.com/us/en/aws.html (`464a98550ca0`) → "AWS Exam Demo" https://www.pearsonvue.com/us/en/redirects/aws/demo-test-enu.html; also referenced by AWS "Before Testing" policy page (`d736498527b9`).
- Opened in the in-app browser 2026-09-30. What was actually observed (via page text + accessibility tree; screenshots could not be captured because the app window was hidden and the demo stopped rendering after question 2):
  - Intro screens: tool description (colour contrast options, flag questions for review, English toggle, screen-reader support, Ctrl+/Ctrl− zoom), "Differences between the demo and the exam" (1920×1080 or 1280×1024, timing not representative), "You are about to begin the exam."
  - Title bar: exam name ("AWS Demo Exam"), candidate name, **timer (time remaining)**, screen counter **"Question 1 of 9"** (can be hidden).
  - Tool bar: Flag for Review, Color Scheme selector (11 schemes, e.g. Black on White, White on Black, Yellow on Blue), Highlight, Strikethrough, Scratch Pad, Instructions (plus inactive items).
  - Bottom navigation: Help, End Exam, Review Screen, Previous, Navigator, Next (keyboard access keys, e.g. Alt+N = Next).
  - Question 1: multiple choice, options "A." … "D." with radio selection. Question 2: "(Select TWO.)" multiple response with checkboxes A–E.
  - Ordering / matching / case-study screens of the demo were **not** observed directly (rendering stopped); their drop-down mechanism is taken from the AWS blog above.
- Therefore the app is a **similar layout, not a copy**: README must say so. Our source bank says "(Choose two.)" — kept verbatim; the real exam wording "(Select TWO.)" is not substituted.
