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
| 1 | Q001–Q006 | done 6/6 valid | running |
| 2 | Q007–Q012 | done 6/6 valid | running |
| 3 | Q013–Q018 | done 6/6 valid | done 6/6 valid (6 verified, 0 differ) |
| 4 | Q019–Q024 | done 6/6 valid | running |
| 5 | Q025–Q030 | running (2026-09-30) | queued |
| 6 | Q031–Q036 | running (2026-09-30) | queued |
| 7 | Q037–Q042 | running (2026-09-30) | queued |
| 8 | Q043–Q048 | running (2026-09-30) | queued |
| 9 | Q049–Q054 | running (2026-09-30) | queued |
| 10 | Q055–Q060 | queued | queued |
| 11 | Q061–Q066 | queued | queued |
| 12 | Q067–Q072 | queued | queued |
| 13 | Q073–Q078 | queued | queued |
| 14 | Q079–Q084 | queued | queued |
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
