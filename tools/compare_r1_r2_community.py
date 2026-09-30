"""Per-question comparison: source key vs r1 (git commit 8005c8f research/reviews) vs r2 (working tree)
vs community signals: (a) vote tallies embedded in the source HTML export (question_bank.json 'votes'),
(b) ExamTopics discussion threads fetched by the main agent (scratch threads_parsed.json).
Community data is opinion, never technical evidence. Writes reports/r1_r2_community.json + .md table rows."""
from pathlib import Path
import json, subprocess, sys
from collections import Counter

TRAINER = Path(__file__).resolve().parents[1]
WS = TRAINER.parent
R1_COMMIT = '8005c8f'
THREADS = Path(sys.argv[1]) if len(sys.argv) > 1 else None

bank = {q['id']: q for q in json.loads((TRAINER / 'data/normalized/bank.json').read_text(encoding='utf-8'))['questions']}
orig = {q['id']: q for q in json.loads((WS / 'output/pdf/question_bank.json').read_text(encoding='utf-8'))['questions']}
threads = json.loads(THREADS.read_text(encoding='utf-8')) if THREADS and THREADS.exists() else {}


def fmt(q, a):
    if a is None:
        return None
    if isinstance(a, dict):
        return ','.join(f"{k.split(':')[-1]}→{str(v).split(':')[-1]}" for k, v in a.items())
    return ('>' if bank[q]['type'] == 'ordering' else '').join(str(x).split(':')[-1] for x in a)


rows = []
for q in bank:
    r1 = json.loads(subprocess.run(['git', 'show', f'{R1_COMMIT}:research/reviews/{q}.json'], capture_output=True, cwd=TRAINER).stdout.decode('utf-8'))
    r2 = json.loads((TRAINER / 'research/reviews' / f'{q}.json').read_text(encoding='utf-8'))
    iv = r2.get('independent_reverification') or {}
    votes = orig[q]['votes']
    vt = {v['voted_answers']: v['vote_count'] for v in votes}
    vtop = max(vt, key=vt.get) if vt else None
    th = threads.get(q)
    ttally = th['tally_latest_per_user'] if th else {}
    ttop = max(ttally, key=ttally.get) if ttally else None
    rows.append({
        'q': q, 'type': bank[q]['type'], 'source': fmt(q, r2['source_answer']),
        'r1': fmt(q, r1['researched_answer']), 'r1_status': r1['status'], 'r1_conf': r1['confidence']['level'],
        'r2': fmt(q, r2['researched_answer']), 'r2_status': r2['status'], 'r2_conf': r2['confidence']['level'],
        'r2_intended': fmt(q, iv.get('intended_answer')) if isinstance(iv.get('intended_answer'), (list, dict)) else None,
        'html_votes': vt, 'html_top': vtop, 'html_n': sum(vt.values()),
        'thread_mapped': bool(th and th['mapping_ok']), 'thread_comments': th['n_comments'] if th else 0,
        'thread_tally': ttally, 'thread_top': ttop, 'thread_users': th['users_with_selection'] if th else 0,
    })
(TRAINER / 'reports' / 'r1_r2_community.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding='utf-8')
c = Counter()
for r in rows:
    c['r1_' + r['r1_status']] += 1; c['r2_' + r['r2_status']] += 1
    if r['thread_mapped']: c['threads_mapped'] += 1
    if r['html_n']: c['html_votes_q'] += 1
print(dict(c))
