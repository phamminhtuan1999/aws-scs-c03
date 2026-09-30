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
| 10 | Q055–Q060 | done 6/6 valid | running |
| 11 | Q061–Q066 | done 6/6 valid | done 6/6 valid (6 verified) |
| 12 | Q067–Q072 | done 6/6 valid | done 6/6 valid (6 verified) |
| 13 | Q073–Q078 | done 6/6 valid | done 6/6 valid (5 verified, Q077 ambiguous — differs from source) |
| 14 | Q079–Q084 | done 6/6 valid | done 6/6 valid (6 verified) |
| 15 | Q085–Q090 | done 6/6 valid | done 6/6 valid (6 verified) |
| 16 | Q091–Q096 | done 6/6 valid | running |
| 17 | Q097–Q102 | done 6/6 valid | running |
| 18 | Q103–Q108 | done 6/6 valid | running |
| 19 | Q109–Q114 | running (2026-09-30) | queued |
| 20 | Q115–Q120 | running (2026-09-30) | queued |
| 21 | Q121–Q126 | running (2026-09-30) | queued |
| 22 | Q127–Q132 | running (2026-09-30) | queued |
| 23 | Q133–Q138 | running (2026-09-30) | queued |
| 24 | Q139–Q143 | running (2026-09-30) | queued |

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
