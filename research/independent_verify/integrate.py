"""Merge the frozen independent passes, preserving source keys and original r1 blind records.

Evidence retrieval archives primary pages; reading/judgment occurred in the agent passes.
This is not a fresh blind run. Final root adjudications remain separately identifiable.
"""
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import copy, csv, hashlib, json, re, sys

HERE = Path(__file__).resolve().parent
TRAINER = HERE.parents[1]
sys.path.insert(0, str(TRAINER / 'tools'))
from fetch_doc import fetch, rebuild_index, load_index
from validate_research import QMAP, units_of, validate

NOW = datetime.now(timezone.utc).isoformat()
VERSION = 'r2-independent-verify'
GROUPS = ['q001_q036', 'q037_q072', 'q073_q108', 'q109_q143']

def read(p):
    return json.loads(p.read_text(encoding='utf-8'))

def write(p, x):
    p.write_text(json.dumps(x, ensure_ascii=False, indent=2), encoding='utf-8')

def selected(answer):
    if isinstance(answer, dict):
        return set(answer) | set(answer.values())
    return set(answer or [])

def normalize():
    out = []
    for group in GROUPS:
        raw = read(HERE / group / 'comparison.json')
        blind = read(HERE / group / 'independent.json')
        bmap = {r.get('question_id', r.get('id')): r for r in blind.get('questions', blind.get('records'))}
        for r in raw.get('questions', raw.get('records')):
            qid = r['question_id']
            b = bmap[qid]
            if group == 'q001_q036':
                reasons = r['proposed_per_option_reasons']
                x = dict(status=r['proposed_status'], answer=r['proposed_researched_answer'],
                         explanation=r['proposed_explanation_vi'], keywords=r['proposed_keywords'],
                         tip=r['proposed_memory_tip_vi'], refs=r['references'], issues=r['source_issues'],
                         confidence=r['confidence'], reason=r['comparison_vi'],
                         intended=r.get('intended_answer_requires_source_fix_or_scope_clarification'),
                         candidates=b.get('candidates'), reasons=reasons, options=[])
            elif group == 'q037_q072':
                p = r['proposed']
                x = dict(status=p['status'], answer=p['answer'], explanation=p['explanation_vi'],
                         keywords=p['keywords'], tip=p['memory_tip_vi'], refs=p['citations'],
                         issues=p['source_issues'], confidence=p['confidence'], reason=r['audit_vi'],
                         intended=p.get('intended_answer'), candidates=p.get('candidate_answers'),
                         reasons={o['unit_id']: o['reason_vi'] for o in p['option_reviews']}, options=p['option_reviews'])
            elif group == 'q073_q108':
                reasons = r['all_option_verdicts_vi'] | r.get('mapping_reasons_vi', {})
                x = dict(status=r['proposed_status'], answer=r['proposed_answer'],
                         explanation=r['proposed_explanation_vi'], keywords=r['proposed_keywords'],
                         tip=r['proposed_memory_tip_vi'], refs=r['citations'], issues=r['source_issues'],
                         confidence=r['confidence'], reason=r['change_reason_vi'],
                         intended=r.get('intended_answer'), candidates=r.get('candidate_answers'),
                         reasons=reasons, options=[])
            else:
                old = read(HERE / 'before' / 'reviews' / (qid + '.json'))
                # Keyword editing is post-comparison editorial work; preserve the
                # original independent record, and keep useful actual stem phrases.
                kws = copy.deepcopy(old['keywords'])
                x = dict(status=r['proposed_status'], answer=r['proposed_answer'], explanation=r['explanation_vi'],
                         keywords=kws, tip=r['memory_tip_vi'], refs=r['references'], issues=r['source_issues'],
                         confidence=r['confidence'], reason=r['reason_vi'], intended=None,
                         candidates=b.get('candidate_answers'),
                         reasons={o['unit_id']: o['reason_vi'] for o in r['option_reviews']}, options=r['option_reviews'])
            x.update(question_id=qid, group=group, independent=b,
                     independent_sha256=hashlib.sha256((HERE / group / 'independent.json').read_bytes()).hexdigest(),
                     comparison_sha256=hashlib.sha256((HERE / group / 'comparison.json').read_bytes()).hexdigest(),
                     root_adjudication=None)
            out.append(x)
    assert len(out) == 143 and len({x['question_id'] for x in out}) == 143
    return out

