# Research record format (research_version r1)

Validated by `python tools/validate_research.py`. Two stages per question:

- `research/blind/Qxxx.json` — **stage "blind"**, written WITHOUT access to any answer key.
- `research/reviews/Qxxx.json` — **stage "final"**, written after comparing with the source key. Contains the blind verdict unchanged under `independent_verdict` + `blind_record_sha256`.

`research/question_reviews.json` is generated from `reviews/` (plus `pending` placeholders) by `tools/build_research.py`. The web app reads only that file.

## Unit IDs (from `research/blind_set/questions.json`)

| Question type | Units that MUST each have exactly one `option_reviews` entry |
|---|---|
| multiple_choice / multiple_response | every choice: `Q001:A`, `Q001:B`, … (`unit_type: "choice"`) |
| ordering | every step: `Q002:S1` … (`unit_type: "step"`) |
| matching | every prompt row `Q079:P1` … (`unit_type: "prompt"`) AND every response `Q079:R1` … (`unit_type: "response"`) |

## Answer value format (`independent_verdict.answer`, `researched_answer`, `source_answer`)

- multiple_choice / multiple_response: sorted array of choice IDs, e.g. `["Q013:A","Q013:E"]`
- ordering: array of step IDs in order, e.g. `["Q002:S1","Q002:S5","Q002:S3"]`
- matching: object prompt→response, e.g. `{"Q079:P1":"Q079:R2", ...}`
- `null` when no answer is supported strongly enough.

## Blind record (stage "blind")

```jsonc
{
  "question_id": "Q001",
  "question_content_hash": "<content_hash from blind_set>",
  "stage": "blind",
  "research_version": "r1",
  "researched_at": "2026-09-30T12:00:00Z",          // ISO-8601 UTC
  "performed_by": {"agent": "scs-researcher (blind)", "model": "claude-opus-5-5"},
  "blind_attestation": "Only research/blind_set, research/sources and AWS web pages were used; no answer key, vote, dump site or other research record was accessed.",
  "requirements": [ {"id": "R1", "text_vi": "...", "kind": "constraint|optimization|scope|condition"} ],
  "image_transcriptions": [ {"image": "images/Q001_image_01.jpg", "text": "exact text as read", "notes_vi": "typos kept, uncertain chars marked [?]"} ],
  "option_reviews": [
    {"unit_id": "Q001:A", "unit_type": "choice",
     "verdict": "meets|does_not_meet|meets_but_suboptimal|undetermined",
     "reason_vi": "1-2 câu cụ thể về lựa chọn NÀY (không được chỉ 'sai vì X đúng')",
     "requirement_ids": ["R1"], "reference_ids": ["ref1"], "evidence_kind": "direct|inference",
     "position": 1,                       // ordering steps only: 1-based slot, or null if excluded
     "matched_response": "Q079:R2"        // matching prompts only; responses use "used_for": ["Q079:P1"] or []
    }
  ],
  "independent_verdict": {
    "answer": ["Q001:C"],
    "proposed_status": "verified|ambiguous|outdated|unresolved",
    "confidence": {"level": "high|medium|low", "reason_vi": "...", "open_issues": ["..."]},
    "reference_ids": ["ref1", "ref2"],
    "recorded_at": "2026-09-30T12:00:00Z"
  },
  "references": [
    {"id": "ref1", "url": "https://docs.aws.amazon.com/...", "title": "...", "section": "heading or #anchor",
     "snapshot_id": "02261bae5e51",       // from tools/fetch_doc.py; null only if the page could not be fetched by script
     "read_via": "tools/fetch_doc.py|WebFetch",
     "accessed_at": "2026-09-30", "page_last_updated": null,   // only if the page states it; never invent
     "quote": "short exact excerpt (<= 30 words) that exists in the snapshot",
     "supports": "Nhận định cụ thể mà trích dẫn này hỗ trợ",
     "kind": "direct|inference"}         // direct = doc states it; inference = your reasoning from the doc
  ],
  "source_issues": [ {"type": "typo|data|outdated|ambiguous|layout", "location": "Q001:C", "detail_vi": "..."} ],
  "notes_vi": "optional"
}
```

## Final record (stage "final") — adds / overrides

```jsonc
{
  "stage": "final",
  "last_reviewed_at": "...",
  "blind_record_sha256": "<sha256 of research/blind/Qxxx.json bytes>",
  "independent_verdict": { ...copied unchanged from blind record... },
  "option_reviews": [ ...final, may be revised; every unit still exactly once... ],
  "source_answer": <answer value from data/keys/source_keys.json>,
  "researched_answer": <answer value or null>,
  "comparison": "match|mismatch|not_comparable",
  "status": "verified|disputed|ambiguous|outdated|unresolved",
  "differs_from_source": true|false,
  "confidence": {"level": "...", "reason_vi": "...", "open_issues": []},
  "reconciliation_vi": "Đã kiểm tra thêm gì ở cả hai phía; vì sao giữ/đổi kết luận",
  "explanation_vi": {
    "why_correct": "1-2 câu gắn cơ chế AWS với yêu cầu đề",
    "others": {"Q001:A": "1 câu cụ thể", "...": "..."}   // every unit not in the answer (and for MR: every correct one explained in why_correct or here)
  },
  "keywords": [ {"phrase": "exact substring of the stem", "meaning_vi": "..."} ],   // max 3
  "memory_tip_vi": "Nếu <điều kiện> -> nghĩ đến <cơ chế>; kiểm tra <ngoại lệ>",
  "tags": {"domains": ["1 Detection", "..."], "services": ["Amazon S3", "..."], "reason_vi": "..."},
  "history": [ {"version": "r1", "date": "...", "change": "blind verdict ...", "previous_answer": null} ]
}
```

## Status → grading rule (decided 2026-09-30)

| status | meaning | graded in "By research" mode |
|---|---|---|
| verified | every unit reviewed; direct evidence supports a unique answer; confidence high or medium. May MATCH or DIFFER from the source key (differs → `differs_from_source: true`). | yes |
| disputed | research and source key conflict and the evidence does not settle it | no |
| ambiguous | defective/under-specified question, answer count ≠ Choose N, several options equally valid | no |
| outdated | source answer right in an older context, current AWS behaviour differs | no |
| unresolved | researched but evidence insufficient / confidence low | no |
| pending | not researched yet (only in generated question_reviews.json) | no |

## Rules

- Evaluate every unit on its own merits. "Wrong because A is right" is not a reason.
- Separate "does not work" (`does_not_meet`) from "works but worse on the stated criterion" (`meets_but_suboptimal`).
- Multi-clause options: a doc supporting one clause does not prove the whole option.
- Never invent a feature limitation from absence on one page — look for the feature/limits/API page; otherwise `undetermined`.
- Time-dependent conclusions: state the condition. Don't call an old answer wrong only because a newer service not among the options exists.
- If the number of defensible answers ≠ Choose N, or no option satisfies all constraints → `ambiguous`; never invent conditions.
- No exam-dump / forum site is evidence. Votes are never evidence.
- Tips are conditional, never "always serverless"; distinguish least cost / least operational effort / most secure.
