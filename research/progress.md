# Current research: r2-independent-verify

Completed 2026-09-30T21:54:12.499271+00:00:143 questions,628 units;114 verified,25 ambiguous,4 unresolved. Full independent review: [REPORT](independent_verify/REPORT.md).125 unit tests and21 browser tests passed; original inputs unchanged.

---

The following r1 progress is historical:

# Research & build progress (checkpoints)

research_version: r1

## Checkpoint 0 — 2026-09-30 (main agent)
- Baseline hashes: `baseline/hashes_before.json` (55 files: 2 HTML, 2 root PDFs, all of `output/**`).
- Data layer built by `tools/build_data.py`: 143 questions, 572 choices, 628 research units, 0 blocks changed by whitespace rule, 35 images hash-verified (7 answer images), 142 gradable source keys (Q008 ungradable by decision).
- Hotspot mappings (Q002, Q005, Q073, Q008, Q079, Q081, Q082): all 14 stem/answer images viewed at original resolution; keys asserted equal to exported transcription.
- Blind set `research/blind_set/`: 143 questions, 28 stem/choice images, automated leak check PASS (no forbidden fields; no answer-image hashes; 0 green-marker pixels vs 3,759–14,486 in answer images) + visual check PASS.
- Evidence tooling: `tools/fetch_doc.py` (snapshots + quote check), `tools/validate_research.py`, `tools/build_research.py`.

### Known limitation (recorded before any research)
While inspecting the schema, the MAIN agent saw the source keys of about 40 questions (Q001–Q008, Q073, Q079, Q081, Q082, Q086, Q088, Q136, Q143 and the 24 multiple-response questions). The main agent therefore does NOT perform the blind pass; blind research is done by fresh subagents (`scs-blind-researcher`) that do not inherit this context and are instructed to read only `research/blind_set/` + AWS docs.
Blindness is enforced by instructions and directory layout, not by a hard sandbox. The model may also have seen public discussions of these questions during training. Therefore no claim of "unbiased" is made.

## Batches
| Batch | IDs | Blind | Reconcile |
|---|---|---|---|
| 1 | Q001–Q006 | done 6/6 valid | done 6/6 valid (6 verified; Q005 upgraded from blind "ambiguous" → audit) |
| 2 | Q007–Q012 | done 6/6 valid | done 6/6 valid (5 verified, Q008 ambiguous) |
| 3 | Q013–Q018 | done 6/6 valid | done 6/6 valid (6 verified, 0 differ) |
| 4 | Q019–Q024 | done 6/6 valid | done 6/6 valid (5 verified, Q024 ambiguous) |
| 5 | Q025–Q030 | done 6/6 valid | done 6/6 valid (6 verified) |
| 6 | Q031–Q036 | done 6/6 valid | done 6/6 valid (6 verified) |
| 7 | Q037–Q042 | done 6/6 valid | done 6/6 valid (6 verified) |
| 8 | Q043–Q048 | done 6/6 valid | done 6/6 valid (6 verified) |
| 9 | Q049–Q054 | done 6/6 valid | done 6/6 valid (6 verified) |
| 10 | Q055–Q060 | done 6/6 valid | done 6/6 valid (6 verified; Q056 DIFFERS from source) |
| 11 | Q061–Q066 | done 6/6 valid | done 6/6 valid (6 verified) |
| 12 | Q067–Q072 | done 6/6 valid | done 6/6 valid (6 verified) |
| 13 | Q073–Q078 | done 6/6 valid | done 6/6 valid (5 verified, Q077 ambiguous — differs from source) |
| 14 | Q079–Q084 | done 6/6 valid | done 6/6 valid (6 verified) |
| 15 | Q085–Q090 | done 6/6 valid | done 6/6 valid (6 verified) |
| 16 | Q091–Q096 | done 6/6 valid | done 6/6 valid (6 verified) |
| 17 | Q097–Q102 | done 6/6 valid | done 6/6 valid (6 verified) |
| 18 | Q103–Q108 | done 6/6 valid | done 6/6 valid (5 verified, Q107 disputed) |
| 19 | Q109–Q114 | done 6/6 valid | done 6/6 valid (6 verified) |
| 20 | Q115–Q120 | done 6/6 valid | done 6/6 valid (5 verified, Q118 ambiguous) |
| 21 | Q121–Q126 | done 6/6 valid | done 6/6 valid (5 verified, Q122 ambiguous) |
| 22 | Q127–Q132 | done 6/6 valid | done 6/6 valid (6 verified) |
| 23 | Q133–Q138 | done 6/6 valid | done 6/6 valid (5 verified, Q133 ambiguous) |
| 24 | Q139–Q143 | done 5/5 valid | done 5/5 valid (5 verified) |

