"""r3 adjudication (main agent, approved by the user 2026-09-30) on top of r2-independent-verify.

Policy: a known source typo or a defect shared by EVERY option is annotated as a source issue; it does not by itself
make the question ungradable when exactly one option (set) is clearly the best (original brief, section 3).
Changes (only these 7 records):
  restore verified (answer = source key, option verdicts = audited r1 verdicts): Q001, Q007, Q013, Q045, Q121
  Q112 -> verified B (C's analysis step is an SSM inventory report, not an image CVE analysis)
  Q024 -> ambiguous, no graded answer (C only works with an unstated shared/atomic counter across a stateless fleet;
          A cannot be set to 3 because the WAF minimum is 10)
Blind records and source keys are never touched. Every change is recorded in `history` + `r3_adjudication`.
"""
from pathlib import Path
from datetime import datetime, timezone
import json, subprocess

TRAINER = Path(__file__).resolve().parents[1]
R = TRAINER / 'research' / 'reviews'
R1 = '8005c8f'

RESTORE = {
    'Q001': dict(
        why='C là thay đổi duy nhất sửa lỗi có tài liệu hỗ trợ: s3:GetObject thao tác trên object nên Resource phải là ARN object (bucket/*). Tiền đề của đề (principal lambda.amazonaws.com + SourceArn) không phản ánh việc function gọi S3 bằng execution role — lỗi này có ở mọi lựa chọn.',
        reason='Đáp án tốt nhất trong các lựa chọn; tiền đề policy của đề không thực tế và là lỗi chung của mọi lựa chọn (ghi ở source_issues).',
        open=['Trong thực tế nên cấp quyền qua execution role (identity policy) hoặc principal là ARN execution role; không lựa chọn nào nêu điều này.'],
        issue_fix={'ambiguous': 'data'}),
    'Q007': dict(
        why='B dùng explicit Deny với principal STS federated user (…:federated-user/Bob) — đúng loại danh tính của Bob; A là Allow, C là IAM user, D là role session. Mọi lựa chọn đều chỉ ghi ARN bucket (thiếu bucket/*), là lỗi chung của nguồn.',
        reason='Đáp án tốt nhất; thiếu ARN object bucket/* là lỗi chung của cả bốn policy (ghi ở source_issues).',
        open=['Để chặn cả thao tác object cần thêm arn:aws:s3:::DOC-EXAMPLE-BUCKET/* vào Resource; không lựa chọn nào có.'],
        issue_fix={'ambiguous': 'data'}),
    'Q013': dict(
        why='A + E: ứng dụng dùng thing name làm client ID, và IoT policy chỉ cho iot:Connect với client/${iot:Connection.Thing.ThingName}, nên thiết bị giả mạo không kết nối được bằng client ID khác. Nguồn gõ ")" thay "}" ở lựa chọn E.',
        reason='Cơ chế có tài liệu trực tiếp; lỗi gõ ")" thay "}" trong E là lỗi nguồn, không đổi ý nghĩa đáp án.',
        open=['Nếu đọc E theo nghĩa đen, chuỗi biến policy không hợp lệ (typo nguồn).'],
        issue_fix={'ambiguous': None}),
    'Q045': dict(
        why='C: tag policy ở chế độ enforce chặn giá trị CostCenter không được duyệt; SCP deny khi request thiếu tag (điều kiện Null) chặn tạo tài nguyên không gắn tag. Nguồn viết sai condition key: đúng là aws:RequestTag/CostCenter.',
        reason='Kiến trúc đúng và duy nhất có tính phòng ngừa; lỗi cú pháp condition key là typo nguồn (A cũng sai tương tự).',
        open=['Tag policy enforcement chỉ áp dụng cho các loại tài nguyên/API được hỗ trợ; SCP với aws:RequestTag chỉ có tác dụng với API hỗ trợ tag-on-create.'],
        issue_fix={'ambiguous': 'data'}),
    'Q121': dict(
        why='B: chạy CloudFormation Guard (cfn-guard) với custom rules trong pipeline trước bước build và báo SNS khi phát hiện vi phạm — kiểm tra standards tự động, không làm chậm delivery. Nguồn gõ nhầm "cm-guard".',
        reason='Cơ chế Guard trong CI/CD có tài liệu trực tiếp; "cm-guard" là lỗi gõ của lệnh cfn-guard.',
        open=['Nếu đọc nguyên văn, lệnh "cm-guard" không tồn tại (typo nguồn).'],
        issue_fix={'ambiguous': None}),
}
Q112 = dict(
    why='B: ECR chỉ cho đặt encryption lúc tạo repository nên phải tạo lại với KMS; ECR image scanning tìm CVE và bước "analyze the scan report" đáp ứng yêu cầu phân tích CVE của image.',
    reason='Yêu cầu là phân tích CVE của container image; chỉ B phân tích scan report. C có bật scanning nhưng bước phân tích là SSM Inventory (liệt kê phần mềm trên host).',
    open=['Phản biện của r2: C cũng bật ECR scanning nên scan vẫn chạy; r3 cho rằng C không mô tả việc phân tích kết quả scan nên không đáp ứng "analyze … for CVEs".'],
    other_C='C có bật ECR scanning nhưng bước phân tích lại là SSM Inventory report (liệt kê phần mềm trên host), không phân tích CVE của image như đề yêu cầu.')