def adjudicate(items):
    byid = {x['question_id']: x for x in items}
    x = byid['Q015']
    x.update(status='verified', answer=['Q015:D'], confidence='medium')
    x['root_adjudication'] = 'D dùng dịch vụ KMS và CloudTrail. Đề chỉ ràng buộc symmetric KMS keys vào custom store, không nói mọi data-key pair phải dùng chính các key đó; GenerateDataKeyPair cần symmetric key riêng ở standard store.'
    x['explanation']['why_correct'] = 'D dùng KMS với CloudHSM custom key store và CloudTrail để kiểm soát, audit khóa. Riêng asymmetric data-key pair cần symmetric KMS key trong standard store; GenerateDataKeyPair không hỗ trợ custom key store.'
    x['explanation']['others'].pop('Q015:D', None)
    x['reasons']['Q015:D'] = 'KMS quản lý khóa và CloudTrail audit; data-key pair dùng standard-store key riêng.'
    x = byid['Q040']
    x.update(status='verified', answer=['Q040:D'], confidence='medium')
    x['root_adjudication'] = 'Giữ D: ngữ cảnh fix cần4giờ, instance vẫn bị chiếm, nên revoke các session cũ không ngăn attacker lấy credentials mới. D là biện pháp duy trì chặn đọc trong thời gian khắc phục; không suy diễn ngắt stream đã authorize.'
    x['explanation']['why_correct'] = 'D đặt explicit deny đọc tại bucket, chặn request mới dù attacker lấy credentials mới từ EC2 đang bị chiếm trong 4 giờ sửa lỗi. Biện pháp này cũng tạm chặn người dùng hợp lệ; không bảo đảm ngắt stream đã được authorize.'
    x['explanation']['others'].pop('Q040:D', None)
    x['reasons']['Q040:D'] = 'Explicit deny bucket chặn request đọc mới từ cả credentials cũ và mới.'
    x['issues'] = [s for s in x['issues'] if not s.startswith('Hai phương án A/D')]
    # Keep diagnostic disagreement in audit, not a claim of a fully blinded consensus.
    for qid in ('Q002', 'Q010', 'Q011', 'Q013', 'Q023', 'Q026'):
        x = byid[qid]
        if x['status'] != 'verified':
            x['intended'] = x['answer'] or x.get('intended')
            x['answer'] = None
    # Clarify a non-best distractor using the actual API restriction.
    byid['Q122']['reasons']['Q122:D'] = 'WAF không gắn NLB; rate-based rule dùng count/block/challenge, không cấu hình Allow làm action trực tiếp.'
    byid['Q122']['explanation']['others']['Q122:D'] = byid['Q122']['reasons']['Q122:D']
    corrections = {
        'Q113': {'minimizes operational overhead and minimizes cost': 'ACM hỗ trợ TLS phía ALB; HTTPS tới backend và mã hóa EBS/RDS vẫn phải cấu hình. Không suy ra mọi chứng chỉ bên thứ ba đều tốn phí.'},
        'Q118': {'access logs for an Application Load Balancer (ALB)': 'ALB hiện hỗ trợ đích log S3 và CloudWatch Logs; phải xác định loại log/đích trước khi chọn Athena hay Logs Insights.'},
        'Q132': {'visibility of potential anomalous behavior': 'Suppression archive finding90ngày, nhưng ngừng chuyển finding khớp tới Security Hub/EventBridge; cần filter hẹp.'},
        'Q133': {'encrypted by an AWS KMS customer managed key': 'Kiểm tra đúng customer managed key; Lambda rule cần kiểm tra key identity, không chỉ SSE-KMS bật.'},
        'Q137': {'No changes or deletions of the logs are allowed': 'Object Lock compliance bảo vệ version đang retention; vẫn có thể tạo version mới hoặc delete marker.'},
        'Q140': {'automatic detection of anomalies in application logs': 'Metric filter biến log thành metric; anomaly detection học baseline số liệu, không tự hiểu mọi nội dung log.'},
        'Q142': {'original client IP address and header information': 'c-ip cho IP viewer; standard logs chỉ có các header/field được hỗ trợ, không mặc nhiên đầy đủ mọi header.'},
    }
    for qid, meanings in corrections.items():
        for k in byid[qid]['keywords']:
            if k['phrase'] in meanings: k['meaning_vi'] = meanings[k['phrase']]
    return items

