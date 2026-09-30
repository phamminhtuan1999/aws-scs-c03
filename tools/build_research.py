"""Merge research/reviews/*.json into research/question_reviews.json and produce coverage files.

Questions without a final review appear as status "pending" (blind-only records are reported in
coverage but are NOT exposed to the app as conclusions). Only records that pass validate_research
(final stage) are merged; invalid ones are listed and treated as pending.

Outputs:
  research/question_reviews.json   (app contract; research_version + generated_at)
  research/coverage.csv            one row per unit
  research/coverage.json           per-question summary + totals + remaining IDs
"""
from pathlib import Path
from datetime import datetime, timezone
import csv, json, sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_research import validate, units_of, QMAP  # noqa: E402

TRAINER = Path(__file__).resolve().parents[1]
R = TRAINER / 'research'
KEYS = json.loads((TRAINER / 'data' / 'keys' / 'source_keys.json').read_text(encoding='utf-8'))['keys']
RESEARCH_VERSION = 'r2-independent-verify'
APP_FIELDS = ('status', 'researched_answer', 'source_answer', 'comparison', 'differs_from_source', 'confidence',
              'option_reviews', 'references', 'explanation_vi', 'keywords', 'memory_tip_vi', 'tags', 'source_issues',
              'requirements', 'image_transcriptions', 'researched_at', 'last_reviewed_at', 'independent_verdict',
              'reconciliation_vi', 'history', 'research_version', 'independent_reverification')


def src_answer(qid):
    k = KEYS[qid]
    return k.get('choice_ids') or k.get('sequence') or k.get('pairs')


def main():
    now = datetime.now(timezone.utc).isoformat()
    out, rows, summary, invalid = {}, [], [], {}
    for qid, q in QMAP.items():
        blind_ok = (R / 'blind' / f'{qid}.json').exists() and not validate('blind', qid)
        final_path = R / 'reviews' / f'{qid}.json'
        rec = None
        if final_path.exists():
            errs = validate('final', qid)
            if errs:
                invalid[qid] = errs
            else:
                rec = json.loads(final_path.read_text(encoding='utf-8'))
        if rec:
            entry = {k: rec.get(k) for k in APP_FIELDS}
        else:
            entry = {'status': 'pending', 'researched_answer': None, 'source_answer': src_answer(qid),
                     'comparison': 'not_comparable', 'differs_from_source': False, 'confidence': None,
                     'option_reviews': [], 'references': [], 'explanation_vi': None, 'keywords': [],
                     'memory_tip_vi': None, 'tags': None, 'source_issues': [], 'requirements': [],
                     'image_transcriptions': [], 'researched_at': None, 'last_reviewed_at': None,
                     'independent_verdict': None, 'reconciliation_vi': None, 'history': [],
                     'research_version': RESEARCH_VERSION}
        entry['source_key_gradable'] = KEYS[qid].get('gradable', True)
        entry['source_key_ungradable_reason'] = KEYS[qid].get('ungradable_reason')
        entry['gradable_by_research'] = bool(rec and rec['status'] == 'verified' and rec['researched_answer'] is not None
                                             and rec['confidence']['level'] in ('high', 'medium'))
        out[qid] = entry
        reviewed = {o['unit_id']: o for o in (rec or {}).get('option_reviews', [])}
        for uid, utype in units_of(q).items():
            o = reviewed.get(uid)
            rows.append({'question_id': qid, 'unit_id': uid, 'unit_type': utype,
                         'blind_done': blind_ok, 'final_done': bool(o),
                         'verdict': o['verdict'] if o else '', 'evidence_kind': o['evidence_kind'] if o else '',
                         'reference_ids': ' '.join(o.get('reference_ids', [])) if o else '',
                         'question_status': entry['status']})
        summary.append({'question_id': qid, 'type': q['type'], 'units': len(units_of(q)), 'blind_done': blind_ok,
                        'final_status': entry['status'], 'differs_from_source': entry['differs_from_source'],
                        'confidence': (entry['confidence'] or {}).get('level'),
                        'gradable_by_research': entry['gradable_by_research'],
                        'invalid_final_record': qid in invalid})

    (R / 'question_reviews.json').write_text(json.dumps({
        'research_version': RESEARCH_VERSION, 'generated_at': now,
        'status_rule': 'Graded in "By research" mode only when status == verified (confidence high/medium). All other statuses are shown as "no settled conclusion".',
        'questions': out}, ensure_ascii=False, indent=2), encoding='utf-8')
    with open(R / 'coverage.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)
    counts = {}
    for s in summary:
        counts[s['final_status']] = counts.get(s['final_status'], 0) + 1
    totals = {'questions': len(summary), 'units_total': len(rows),
              'units_final_reviewed': sum(r['final_done'] for r in rows),
              'blind_done': sum(s['blind_done'] for s in summary),
              'final_status_counts': counts,
              'verified_differs_from_source': sum(1 for s in summary if s['final_status'] == 'verified' and s['differs_from_source']),
              'gradable_by_research': sum(s['gradable_by_research'] for s in summary),
              'remaining_blind': [s['question_id'] for s in summary if not s['blind_done']],
              'remaining_final': [s['question_id'] for s in summary if s['final_status'] == 'pending'],
              'invalid_final_records': invalid}
    (R / 'coverage.json').write_text(json.dumps({'generated_at': now, 'research_version': RESEARCH_VERSION,
                                                  'totals': totals, 'questions': summary}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in totals.items() if k not in ('remaining_blind', 'remaining_final')}, ensure_ascii=False, indent=2))
    print('remaining_blind:', len(totals['remaining_blind']), '| remaining_final:', len(totals['remaining_final']))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
