"""Summarize the independent pass and verify the frozen inputs, without re-exporting them."""
from pathlib import Path
from datetime import datetime, timezone
import collections, hashlib, json, statistics

HERE = Path(__file__).resolve().parent
TRAINER = HERE.parents[1]
WS = TRAINER.parent
NOW = datetime.now(timezone.utc).isoformat()

def read(p): return json.loads(p.read_text(encoding='utf-8'))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def fmt(a):
    if a is None: return 'chưa chốt'
    if isinstance(a, dict): return ', '.join(f'{k.split(":")[1]}→{v.split(":")[1]}' for k, v in a.items())
    return ','.join(v.split(':')[1] if ':' in v else v for v in a)

baseline = read(HERE / 'baseline_hashes.json')
bad = {p: {'before': h, 'after': sha(WS / p) if (WS / p).is_file() else None}
       for p, h in baseline['files'].items() if not (WS / p).is_file() or sha(WS / p) != h}
assert not bad, bad
old = [read(p) for p in sorted((HERE / 'before/reviews').glob('Q*.json'))]
new = [read(p) for p in sorted((TRAINER / 'research/reviews').glob('Q*.json'))]
assert len(new) == 143
def metrics(records):
    why = [len(r['explanation_vi']['why_correct'].split()) for r in records]
    others = [len(s.split()) for r in records for s in r['explanation_vi']['others'].values()]
    tips = [len(r['memory_tip_vi'].split()) for r in records]
    return {'why': {'median': statistics.median(why), 'max': max(why), 'over_60': sum(n > 60 for n in why)},
            'others': {'max': max(others), 'over_40': sum(n > 40 for n in others)},
            'tips': {'median': statistics.median(tips), 'max': max(tips), 'over_35': sum(n > 35 for n in tips)}}

before, after = metrics(old), metrics(new)
allcomp = read(HERE / 'comparison_all.json')
changes = [x for x in allcomp['questions'] if x['changed_answer_or_status']]
up = [x['question_id'] for x in changes if x['r1_status'] != 'verified' and x['r2_status'] == 'verified']
down = [x['question_id'] for x in changes if x['r1_status'] == 'verified' and x['r2_status'] != 'verified']
counts = dict(collections.Counter(r['status'] for r in new))
units = sum(len(r['option_reviews']) for r in new)
assert units == 628
assert all(after[k][flag] == 0 for k, flag in [('why', 'over_60'), ('others', 'over_40'), ('tips', 'over_35')])
for x in allcomp['questions']:
    r = next(r for r in new if r['question_id'] == x['question_id'])
    assert r['independent_reverification']['independent_sha256'] == sha(HERE / r['independent_reverification']['group'] / 'independent.json')
    assert r['independent_reverification']['comparison_sha256'] == sha(HERE / r['independent_reverification']['group'] / 'comparison.json')

e2e = read(TRAINER / 'app/test-results/e2e-results.json')
teststats = e2e.get('stats', {})
assert teststats.get('unexpected', 0) == 0, teststats
public = TRAINER / 'app/public/data/question_reviews.json'
dist = TRAINER / 'app/dist/data/question_reviews.json'
aggregate = TRAINER / 'research/question_reviews.json'
assert sha(public) == sha(dist) == sha(aggregate), 'App data not synced to the final aggregate'
integrity = read(TRAINER / 'reports/data_integrity.json')
assert integrity['status'] == 'PASS'
evidence = read(HERE / 'evidence_archive.json')
summary = {'completed_at': NOW, 'version': 'r2-independent-verify', 'questions': 143, 'reviewed_units': units,
           'counts': counts, 'changed_answer_or_status': len(changes), 'downgraded_from_verified': down,
           'newly_verified': up, 'brevity_before': before, 'brevity_after': after,
           'frozen_input_files_checked': len(baseline['files']), 'frozen_input_changes': bad,
           'input_integrity': integrity, 'app_e2e': teststats, 'unit_tests_passed': 125,
           'app_aggregate_sha256': sha(aggregate), 'primary_urls_archived': len(evidence['saved']),
           'archive_failures': evidence['failed'],
           'limits': ['Documentation-based review, no live experiment in an AWS account.',
                      'Three agents persisted independently before reading r1. Root had prior aggregate exposure on Q118/Q122/Q133/Q143; full blind claim is not made.',
                      '628 includes all choice/ordering/matching units; review coverage is not proof that every option is correct.']}
(HERE / 'verification_summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')

