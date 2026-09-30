# r1 vs r2 research + ExamTopics community cross-check (2026-09-30)

Compiled by the main agent. r1 = `research/reviews/*.json` in commit `8005c8f`; r2 = the same files in the working tree
(`research_version: r2-independent-verify`, written by another session, not committed). Per-question data:
`reports/r1_r2_community.json` (script `tools/compare_r1_r2_community.py`).

## 1. What was re-checked (not taken from the r2 report)
- Recomputed r1 vs r2 from the files: **r1 135 verified / 8 ambiguous → r2 114 verified / 25 ambiguous / 4 unresolved; 30 questions changed** — matches `research/independent_verify/REPORT.md`.
- `tools/validate_research.py final` on r2: 143 records, 0 errors. Blind records, `data/**` and the 55 frozen baseline files are unchanged (hash check, `verify_data.py` PASS).

## 2. Nature of the 30 r2 changes
| Kind | Questions |
|---|---|
| **Status downgrade, r2's own intended answer = source key** (stricter literal reading, no new answer) | Q001, Q002, Q007, Q010, Q011, Q013, Q019, Q023, Q026, Q041, Q045, Q047, Q054, Q070, Q084, Q094, Q095, Q112, Q121, Q142 |
| Downgrade of an r1 answer that differed from the source key | Q056 (A), Q107 (A) → both ambiguous |
| Upgrade | Q024 → **C verified (high), differs from key A**; Q133 → B verified (= key) |
| Still not graded (status wording changed only) | Q005, Q008 (→ unresolved), Q062 (→ unresolved), Q077, Q087, Q122 |

So r2 is mostly a **grading-policy change** (typos / literal defects / unstated scope ⇒ not gradable), not a disagreement about which option is intended.

## 3. Main agent's assessment of the disputed points (judgement, based on option text + cited AWS docs)
- **Q024 — disagree with r2.** r2's own option review says C only "meets conditionally: the counter must be shared across EC2 and atomic". Option C does not say that, and the stem describes a stateless app on several instances behind an ALB. `verified/high` for C is inconsistent; keep **ambiguous** (as r1). WAF minimum rate limit = 10 is confirmed in the AWS docs snapshot, so A is not literally correct either.
- **Q112 — disagree with r2.** C adds SSM Agent + an inventory report, which does not analyse image vulnerabilities; B analyses the ECR scan report. B remains the only option that does what the stem asks → verified B (r1) is defensible.
- **Typo-only downgrades (Q013 `)` instead of `}`, Q121 "cm-guard", Q045 "aws:RequestTag.CostCenter")** — the original brief says source typos are annotated, not that they make a question ungradable. Community support for the key is strong (Q045 C 7 vs A 2; Q013 AE 2/2). Main agent leans **r1** (verified + source-issue note).
- **Shared-flaw downgrades (Q001, Q007)** — the flaw (service principal; bucket ARN without `/*`) is in every option; the best option is unambiguous and community is unanimous (Q001 C 6/6, Q007 B 2/2). Leans **r1**.
- **Agree with r2 being stricter:** Q056 (no doc states tracked→untracked; community split C4/A2/B2/D1), Q062 (community split BE4/AB3; E says "last logged in"), Q094 (policy page says do not remove it yourself), Q107 (answer rests on a blog post and differs from the key), Q142 (standard logs have no full headers), Q005/Q087/Q122/Q077 (already ungraded).
- Remaining (Q002, Q010, Q011, Q019, Q023, Q026, Q041, Q047, Q054, Q070, Q084, Q095): intended answer unchanged; whether to grade them is a policy choice (strict = r2, lenient-with-caveat = r1).

## 4. ExamTopics discussions (opinion, never technical evidence)
Method: threads read directly from public pages (not search snippets). Thread IDs from r2's list + main agent's list crawl + targeted probes of the exact slug `…scs-c03-topic-1-question-N-discussion/` (server rejects wrong N). Each thread verified: title question number and stem text match the bank. Parsed: comments, user, date, "Selected Answer", upvotes; tally = latest selection per user.

Coverage: **88/143 threads mapped and verified** (Q001–Q085, Q090, Q091, Q095); **55 not reached** (Q086–Q089, Q092–Q094, Q096–Q143): exam view pages beyond page 2 need ExamTopics Pro, the public list (608 pages, activity-ordered) returned HTTP 429 even at 1 req/4 s, and web search does not index those threads. 220 comments; 80 threads contain selections (193 users); 32 threads have a single voter; 2 comments cite an LLM ("According to Claude") and are not independent. Hotspot threads (Q002, Q005, Q008, Q073, Q079, Q081, Q082) have text answers only.
Also used: the vote tallies embedded in the source HTML export (80 questions, 244 votes, median 2 per question).

Results (80 threads with selections):
- Community top choice = source key: **78/80**. Differences: Q076 (tie B1/D1), Q077 (B 2/2 — agrees with research that the SCP in C cannot filter port/CIDR).
- r1 verified vs community top: 76/78 agree (Q056 — community C, but split; Q076 tie).
- r2 verified vs community top: 61/63 agree (Q024 — community A 3 users, one of whom first chose C citing the WAF minimum of 10 and later switched; Q076 tie).
- Contested threads (top < 70%): Q017 (A5/B2/D1), Q040 (D5/A2/B1), Q049 (B2/A1), Q056 (C4/A2/B2/D1), Q062 (BE4/AB3), Q076 (B1/D1).

Interpretation: agreement with the source key mostly reflects that the source key *is* the community answer set; small samples (median 2) make it weak evidence. It does not validate or refute technical conclusions.
