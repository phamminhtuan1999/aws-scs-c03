"""Generate research/discrepancies.md from final records + blind records + source keys.

Sections: status counts; source key vs research (every question that differs or is not comparable);
non-verified questions with reasons; key-direction changes (blind -> final); time-dependent conclusions;
all source issues per question. Pending questions are listed explicitly.
"""
from pathlib import Path
from datetime import datetime, timezone
import json, sys

TRAINER = Path(__file__).resolve().parents[1]
R = TRAINER / 'research'
BANK = {q['id']: q for q in json.loads((TRAINER / 'data' / 'normalized' / 'bank.json').read_text(encoding='utf-8'))['questions']}
KEYS = json.loads((TRAINER / 'data' / 'keys' / 'source_keys.json').read_text(encoding='utf-8'))['keys']
HOT = json.loads((TRAINER / 'data' / 'interactions' / 'hotspot.json').read_text(encoding='utf-8'))['questions']


def fmt(qid, ans):
    if ans is None:
        return '—'
    if isinstance(ans, dict):
        return ', '.join(f'{k.split(":")[1]}→{v.split(":")[1]}' for k, v in ans.items())
    return (' > ' if BANK[qid]['type'] == 'ordering' else ',').join(a.split(':')[1] for a in ans)


def src(qid):
    k = KEYS[qid]
    return k.get('choice_ids') or k.get('sequence') or k.get('pairs')


def main():
    finals, blinds = {}, {}
    for qid in BANK:
        f = R / 'reviews' / f'{qid}.json'
        b = R / 'blind' / f'{qid}.json'
        if f.exists():
            finals[qid] = json.loads(f.read_text(encoding='utf-8'))
        if b.exists():
            blinds[qid] = json.loads(b.read_text(encoding='utf-8'))
    counts = {}
    for qid in BANK:
        st = finals[qid]['status'] if qid in finals else 'pending'
        counts[st] = counts.get(st, 0) + 1
    L = [f'# Discrepancies & source issues (research_version r1)', '',
         f'Generated {datetime.now(timezone.utc).isoformat(timespec="seconds")} by `tools/make_discrepancies.py` from `research/reviews/`, `research/blind/` and `data/keys/source_keys.json`.',
         'Source keys are never modified; this file only reports differences.', '',
         '## Status counts', '', '| status | questions |', '|---|---|']
    L += [f'| {k} | {v} |' for k, v in sorted(counts.items())]
    L += ['', '## Source key vs research — every question that differs or cannot be compared', '',
          '| Q | type | source key | blind verdict | final research | status | confidence | graded by research? | reason (short) |', '|---|---|---|---|---|---|---|---|---|']
    for qid, f in finals.items():
        if f['comparison'] == 'match' and f['status'] == 'verified':
            continue
        conf = (f.get('confidence') or {}).get('level')
        graded = 'yes' if f['status'] == 'verified' and conf in ('high', 'medium') else 'no'
        reason = (f.get('reconciliation_vi') or '').replace('\n', ' ').replace('|', '/')[:260]
        L.append(f'| {qid} | {BANK[qid]["type"]} | {fmt(qid, src(qid))}{" (ungradable)" if not KEYS[qid].get("gradable", True) else ""} | '
                 f'{fmt(qid, blinds.get(qid, {}).get("independent_verdict", {}).get("answer"))} | {fmt(qid, f["researched_answer"])} | {f["status"]} | {conf} | {graded} | {reason} |')
    L += ['', '## Blind → final changes (bias check)', '',
          'Questions where the final answer or status differs from the blind (pre-key) verdict. `AUDIT` = moved toward the source key after seeing it.', '',
          '| Q | blind answer / status | final answer / status | source key | AUDIT flag |', '|---|---|---|---|---|']
    for qid, f in finals.items():
        iv = f['independent_verdict']
        if iv['answer'] != f['researched_answer'] or iv['proposed_status'] != f['status']:
            flag = any('AUDIT' in str(x) for x in (f.get('confidence') or {}).get('open_issues', []))
            L.append(f'| {qid} | {fmt(qid, iv["answer"])} / {iv["proposed_status"]} | {fmt(qid, f["researched_answer"])} / {f["status"]} | {fmt(qid, src(qid))} | {"yes" if flag else ""} |')
    L += ['', '## Medium/low confidence verified questions (graded, but with open issues)', '']
    for qid, f in finals.items():
        c = f.get('confidence') or {}
        if f['status'] == 'verified' and c.get('level') != 'high':
            L.append(f'- **{qid}** ({c.get("level")}): ' + '; '.join(str(x) for x in c.get('open_issues', []))[:400])
    L += ['', '## Time-dependent / outdated notes', '']
    for qid, f in finals.items():
        for s in f.get('source_issues', []):
            if s.get('type') == 'outdated':
                L.append(f'- **{qid}** `{s.get("location")}`: {s.get("detail_vi")}')
    L += ['', '## All recorded source issues (typos, data, layout, ambiguity)', '']
    for qid, f in finals.items():
        for s in f.get('source_issues', []):
            if s.get('type') != 'outdated':
                L.append(f'- **{qid}** [{s.get("type")}] `{s.get("location")}`: {s.get("detail_vi")}')
    for qid, h in HOT.items():
        for n in h.get('source_notes', []):
            L.append(f'- **{qid}** [mapping note] {n}')
    pend = [q for q in BANK if q not in finals]
    L += ['', '## Pending (no final record yet)', '', ', '.join(pend) if pend else 'None.', '']
    (R / 'discrepancies.md').write_text('\n'.join(L), encoding='utf-8')
    print(counts, '| pending:', len(pend))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
