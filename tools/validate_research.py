"""Structural validation of research records (see research/schema/RESEARCH_FORMAT.md).

Usage:
  python tools/validate_research.py blind  [Q001 Q002 ...]   # default: all files present in research/blind/
  python tools/validate_research.py final  [Q001 ...]        # research/reviews/
Exit 1 if any error. This checks structure + evidence plumbing (quotes exist in snapshots);
it does NOT replace reading the documents and judging correctness.
"""
from pathlib import Path
import hashlib, json, re, sys

TRAINER = Path(__file__).resolve().parents[1]
R = TRAINER / 'research'
BLIND = json.loads((R / 'blind_set' / 'questions.json').read_text(encoding='utf-8'))['questions']
QMAP = {q['id']: q for q in BLIND}
SNAP = R / 'sources' / 'snapshots'
VERDICTS = {'meets', 'does_not_meet', 'meets_but_suboptimal', 'undetermined'}
LEVELS = {'high', 'medium', 'low'}
FINAL_STATUS = {'verified', 'disputed', 'ambiguous', 'outdated', 'unresolved'}
BLIND_STATUS = {'verified', 'ambiguous', 'outdated', 'unresolved'}
ISO = re.compile(r'^\d{4}-\d{2}-\d{2}')
BANNED_TIPS = re.compile(r'(always|luôn( luôn)?)\s+(chọn\s+)?(serverless|managed)', re.I)


def squash(s):
    return re.sub(r'\s+', ' ', s).strip().lower()


_snap_cache = {}


def snapshot_text(sid):
    if sid not in _snap_cache:
        p = SNAP / f'{sid}.txt'
        _snap_cache[sid] = squash(p.read_text(encoding='utf-8')) if p.exists() else None
    return _snap_cache[sid]


def units_of(q):
    if q['type'] in ('multiple_choice', 'multiple_response'):
        return {c['id']: 'choice' for c in q['choices']}
    it = q['interaction']
    if it['kind'] == 'ordering':
        return {s['id']: 'step' for s in it['steps']}
    u = {p['id']: 'prompt' for p in it['prompts']}
    u.update({r['id']: 'response' for r in it['responses']})
    return u


def check_answer(q, ans, errs, where):
    if ans is None:
        return
    t = q['type']
    units = units_of(q)
    if t in ('multiple_choice', 'multiple_response'):
        if not isinstance(ans, list) or not all(a in units for a in ans) or len(set(ans)) != len(ans):
            errs.append(f'{where}: invalid choice answer {ans}')
            return
        if ans != sorted(ans):
            errs.append(f'{where}: choice answer must be sorted')
        need = 1 if t == 'multiple_choice' else q['choose']
        if need and len(ans) != need:
            errs.append(f'{where}: answer has {len(ans)} ids, question requires {need}')
    elif t == 'ordering':
        slots = q['interaction']['slots']
        if not isinstance(ans, list) or len(ans) != slots or not all(units.get(a) == 'step' for a in ans) or len(set(ans)) != len(ans):
            errs.append(f'{where}: invalid ordering answer {ans} (slots={slots})')
    else:
        prompts = [p['id'] for p in q['interaction']['prompts']]
        if not isinstance(ans, dict) or sorted(ans) != sorted(prompts) or not all(units.get(v) == 'response' for v in ans.values()):
            errs.append(f'{where}: invalid matching answer {ans}')
        elif not q['interaction']['reuse'] and len(set(ans.values())) != len(ans):
            errs.append(f'{where}: matching answer reuses a response but source rule forbids reuse')