## Execution notes
- Custom agent types in `.claude/agents/` were not loadable mid-session, so agents run as `general-purpose` with an explicit `model` (research: opus = Opus 5.5; web: sonnet = Sonnet 5.5) and read their role file first. The per-agent reasoning-effort setting (high / xhigh) could not be applied through this route; prompts ask for deep, careful work instead. In a new session the definitions in `.claude/agents/` apply model + effort directly.
- Web builder (Sonnet) started 2026-09-30 in parallel with blind batches 1–3.

## Audit queue (lượt 3 — must be re-checked by an agent that did not do the reconciliation)
Rule: any question whose final status/answer moved TOWARD the source key after the key was seen, any `differs_from_source`, any IAM/KMS/policy-image question with confidence < high, and any time-dependent conclusion.
- Q005 — blind proposed `ambiguous` (3 slots vs 4–5 valid steps); reconciler raised to `verified` (S6>S1>S3) after comparing with the key. Evidence cited: Okta/Google Workspace tutorial step headings. Risk of key-confirmation bias → independent audit required.
- Q001 — medium confidence, unrealistic premise (service principal vs execution role).
- Q010 — medium confidence; stem data errors (ARN, account ID, key state contradiction).
- Q011 — time-dependent pricing statements (Systems Manager on-prem pricing change 2026).
- Q019 — time-dependent (CloudTrail Lake availability change 2026).
- Snapshot `d7556cbfe602` is empty (redirect to guide root); not cited; harmless.
- Q023 — medium; engine not specified (Aurora MySQL vs PostgreSQL); RDS Proxy RequireTLS doc conflict (user guide vs API reference).
- Charset check (2026-09-30): bank has no U+FFFD; "encoding error" claims in blind records of Q021, Q027–Q030, Q032, Q034 are console artifacts (U+2019) → removed at reconciliation. Real anomaly: Q052 option D uses Cyrillic `ЕС2` (U+0415, U+0421). See research/schema/SOURCE_FACTS.md.
- Q028 — outdated finding name suffix (GuardDuty `.OutsideAWS`/`.InsideAWS`); Q029 — SSE-C disabled by default on new buckets since 2026-04 (time-dependent); Q030 — "Security Hub" renamed "Security Hub CSPM" (time-dependent naming).
- Q046 — main evidence is a re:Post Knowledge Center article; Q047 — medium, mechanism of option A not native (aggregator read-only).
- Q040 — medium; competing option A (revoke sessions) depends on whether attacker still controls the instance.
- Q049 — medium; FIS report option D is a real contender. Q051 — medium; SCP Allow-with-condition caveats.
- **Timestamp integrity incident (2026-09-30):** several agents wrote estimated/future timestamps (round minutes). Detected by comparing with file mtimes; no ordering violation (every blind file was written before its final file). Fixed with `tools/fix_timestamps.py` (timestamp fields only, audit trail in `research/corrections_log.md` and `timestamp_correction` fields); validator now rejects timestamps later than file write time; `tools/snapshot_mtimes.py` appends write-time snapshots to `research/mtime_snapshots.jsonl`.
- Q055/Q056 cite AWS Security IR guide PDF via WebFetch (no snapshot) → fetch_doc now supports PDFs; reconciler should convert to snapshots. Q070 — medium (runbook creates trail; periodic rule). Q076 — time-dependent (Shield L7 auto mitigation legacy since 2026-03-26). Q077 — "prevent" wording vs detect-and-remove options. Q079 — Audit Manager maintenance mode from 2026-04-30. Q081 P5 inference. Q082 — "design principles" vs best practices. Q084 — option A contains an impossible filter step.
- fetch_doc.py had a syntax error for ~minutes after the PDF patch (fixed; main agent). A stale garbage snapshot 199d3825e018 (raw PDF parsed as HTML) was refreshed to real PDF text; broken caches are now auto-refetched.
- Q087 — medium; option C technically viable (management account can deploy org conformance packs).
- Q087 — AUDIT: verified at medium although reconciler states option C (with E) also meets all stated requirements; auditor must decide verified vs ambiguous (Choose TWO uniqueness).
- Q077 — FIRST source-key disagreement: source C (SCP) relies on an EC2 condition key for CIDR/port that does not exist (SAR list_ec2); research answer B (detect+remove) but no option truly 'prevents' → ambiguous. Auditor must re-verify the SAR claim.
- Q094 — medium (quarantine policy removal order; re:Post KC evidence). Q095 — medium (Firewall Manager policies are per Region).
- Q056 — verified (medium) but DIFFERS from source (source C = NACL deny-all; research A = temporary all-access SG then restrictive SG, per AWSSupport-ContainEC2Instance runbook). Graded by research ⇒ priority audit.
- Q118 — blind ambiguous/outdated: ALB access logs → CloudWatch Logs since 2026-07-23 makes option A also viable. Q116 — medium (KMS permissions named in C incomplete).
- Q107 — DISPUTED: blind A (RAM customer managed permission, write-only + PrincipalTag), source B (AWS managed permission + dev-account IAM policies). Not graded by research.
- ALL 143 BLIND RECORDS COMPLETE (2026-09-30). Q122 — blind ambiguous (WAF cannot attach to NLB).