Q024 = dict(
    why='Chưa có kết luận chắc chắn: A (WAF rate-based rule) là cách ít công nhất theo ý đồ đề nhưng WAF chỉ cho ngưỡng tối thiểu 10 request, không đặt được 3. C chỉ đúng nếu bộ đếm dùng chung và cập nhật atomic giữa các EC2 — lựa chọn không nêu, trong khi đề nói ứng dụng stateless chạy trên nhiều instance.',
    reason='Không lựa chọn nào đáp ứng nguyên văn: A vướng ngưỡng tối thiểu 10 của WAF; C cần thành phần (state dùng chung) mà lựa chọn không mô tả.',
    open=['Nếu coi con số 3 chỉ minh họa, A là đáp án ý đồ (khóa nguồn, cộng đồng ExamTopics chọn A).',
          'Nếu cho phép bổ sung bộ đếm dùng chung (vd. DynamoDB atomic counter), C đúng nhưng tốn công nhất.'],
    C_reason='Chỉ đúng có điều kiện: bộ đếm phải dùng chung và atomic giữa các EC2 của ứng dụng stateless; lựa chọn C không nêu điều này.')


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def load(q):
    return json.loads((R / f'{q}.json').read_text(encoding='utf-8'))


def r1(q):
    return json.loads(subprocess.run(['git', 'show', f'{R1}:research/reviews/{q}.json'], capture_output=True, cwd=TRAINER).stdout.decode('utf-8'))


def save(q, rec):
    (R / f'{q}.json').write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding='utf-8')


def answer_units(a):
    return set(a) if isinstance(a, list) else set(a.keys()) | set(a.values())


def restore(q, cfg, other_override=None):
    rec, old = load(q), r1(q)
    prev = {'status': rec['status'], 'answer': rec['researched_answer'], 'confidence': rec['confidence']}
    rec['researched_answer'] = rec['source_answer']
    rec['status'] = 'verified'
    rec['comparison'] = 'match'
    rec['differs_from_source'] = False
    rec['option_reviews'] = old['option_reviews']          # audited r1 verdicts; all their references exist unchanged in r2
    rec['confidence'] = {'level': 'medium', 'reason_vi': cfg['reason'], 'open_issues': cfg['open']}
    ans = answer_units(rec['researched_answer'])
    others = {k: v for k, v in rec['explanation_vi'].get('others', {}).items() if k not in ans}
    for u in rec['option_reviews']:
        if u['unit_id'] not in ans and u['unit_id'] not in others:
            others[u['unit_id']] = u['reason_vi']
    if other_override:
        others.update(other_override)
    rec['explanation_vi'] = {'why_correct': cfg['why'], 'others': others}
    fixed = []
    for s in rec['source_issues']:
        t = cfg.get('issue_fix', {}).get(s['type'], s['type']) if 'issue_fix' in cfg else s['type']
        if t is None:
            continue
        fixed.append(dict(s, type=t))
    rec['source_issues'] = fixed
    finish(q, rec, prev, 'r3: restore verified — ' + cfg['reason'])


def finish(q, rec, prev, change):
    ts = now()
    rec['research_version'] = 'r3'
    rec['r3_adjudication'] = {'date': ts, 'by': 'main agent (approved by user)', 'previous_r2': prev, 'decision': change}
    rec['history'].append({'version': 'r3', 'date': ts, 'change': change, 'previous_answer': prev['answer']})
    rec['last_reviewed_at'] = ts
    save(q, rec)
    print(q, '->', rec['status'], rec['researched_answer'])


def main():
    for q, cfg in RESTORE.items():
        restore(q, cfg)
    restore('Q112', dict(Q112, issue_fix={}), other_override={'Q112:C': Q112['other_C']})
    rec = load('Q024')
    prev = {'status': rec['status'], 'answer': rec['researched_answer'], 'confidence': rec['confidence']}
    rec['status'] = 'ambiguous'
    rec['researched_answer'] = None
    rec['comparison'] = 'not_comparable'
    rec['differs_from_source'] = False
    for o in rec['option_reviews']:
        if o['unit_id'] == 'Q024:C':
            o['verdict'] = 'undetermined'
            o['reason_vi'] = Q024['C_reason']
    rec['confidence'] = {'level': 'medium', 'reason_vi': Q024['reason'], 'open_issues': Q024['open']}
    rec['explanation_vi'] = {'why_correct': Q024['why'], 'others': rec['explanation_vi'].get('others', {})}
    rec['memory_tip_vi'] = 'Nếu hạn mức nhỏ hơn ngưỡng tối thiểu của WAF (10) → WAF không đặt chính xác được; cần bộ đếm dùng chung ở ứng dụng.'
    finish('Q024', rec, prev, 'r3: C verified(high) -> ambiguous — ' + Q024['reason'])


if __name__ == '__main__':
    main()