def validate(stage, qid):
    errs = []
    path = R / ('blind' if stage == 'blind' else 'reviews') / f'{qid}.json'
    try:
        rec = json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:  # noqa
        return [f'{qid}: cannot read/parse {path.name}: {e}']
    q = QMAP.get(qid)
    if not q:
        return [f'{qid}: unknown question']
    w = qid
    for k in ('question_id', 'question_content_hash', 'stage', 'research_version', 'researched_at', 'requirements',
              'option_reviews', 'independent_verdict', 'references', 'source_issues'):
        if k not in rec:
            errs.append(f'{w}: missing field {k}')
    if errs:
        return errs
    if rec['question_id'] != qid: errs.append(f'{w}: question_id mismatch')
    if rec['stage'] != stage: errs.append(f'{w}: stage should be {stage}')
    if rec['question_content_hash'] != q['content_hash']: errs.append(f'{w}: content hash mismatch')
    if not ISO.match(str(rec['researched_at'])): errs.append(f'{w}: researched_at not ISO')
    req_ids = {r.get('id') for r in rec['requirements']}
    if not rec['requirements']: errs.append(f'{w}: no requirements listed')
    refs = {}
    for r in rec['references']:
        rid = r.get('id')
        if rid in refs: errs.append(f'{w}: duplicate reference id {rid}')
        refs[rid] = r
        for k in ('url', 'title', 'accessed_at', 'quote', 'supports', 'kind'):
            if not r.get(k): errs.append(f'{w}: reference {rid} missing {k}')
        if r.get('kind') not in ('direct', 'inference'): errs.append(f'{w}: reference {rid} bad kind')
        if not str(r.get('url', '')).startswith('https://'): errs.append(f'{w}: reference {rid} url not https')
        if re.search(r'examtopics|itexams|exam-?dump|certyiq|examcollection|pass4|vceguide', str(r.get('url', '')), re.I):
            errs.append(f'{w}: reference {rid} is an exam-dump site (not evidence)')
        sid = r.get('snapshot_id')
        if sid:
            text = snapshot_text(sid)
            if text is None:
                errs.append(f'{w}: reference {rid} snapshot {sid} not found')
            elif squash(r.get('quote', '')) not in text:
                errs.append(f'{w}: reference {rid} quote not found in snapshot {sid}')
        elif r.get('read_via') not in ('WebFetch', 'browser'):
            errs.append(f'{w}: reference {rid} has no snapshot and no read_via WebFetch/browser')
        if len(str(r.get('quote', '')).split()) > 45: errs.append(f'{w}: reference {rid} quote too long')
    units = units_of(q)
    seen = {}
    for o in rec['option_reviews']:
        u = o.get('unit_id')
        seen[u] = seen.get(u, 0) + 1
        if u not in units: errs.append(f'{w}: unknown unit {u}'); continue
        if o.get('unit_type') != units[u]: errs.append(f'{w}: {u} unit_type should be {units[u]}')
        if o.get('verdict') not in VERDICTS: errs.append(f'{w}: {u} bad verdict {o.get("verdict")}')
        if not o.get('reason_vi') or len(o['reason_vi']) < 15: errs.append(f'{w}: {u} reason_vi missing/too short')
        for rid in o.get('reference_ids', []):
            if rid not in refs: errs.append(f'{w}: {u} references unknown {rid}')
        for rq in o.get('requirement_ids', []):
            if rq not in req_ids: errs.append(f'{w}: {u} requirement {rq} unknown')
        if o.get('evidence_kind') not in ('direct', 'inference'): errs.append(f'{w}: {u} evidence_kind missing')
        if o.get('verdict') != 'undetermined' and not o.get('reference_ids') and o.get('evidence_kind') == 'direct':
            errs.append(f'{w}: {u} claims direct evidence without reference_ids')
    missing = sorted(set(units) - set(seen))
    dup = sorted(u for u, n in seen.items() if n > 1)
    if missing: errs.append(f'{w}: units without review: {missing}')
    if dup: errs.append(f'{w}: units reviewed more than once: {dup}')

    iv = rec['independent_verdict']
    if not isinstance(iv, dict) or 'answer' not in iv: errs.append(f'{w}: independent_verdict malformed'); return errs
    check_answer(q, iv['answer'], errs, f'{w} independent_verdict')
    if iv.get('proposed_status') not in BLIND_STATUS: errs.append(f'{w}: proposed_status invalid')
    conf = iv.get('confidence') or {}
    if conf.get('level') not in LEVELS or not conf.get('reason_vi'): errs.append(f'{w}: independent confidence malformed')
    if not ISO.match(str(iv.get('recorded_at', ''))): errs.append(f'{w}: recorded_at missing')
    for rid in iv.get('reference_ids', []):
        if rid not in refs: errs.append(f'{w}: verdict references unknown {rid}')
    if iv.get('proposed_status') == 'verified':
        if iv['answer'] is None: errs.append(f'{w}: verified without answer')
        if conf.get('level') == 'low': errs.append(f'{w}: verified with low confidence')
        if not any(refs.get(rid, {}).get('kind') == 'direct' for rid in iv.get('reference_ids', [])):
            errs.append(f'{w}: verified verdict needs at least one direct reference')

    if stage == 'final':
        for k in ('last_reviewed_at', 'blind_record_sha256', 'source_answer', 'researched_answer', 'comparison', 'status',
                  'differs_from_source', 'confidence', 'reconciliation_vi', 'explanation_vi', 'keywords', 'memory_tip_vi', 'tags', 'history'):
            if k not in rec: errs.append(f'{w}: final missing {k}')
        if errs: return errs
        bpath = R / 'blind' / f'{qid}.json'
        if not bpath.exists():
            errs.append(f'{w}: blind record missing')
        else:
            if hashlib.sha256(bpath.read_bytes()).hexdigest() != rec['blind_record_sha256']:
                errs.append(f'{w}: blind_record_sha256 mismatch (blind record changed after reconciliation?)')
            if json.loads(bpath.read_text(encoding='utf-8'))['independent_verdict'] != iv:
                errs.append(f'{w}: independent_verdict differs from blind record')
        keys = json.loads((TRAINER / 'data' / 'keys' / 'source_keys.json').read_text(encoding='utf-8'))['keys'][qid]
        src = keys.get('choice_ids') or keys.get('sequence') or keys.get('pairs')
        if rec['source_answer'] != src: errs.append(f'{w}: source_answer does not equal data/keys value')
        check_answer(q, rec['researched_answer'], errs, f'{w} researched_answer')
        st = rec['status']
        if st not in FINAL_STATUS: errs.append(f'{w}: status invalid')
        c = rec['confidence']
        if c.get('level') not in LEVELS: errs.append(f'{w}: confidence level invalid')
        ra = rec['researched_answer']
        exp_cmp = 'not_comparable' if ra is None else ('match' if ra == src else 'mismatch')
        if rec['comparison'] != exp_cmp: errs.append(f'{w}: comparison should be {exp_cmp}')
        if rec['differs_from_source'] != (exp_cmp == 'mismatch'): errs.append(f'{w}: differs_from_source inconsistent')
        if st == 'verified':
            if ra is None: errs.append(f'{w}: verified without researched_answer')
            if c.get('level') == 'low': errs.append(f'{w}: verified with low confidence')
        if st == 'disputed' and exp_cmp != 'mismatch' and ra is not None: errs.append(f'{w}: disputed but research matches source')
        ex = rec['explanation_vi']
        if not ex.get('why_correct'): errs.append(f'{w}: explanation why_correct missing')
        others = ex.get('others', {})
        if ra is not None:
            in_answer = set(ra) if isinstance(ra, list) else set(ra.keys()) | set(ra.values())
            need = [u for u in units if u not in in_answer and units[u] in ('choice', 'step')]
            miss = [u for u in need if u not in others]
            if miss: errs.append(f'{w}: explanation others missing {miss}')
        stem_text = ' '.join(b['text'] for b in q['stem'] if b['type'] == 'text').lower()
        if len(rec['keywords']) > 3: errs.append(f'{w}: more than 3 keywords')
        for kw in rec['keywords']:
            if kw.get('phrase', '').lower() not in stem_text: errs.append(f'{w}: keyword not in stem: {kw.get("phrase")}')
        if BANNED_TIPS.search(rec['memory_tip_vi'] or ''): errs.append(f'{w}: memory tip uses an absolute serverless/managed rule')
        if not rec['tags'].get('domains'): errs.append(f'{w}: tags.domains empty')
        if not rec['history']: errs.append(f'{w}: history empty')
    return errs


def main():
    stage = sys.argv[1]
    ids = sys.argv[2:] or sorted(p.stem for p in (R / ('blind' if stage == 'blind' else 'reviews')).glob('Q*.json'))
    total = []
    for qid in ids:
        e = validate(stage, qid)
        total += e
        print(f'{qid}: {"OK" if not e else str(len(e)) + " error(s)"}')
    for e in total:
        print('  -', e)
    print(f'\n{len(ids)} record(s), {len(total)} error(s)')
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