## Audit pass (lượt 3) — started 2026-09-30
Selection: `research/audit_selection.json` (48 risk questions by rule: non-verified, differs, confidence<high, blind→final change, time-dependent, policy/code image choices; + random sample of 10 high-confidence verified, seed 20260930). Q121–Q126 added after their reconciliation. 5 fresh auditor agents (`.claude/agents/scs-auditor.md`), none of which wrote the records.
- ALL 143 FINAL RECORDS COMPLETE (2026-09-30) before audit.
- Audit group 2 (Q024–Q062, 12 questions): all confirmed, no changes. Known cosmetic issue: some final-record history entries (e.g. Q046, Q047) still carry the originally estimated blind timestamps; authoritative times are the corrected researched_at/recorded_at + research/mtime_snapshots.jsonl + git history.
- Audit group 5 (Q128–Q143, 11 questions): all confirmed; Q133 AUDIT flag resolved (stays ambiguous).
- Audit group 6 (Q122, Q124, Q126): all confirmed, no changes.
- Audit group 4 (Q092–Q118, 11): 9 confirmed; Q094 confidence medium→high (KC evidence); Q107 disputed→verified high, DIFFERS from source (AWS Security Blog builds the exact scenario: customer managed permission write-only + aws:PrincipalTag; RAM docs confirm).
- Audit group 3 (Q067–Q088, 12): 11 confirmed (Q077 SAR claim re-verified on list_ec2: no CIDR/port/protocol key among 145 ec2 condition keys); Q087 verified→ambiguous (option C also meets all stated requirements; B preferred only by an unstated best-practice criterion).

## FINAL CHECKPOINT — 2026-09-30 (research_version r1)
- Blind: 143/143. Final: 143/143. Units: 628/628. Audit: 61 questions (48 risk + 10 random + 3 of Q121–Q126), 57 confirmed, 4 changed (Q005 verified→ambiguous; Q087 verified→ambiguous; Q094 confidence medium→high; Q107 disputed→verified, differs from source).
- Final status: verified 135 (graded by research; Q056 and Q107 differ from the source key), ambiguous 8 (Q005, Q008, Q024, Q077, Q087, Q118, Q122, Q133), disputed 0, outdated 0, unresolved 0, pending 0.
- Research task: COMPLETE for r1. Web task: COMPLETE (tests 125/125 unit, 21/21 e2e on final data). Baseline hashes unchanged.
- Remaining limitations: blindness enforced by instructions not sandbox; model may have seen public discussions of these questions; no live AWS experiments; per-agent effort setting not applied (model only); several "verified" at medium confidence with documented open issues.

## CHECKPOINT r3 — 2026-09-30 (main agent, approved by user)
- r2-independent-verify (separate session) committed as-is in 8b4ce30.
- r3 = r2 + 7 adjudications (`tools/apply_r3.py`, history + `r3_adjudication` per record): restore verified Q001, Q007, Q013, Q045, Q121 (typo / defect shared by all options → annotated, not disqualifying; audited r1 option verdicts reused, all references unchanged); Q112 → verified B; Q024 C verified(high) → ambiguous.
- Result: 119 verified / 21 ambiguous / 3 unresolved; 0 verified answers differ from the source key. validate_research final 0 errors; app synced (research_version r3); tests 125/125 unit, 21/21 e2e (one e2e test made data-driven instead of hard-coding Q001's r2 status).
- ExamTopics cross-check: 88/143 threads read directly and mapping-verified (see reports/r1_vs_r2_community.md); 55 not reachable (Pro paywall / HTTP 429 / not indexed).
- 2026-10-01 follow-up: those 55 have 0 comments.
  - The source export shows no comment badge for them, and the badge matches the fetched comment count on all 88 crawled threads.
  - A re-crawl of list pages 1–35 found no new SCS-C03 thread.
  - Coverage is final at 88/143 (reports/examtopics_coverage.json).