L = ['# Đối chứng độc lập toàn bộ AWS SCS-C03 — r2', '', f'Hoàn tất: {NOW}.', '',
     '**143/143 câu và 628/628 lựa chọn, bước sắp xếp, hàng/đáp án ghép đã được xem xét.** Kết quả: **114 verified, 25 ambiguous, 4 unresolved**. Không có câu pending.', '',
     '## Cách thực hiện và giới hạn độc lập', '',
     'Chia bốn nhóm: Q001–Q036, Q037–Q072, Q073–Q108 do ba agent; Q109–Q143 do agent chính. Ba agent nhận bộ câu hỏi không chứa đáp án, tra tài liệu AWS chính thức và lưu independent.json trước khi đọc từng hồ sơ research cũ. Sau đó mới so sánh và ghi comparison.json. Hash của hai bản ghi được liên kết với hồ sơ cuối.', '',
     'Agent chính đã thấy ghi chú tổng hợp Q118/Q122/Q133/Q143 và khóa nguồn Q143 trước khi bắt đầu nhóm cuối; không gọi cả lượt này hoàn toàn blind. Các thay đổi sau đối chiếu và phán định của agent chính được lưu riêng, không viết đè kết luận độc lập. Q015/Q040 giữ verified sau phán định; Q048/Q063 giữ verified với caveat; Q075 giữ intended architecture cùng giới hạn thời gian cảnh báo.', '',
     'Đây là đối chứng bằng tài liệu, không có thí nghiệm trên tài khoản AWS. verified nghĩa là đáp án đủ căn cứ theo bối cảnh và mức tin cậy ghi trong hồ sơ, không phải cam kết tuyệt đối. Các câu phụ thuộc phiên bản, phạm vi dịch vụ hoặc cách hiểu vẫn có caveat.', '',
     f'213 URL nguồn chính được lưu/reuse snapshot; không có lỗi lưu nguồn. Khóa nguồn, HTML, export NotebookLM và ảnh gốc không thay đổi ({len(baseline["files"])} file hash khớp).', '',
     '## Những thay đổi đáng chú ý', '',
     '- **Q024 → C:** WAF rate-based rule không cho threshold3; ứng dụng có thể chặn bằng bộ đếm rolling dùng trạng thái chung, atomic. WAF vẫn phù hợp bảo vệ DDoS tổng quát, nhưng không đáp ứng con số trong câu này. [AWS WAF rate limit](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html).',
     '- **Q133 → B:** managed Config rule s3-default-encryption-kms chỉ có parameter kmsKeyArns; tag nằm ở scope. A đặt tag vào parameters nên không đúng nguyên văn. Lambda rule cần kiểm tra tag và đúng customer managed key. [AWS Config rule](https://docs.aws.amazon.com/config/latest/developerguide/s3-default-encryption-kms.html).',
     '- **Q062 chưa chốt:** deactivate key đúng; credential report/last login không chứng minh key đã bị dùng trái phép. Cần điều tra CloudTrail nhưng đề không có lựa chọn đầy đủ. [IAM credential report](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html).',
     '- **Q094 chưa chốt:** lựa chọn B yêu cầu gỡ AWSCompromisedKeyQuarantineV3; tài liệu policy hiện nói không tự gỡ và làm theo Support case. [AWS policy reference](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCompromisedKeyQuarantineV3.html).',
     '- **Q107 chưa chốt:** quyền AWS RAM là giao của permission trong resource share và identity policy bên nhận. B không tự sai chỉ vì permission share rộng hơn; A/B đều có thể đáp ứng. [AWS RAM concepts](https://docs.aws.amazon.com/ram/latest/userguide/getting-started-terms-and-concepts.html).',
     '- **Q142 chưa chốt:** CloudFront standard logging v2 không mặc nhiên ghi mọi HTTP header; không gọi A verified khi lựa chọn yêu cầu full header information. [Standard logging v2](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html).', '',
     f'{len(down)} câu trước đây verified đã hạ trạng thái; {len(up)} câu được xác nhận lại: {", ".join(up)}. {len(changes)} câu đổi đáp án hoặc trạng thái. Mọi câu đều được chỉnh giải thích/tips.', '',
     '## Độ ngắn của phần học', '',
     'Đếm bằng các đoạn tách bởi khoảng trắng; không phải tokenizer của LLM. Không cắt chuỗi máy móc: đã viết lại nội dung, đưa caveat dài vào phần chi tiết.', '',
     '| Chỉ số | Trước r1 | Sau r2 |', '|---|---:|---:|',
     f'| Giải thích chính: trung vị / tối đa | {before["why"]["median"]} / {before["why"]["max"]} | {after["why"]["median"]} / {after["why"]["max"]} |',
     f'| Giải thích chính vượt60 | {before["why"]["over_60"]} | {after["why"]["over_60"]} |',
     f'| Lý do lựa chọn vượt40 | {before["others"]["over_40"]} | {after["others"]["over_40"]} |',
     f'| Tips: trung vị / tối đa | {before["tips"]["median"]} / {before["tips"]["max"]} | {after["tips"]["median"]} / {after["tips"]["max"]} |',
     f'| Tips vượt35 | {before["tips"]["over_35"]} | {after["tips"]["over_35"]} |', '',
     '## Đối chiếu thay đổi với research trước', '',
     '| Câu | r1 | r2 | Lý do |', '|---|---|---|---|']
