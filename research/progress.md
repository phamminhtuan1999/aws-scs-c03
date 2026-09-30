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
| 5 | Q025–Q030 | done 6/6 valid | running |
| 6 | Q031–Q036 | done 6/6 valid | running |
| 7 | Q037–Q042 | running (2026-09-30) | queued |
| 8 | Q043–Q048 | running (2026-09-30) | queued |
| 9 | Q049–Q054 | running (2026-09-30) | queued |
| 10 | Q055–Q060 | running (2026-09-30) | queued |
| 11 | Q061–Q066 | running (2026-09-30) | queued |
| 12 | Q067–Q072 | running (2026-09-30) | queued |
| 13 | Q073–Q078 | running (2026-09-30) | queued |
| 14 | Q079–Q084 | running (2026-09-30) | queued |
| 15 | Q085–Q090 | queued | queued |
| 16 | Q091–Q096 | queued | queued |
| 17 | Q097–Q102 | queued | queued |
| 18 | Q103–Q108 | queued | queued |
| 19 | Q109–Q114 | queued | queued |
| 20 | Q115–Q120 | queued | queued |
| 21 | Q121–Q126 | queued | queued |
| 22 | Q127–Q132 | queued | queued |
| 23 | Q133–Q138 | queued | queued |
| 24 | Q139–Q143 | queued | queued |

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