def archive_sources(items):
    urls = sorted({r['url'] for x in items for r in x['refs']})
    saved, failed = {}, {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(fetch, u): u for u in urls}
        for f in as_completed(futures):
            u = futures[f]
            try:
                sid, meta, text = f.result()
                if meta.get('chars', 0) < 100:
                    raise ValueError('empty/short snapshot')
                saved[u] = {'snapshot_id': sid, 'metadata': meta}
            except Exception as e:
                failed[u] = str(e)
    rebuild_index()
    write(HERE / 'evidence_archive.json', {'archived_at': datetime.now(timezone.utc).isoformat(),
                                         'saved': saved, 'failed': failed,
                                         'note': 'Archive/cache retrieval is separate from the actual web reading recorded by independent reviewers.'})
    print('Primary reference URLs', len(urls), 'archived', len(saved), 'archive failures', len(failed), flush=True)
    return saved, failed

def quote_from_snapshot(sid, claim, url):
    # A short literal excerpt identifies the archived document. The supported claim
    # and option inference are separately recorded, never invented as a quotation.
    text = (TRAINER / 'research/sources/snapshots' / (sid + '.txt')).read_text(encoding='utf-8')
    lines = [s.strip(' #-') for s in text.splitlines()[2:] if len(s.strip()) > 55]
    tokens = set(re.findall(r'[a-zA-Z][a-zA-Z0-9_-]{3,}', claim + ' ' + url.rsplit('/', 1)[-1]))
    def score(s):
        return len(set(re.findall(r'[a-zA-Z][a-zA-Z0-9_-]{3,}', s)) & tokens)
    line = max(lines, key=score) if lines else text.splitlines()[1]
    return ' '.join(line.split()[:10])

def infer_verdict(x, uid, reason, old_verdict):
    override = next((o.get('verdict') for o in x['options'] if o['unit_id'] == uid), None)
    mapped = {'best_choice': 'meets', 'selected': 'meets', 'not_best': 'meets_but_suboptimal',
              'not_meeting': 'does_not_meet', 'does_not_meet': 'does_not_meet',
              'plausible': 'undetermined', 'conditional_meets': 'undetermined',
              'unsupported': 'does_not_meet', 'undetermined': 'undetermined'}
    if x['status'] == 'verified' and uid in selected(x['answer']):
        return 'meets'
    if override in mapped and override not in ('selected', 'best_choice'):
        return mapped[override]
    if re.search(r'^(Sai:|Không chọn:|Không cần|Không phù hợp|Không đáp ứng)', reason):
        return 'does_not_meet'
    if re.search(r'^(Chưa đủ|Chưa chắc|Hợp lệ|Đúng nếu)|cũng hợp lệ|có thể|phù hợp|gần nhất|cần.*bổ sung|chưa chứng minh', reason, re.I):
        return 'undetermined' if x['status'] != 'verified' else 'meets_but_suboptimal'
    return old_verdict if x['status'] == 'verified' else 'undetermined'