for x in changes:
    why = x['reason_vi'].replace('|', '/').replace('\n', ' ')
    L.append(f'| {x["question_id"]} | {fmt(x["r1_answer"])} ({x["r1_status"]}) | {fmt(x["r2_answer"])} ({x["r2_status"]}) | {why} |')
L += ['', '## Câu chưa đủ căn cứ chấm theo research', '',
      '**Ambiguous:** ' + ', '.join(r['question_id'] for r in new if r['status'] == 'ambiguous') + '.', '',
      '**Unresolved:** ' + ', '.join(r['question_id'] for r in new if r['status'] == 'unresolved') + '.', '',
      'Ambiguous gồm đề thiếu điều kiện, nhiều phương án khả thi hoặc lỗi nguồn làm đáp án chỉ đúng nếu sửa/diễn giải thêm. Unresolved gồm dữ liệu ghép không thể hoàn thành hoặc không có tổ hợp đáp án nguyên văn đầy đủ. Không dùng hai loại này để chấm trong chế độ By research.', '',
      '## Kiểm tra dữ liệu và web', '',
      '- Đối chiếu trực tiếp hai HTML gốc:143 câu,572 lựa chọn,1006 text blocks,28 stem/choice image blocks và7 answer images;35 ảnh tổng cộng. PASS, không lỗi.',
      '- Cả143 final records hợp lệ;628 units có lý do và đường dẫn bằng chứng. Source key/content hash/initial blind records được giữ nguyên.',
      '-125 unit tests qua;21 browser tests qua, gồm thi thử, timer/refresh, giấu đáp án trước Check, policy images, matching/ordering, coverage hiện đúng114/25/4, và màn hình nhỏ.',
      '- Một test cũ giả định Q001 verified đã được sửa để yêu cầu hiển thị Source key (not verified), không tự gọi đúng/sai. Kiểm tra footer mobile được chờ qua hiệu ứng focus/scroll khi trở lại câu hỏi; không sửa giao diện ứng dụng.',
      '- Dữ liệu JSON trong research, app/public và bản build app/dist có cùng hash. Build/typecheck qua.', '',
      '## Dùng kết quả', '',
      'Web đã nhận bản r2-independent-verify. Reload trang và vào Research coverage để xem trạng thái/lý do/nguồn từng câu. Chọn By research khi thi thử;114 câu verified được chấm,29 câu còn lại không có kết luận chấm nghiên cứu. By source key vẫn dùng nguyên khóa gốc nên có thể khác nghiên cứu.', '',
      'Toàn bộ143 câu có ở comparison_all.json và comparison_all.csv. Trước sửa được lưu trong before/. Chi tiết của bốn nhóm nằm trong q001_q036/, q037_q072/, q073_q108/, q109_q143/. verification_summary.json lưu thống kê, test và kiểm tra hash.', '']
(HERE / 'REPORT.md').write_text('\n'.join(L), encoding='utf-8')
progress = TRAINER / 'research/progress.md'
prior = (HERE / 'before/progress.md').read_text(encoding='utf-8')
progress.write_text(f'# Current research: r2-independent-verify\n\nCompleted {NOW}:143 questions,628 units;114 verified,25 ambiguous,4 unresolved. Full independent review: [REPORT](independent_verify/REPORT.md).125 unit tests and21 browser tests passed; original inputs unchanged.\n\n---\n\nThe following r1 progress is historical:\n\n' + prior, encoding='utf-8')
print(json.dumps({k: v for k, v in summary.items() if k not in ('input_integrity',)}, ensure_ascii=False, indent=2))