def integrate(items, saved):
    changes, counts = [], {}
    for x in items:
        qid = x['question_id']; old = read(HERE / 'before/reviews' / (qid + '.json')); rec = copy.deepcopy(old)
        newrefids, urlids, localids = [], {}, {}
        for i, r in enumerate(x['refs'], 1):
            u = r['url']; prior = next((v for v in rec['references'] if v['url'].rstrip('/') == u.rstrip('/')), None)
            claim = r.get('supported_claim_vi', r.get('supported_claim', r.get('claim', x['reason'])))
            if prior:
                rid = prior['id']
            else:
                rid = f'{qid}-r2-{i}'
                snap = saved.get(u)
                if not snap:
                    # Agent read is recorded, but do not fabricate a quote when archive failed.
                    # Reuse a linked actual r1 reference if the redirected URL matches.
                    raise RuntimeError(f'{qid}: evidence archive missing {u}; repair before merging')
                sid = snap['snapshot_id']; meta = snap['metadata']
                rec['references'].append({'id': rid, 'url': u, 'title': meta['title'] or u.rsplit('/', 1)[-1],
                    'accessed_at': r.get('accessed_at', r.get('access_date', r.get('accessed_on', r.get('access_date', NOW)))),
                    'quote': quote_from_snapshot(sid, claim, u), 'supports': claim, 'kind': 'direct',
                    'snapshot_id': sid, 'page_last_updated': meta.get('page_last_updated'),
                    'evidence_note': 'Document read in independent pass. Short literal excerpt identifies archive; option-specific inference remains in option_reviews.'})
            newrefids.append(rid); urlids[u] = rid
            if r.get('id'): localids[r['id']] = rid
        assert newrefids
        oldopts = {o['unit_id']: o for o in rec['option_reviews']}
        options = []
        for uid, kind in units_of(QMAP[qid]).items():
            if uid not in x['reasons']:
                raise ValueError(f'{qid} missing independent option reason {uid}')
            o = copy.deepcopy(oldopts[uid]); reason = x['reasons'][uid]
            provided = next((p for p in x['options'] if p['unit_id'] == uid), {})
            links = [urlids[u] for u in provided.get('citation_urls', []) if u in urlids]
            links += [localids[u] for u in provided.get('reference_ids', []) if u in localids]
            o.update(reason_vi=reason, verdict=infer_verdict(x, uid, reason, o['verdict']),
                     reference_ids=list(dict.fromkeys(links or newrefids)), evidence_kind='inference')
            if kind == 'prompt' and isinstance(x['answer'], dict):
                o['matched_response_id'] = x['answer'][uid]
            if kind == 'step':
                o.pop('position', None)
                if isinstance(x['answer'], list) and uid in x['answer']:
                    o['position'] = x['answer'].index(uid) + 1
            options.append(o)
        rec['option_reviews'] = options
        issues = x['issues'] if isinstance(x['issues'], list) else ([x['issues']] if x['issues'] else [])
        # Retain literal source/OCR defects and dated availability notes. Earlier
        # interpretations of data/ambiguity are archived in before/, not restated
        # as current facts when this pass contradicts them.
        rec['source_issues'] = [v for v in old['source_issues'] if v['type'] in ('typo', 'layout', 'outdated')]
        for issue in issues:
            if issue and not any(v['detail_vi'] == issue for v in rec['source_issues']):
                rec['source_issues'].append({'type': 'ambiguous' if x['status'] != 'verified' else 'data',
                                           'location': qid, 'detail_vi': issue})
        rec.update(research_version=VERSION, last_reviewed_at=NOW, researched_answer=x['answer'],
                   status=x['status'], explanation_vi=x['explanation'], keywords=x['keywords'], memory_tip_vi=x['tip'])
        rec['notes_vi'] = x['root_adjudication'] or x['reason']
        if qid == 'Q047':
            next(r for r in rec['requirements'] if r['id'] == 'R3')['text_vi'] = 'Khắc phục bucket không tuân thủ được tạo trong tương lai; đề không nói sẽ có account hoặc Region mới.'
        if qid == 'Q133':
            next(r for r in rec['requirements'] if r['id'] == 'R4').update(text_vi='Đề không nêu tiêu chí ưu tiên managed service hoặc ít vận hành; không tự thêm tiêu chí để loại custom Lambda rule.', kind='condition')
        cmp = 'not_comparable' if x['answer'] is None else ('match' if x['answer'] == old['source_answer'] else 'mismatch')
        rec.update(comparison=cmp, differs_from_source=cmp == 'mismatch',
                   confidence={'level': x['confidence'], 'reason_vi': x['root_adjudication'] or x['reason'],
                               'open_issues': issues if x['status'] != 'verified' else []},
                   reconciliation_vi=x['root_adjudication'] or x['reason'])
        rec['independent_reverification'] = {
            'version': VERSION, 'group': x['group'], 'independent_record': f"independent_verify/{x['group']}/independent.json",
            'independent_sha256': x['independent_sha256'], 'comparison_record': f"independent_verify/{x['group']}/comparison.json",
            'comparison_sha256': x['comparison_sha256'], 'independent_answer': x['independent'].get('independent_answer'),
            'independent_status': x['independent']['status'], 'intended_answer': x['intended'],
            'candidate_answers': x['candidates'], 'root_adjudication': x['root_adjudication'],
            'method_note': 'Three agents used answer-free inputs and persisted before reading r1. Root Q109-Q143 had prior aggregate exposure to Q118/Q122/Q133/Q143; not a fully blinded group.'}
        changed = old['status'] != rec['status'] or old['researched_answer'] != rec['researched_answer']
        rec['history'].append({'version': VERSION, 'at': NOW, 'date': NOW,
                               'change': 'Independent re-verification of every option; concise explanations. ' + rec['reconciliation_vi'],
                               'performed_by': f"independent pass {x['group']} + root reconciliation",
                               'previous_status': old['status'], 'previous_answer': old['researched_answer'],
                               'status': rec['status'], 'answer': rec['researched_answer'],
                               'note_vi': rec['reconciliation_vi'], 'technical_change': changed})
        # Freeze preservation checks include the old blind attestation, not just keys.
        for k in ('source_answer', 'question_content_hash', 'blind_record_sha256', 'independent_verdict', 'blind_attestation'):
            if k in old: assert rec[k] == old[k], (qid, k)
        ex = rec['explanation_vi']
        assert len(ex['why_correct'].split()) <= 60, (qid, 'why length')
        assert all(len(v.split()) <= 40 for v in ex['others'].values()), (qid, 'other length')
        assert len(rec['memory_tip_vi'].split()) <= 35, (qid, 'tip length')
        write(TRAINER / 'research/reviews' / (qid + '.json'), rec)
        counts[rec['status']] = counts.get(rec['status'], 0) + 1
        changes.append({'question_id': qid, 'source_answer': rec['source_answer'], 'r1_answer': old['researched_answer'],
                        'r1_status': old['status'], 'independent_answer': rec['independent_reverification']['independent_answer'],
                        'independent_status': rec['independent_reverification']['independent_status'],
                        'r2_answer': rec['researched_answer'], 'r2_status': rec['status'],
                        'changed_answer_or_status': changed, 'root_adjudication': x['root_adjudication'],
                        'reason_vi': rec['reconciliation_vi'], 'reference_urls': [r['url'] for r in x['refs']],
                        'units_reviewed': len(options), 'independent_sha256': x['independent_sha256']})
    errs = {x['question_id']: validate('final', x['question_id']) for x in items}
    errs = {k: v for k, v in errs.items() if v}
    write(HERE / 'comparison_all.json', {'version': VERSION, 'at': NOW, 'counts': counts,
                                         'questions': changes, 'validation_errors': errs})
    with (HERE / 'comparison_all.csv').open('w', encoding='utf-8-sig', newline='') as f:
        fields = list(changes[0]); w = csv.DictWriter(f, fieldnames=fields); w.writeheader()
        for x in changes:
            w.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for k, v in x.items()})
    print('Integrated', len(items), 'questions', sum(x['units_reviewed'] for x in changes), 'units', counts)
    print('Validation errors', json.dumps(errs, ensure_ascii=False))
    if errs: raise SystemExit(1)

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    items = adjudicate(normalize())
    if '--evidence-only' in sys.argv:
        archive_sources(items)
    else:
        evidence = read(HERE / 'evidence_archive.json')
        integrate(items, evidence['saved'])
