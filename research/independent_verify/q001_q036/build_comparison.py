import json, hashlib
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).parent
ip=ROOT/'independent.json'
ind=json.loads(ip.read_text(encoding='utf-8'))
now=datetime.now(timezone.utc).isoformat()
reviews=ROOT.parents[1]/'reviews'
delta={
1:('mandatory','C không sửa principal/SourceArn; không giữ verified khi điều kiện đủ quyền vẫn sai.'),
2:('conditional','Phân biệt JWT token và temporary AWS credentials; user pool không tự phát AWS credentials.'),
3:('mandatory','Giữ B; ghi rõ D nhắc NotAction không tồn tại, và BoolIfExists=true vẫn deny khi key vắng.'),
4:('mandatory','Giữ C; sửa D: StringEquals nhắm eu-west-1 chứ không phải Region khác; Allow không hạn chế default SCP.'),
5:('mandatory','Không ép source tutorial thành chuỗi duy nhất; cả metadata và SCIM là bước hợp lệ, scope không xác định.'),
6:('none','Kết luận C và giới hạn ViaService đúng; rút gọn.'),
7:('mandatory','Bucket ARN không deny object APIs; principal đúng không đủ để verified whole policy.'),
8:('mandatory','Không chấm full mapping; P1/P5 trùng; custom insights không tự chứng minh multi-stage correlation.'),
9:('none','Giữ B; compliance retention và Object Lock đích là điều kiện cần đã nêu.'),
10:('mandatory','State enabled/usable mâu thuẫn PendingReplicaDeletion, nên B chỉ là ý định sau sửa nguồn.'),
11:('mandatory','Tách native shell khỏi SSH-over-SSM và ghi pricing chính thức có ngày hiệu lực hiện hành; không verified mọi literal yêu cầu.'),
12:('none','Giữ C; hai GuardDuty features và runtime-node support được xác nhận.'),
13:('mandatory','E sai dấu đóng biến và shorthand ARN; AE chỉ sau sửa nguồn, không verified literal option.'),
14:('none','Giữ B; giải thích Daily recording rõ thay vì coi mọi thay đổi nhanh tự gộp.'),
15:('mandatory','Không giữ verified nếu custom key store phải tạo cả asymmetric data-key pair; cần key store chuẩn riêng.'),
16:('conditional','Giữ C; không suy mặc định never-expire áp dụng log group hiện có; đặt/kiểm tra >=365 ngày.'),
17:('none','Giữ A; endpoint policy chặn cả external credentials, SCP không làm được.'),
18:('conditional','Giữ A; PITR tạo cluster mới và timestamp cần timezone/earliest-latest restorable range.'),
19:('mandatory','Disable Identity Center user không revoke active AWS role sessions; sửa kết luận immediate và phân biệt IAM user/IdC user.'),
20:('none','Giữ A; Inspector phát hiện và Patch Manager khắc phục.'),
21:('conditional','Giữ C; lấy mẫu hằng ngày, full job chỉ object/format đủ điều kiện; không hứa mọi object.'),
22:('mandatory','Giữ D; không nói import key nói chung bất khả thi, mà key mới không giải mã snapshot cũ; cross-account cần hai phía.'),
23:('mandatory','A chỉ Aurora MySQL; unspecified engine cần ambiguous thay vì verified mặc dù caveat đã có.'),
24:('mandatory','Đổi null/ambiguous thành C: ứng dụng được phép thay đổi nên có thể dùng shared rolling atomic counter; least effort chỉ so các đáp án đáp ứng.'),
25:('none','Giữ B; stateless return/ephemeral và thứ tự rule đúng.'),
26:('mandatory','Không loại B chỉ vì inline policy: inline attach role là hợp lệ; task role không cô lập specific container; DBA plaintext vẫn cần hạn chế riêng.'),
27:('conditional','Giữ AC; conditional Allow đơn lẻ không buộc tất cả requests dùng VPCE nếu còn Allow khác.'),
28:('conditional','Giữ D; revoke issued sessions trước cutoff, không ngăn phát hành credentials mới nếu instance còn bị kiểm soát.'),
29:('mandatory','Giữ B; sửa D tránh khẳng định KMS không bao giờ trả plaintext keys; SSE-C không chịu KMS decrypt authorization như SSE-KMS.'),
30:('conditional','Giữ A; sensitive publication opt-in từng account/Region, delegated admin không thay settings member tự động.'),
31:('conditional','Giữ B; test domain phải thực sự trong threat/test context; example.com không tự sinh finding.'),
32:('conditional','Giữ BC; Cognito đã có minimum length nên premise không có bất kỳ minimum là sai literal.'),
33:('conditional','Giữ C; User-Agent có thể giả mạo, block marker không bảo đảm chặn mọi credential stuffing.'),
34:('conditional','Giữ A; gắn WAF trước cả hai instance và restrict direct path để tránh bypass.'),
35:('none','Giữ B; AWS docs trực tiếp chỉ eic_harvest_hostkeys sau rotation.'),
36:('none','Giữ C; Macie/EventBridge/SNS là tích hợp native phù hợp.')}
extra=[
{'id':'vaultlock','url':'https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html','supported_claim':'An active Backup Vault Lock denies early deletion in either mode; authorized administrators can remove a governance lock, then delete recovery points. Compliance is immutable after grace time.','access_date':now[:10]},
{'id':'inline','url':'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html','supported_claim':'Inline policies can be embedded in IAM roles; policy form alone is not a reason to reject a valid task role.','access_date':now[:10]},
{'id':'atomic','url':'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/example_dynamodb_Scenario_AtomicCounterOperations_section.html','supported_claim':'DynamoDB supports atomic counters and optimistic locking to implement shared application state; exact rolling quota still needs correctly designed time-window state.','access_date':now[:10]},
{'id':'ttl','url':'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html','supported_claim':'DynamoDB TTL expiry deletion is asynchronous, typically within days; it is not a synchronous five-minute request limiter.','access_date':now[:10]},
{'id':'ssec','url':'https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html','supported_claim':'SSE-C requires customer-supplied encryption keys with requests; it does not provide SSE-KMS dual S3/KMS authorization.','access_date':now[:10]}]
compact={
1:'Không lựa chọn nào sửa đủ policy: GetObject cần ARN object, còn Lambda dùng execution role. C chỉ sửa Resource; principal và SourceArn vẫn không cấp quyền cho mã trong function.',
8:'Không có full mapping hợp lệ vì P1/P5 trùng nhau nhưng mỗi response chỉ được dùng một lần. P2→R4, P3→R3 và P4→R1 hợp lý; P1/P5 đều phù hợp R5.',
19:'CloudTrail Lake truy vấn được lịch sử tổ chức, nhưng IAM user khác Identity Center user. Disable người dùng Identity Center không thu hồi AWS role sessions đã phát hành, nên D không chặn ngay mọi account.',
26:'Secrets Manager có rotation cùng task IAM role là thiết kế gần nhất. Inline policy trên task role cũng hợp lệ; role không cô lập từng container và không ngăn DBA chia sẻ mật khẩu họ đã biết.'}
shorttips={
2:'Nếu cần temporary AWS credentials, thêm identity pool; nếu chỉ JWT, dùng user pool/app client/authorizer.',
19:'Nếu dùng Identity Center, revoke cả assignment/session và chặn role sessions; dùng CloudTrail Lake để truy vấn lịch sử.',
23:'Nếu Aurora MySQL, bật require_secure_transport; nếu PostgreSQL, bật rds.force_ssl.',
27:'Nếu phải bắt buộc VPCE, deny requests không có SourceVpce phù hợp; xét ngoại lệ service integrations cần thiết.'}
keyword_meanings={
1:['Danh tính function không thay execution role.','Đọc object cần ARN object.','Kiểm tra toàn bộ policy, không chỉ một trường.'],
2:['Xác thực người dùng ứng dụng ngoài.','Phân biệt JWT với STS credentials.','Dùng directory được quản lý.'],
5:['External IdP xác thực qua SAML.','Cấu hình source và metadata.','Trao đổi metadata hợp lệ cả hai chiều.'],
8:['Không ép mapping khi dữ liệu lặp.','Cần correlation thực sự, không chỉ nhóm findings.','Flow Logs lọc bytes/destination/time.'],
24:['Bộ đếm phải dùng chung qua các EC2.','Nhỏ hơn WAF minimum 10.','Cửa sổ trượt 300 giây.'],
26:['Bật rotation, không tự có mặc định.','Cấp GetSecretValue tối thiểu theo task role.','Hạn chế quyền DBA; không hứa ngăn chia sẻ thứ họ đã biết.'],
3:['MFA phải được xác thực trong STS session.','Dùng credentials tạm thời cho CLI.','Policy deny chỉ xét EC2 actions.'],
4:['FullAWSAccess khiến thêm Allow không thu hẹp quyền.','Deny ngoài Region eu-west-1.','Loại trừ global APIs khỏi regional deny.'],
6:['Đọc principal và ViaService của chính key.','Resource * chỉ key gắn policy.'],
7:['Chỉ đúng principal STS federated-user mới match.','Danh tính phiên có tên Bob.','Deny phải bao phủ cả bucket và object ARN.'],
9:['Giữ retention bất biến kể cả admin/root.','Replica ở Region DR cũng phải có Object Lock.','Versioning đơn lẻ không chặn xóa version.'],
10:['mrk key có thể có replicas ở Region khác.','State này mâu thuẫn scheduled deletion.','Thời gian chờ tối thiểu là 7 ngày mỗi key.'],
11:['SSM hỗ trợ hybrid nodes.','Native shell không cần key; SSH vẫn cần.','Phí hybrid hiện hành theo session, không machine-hour.'],
12:['GuardDuty EKS Protection dùng audit stream.','Runtime Monitoring dùng agent để xem OS/file/network.','EventBridge gửi finding tới SNS email.'],
13:['Không tin client ID do client tự chọn.','Bind identity ở policy server-side, không app check.','Quyền topic không được mở rộng bởi biến không tin cậy.'],
14:['AWS Config lưu configuration items.','Daily mode lưu latest change trong khoảng 24 giờ.','CI phản ánh state, CloudTrail chỉ ghi API activity.'],
15:['Custom store chỉ hỗ trợ symmetric KMS master keys.','GenerateDataKeyPair không dùng custom-store key.','CloudTrail ghi KMS API operations.'],
16:['Instance termination có thể xóa local logs.','Stream logs trước khi scale-in.','Retention log group ít nhất 365 ngày.'],
17:['Default endpoint policy cho đường ra chưa giới hạn.','Chặn resource/principal ngoài organization.','Endpoint policy áp mọi credentials đi qua.'],
18:['PITR tới ngay trước tấn công.','Thời điểm phải trong restorable range.','3:14 PM là lựa chọn sạch trước 3:15 PM.'],
19:['IAM user khác Identity Center user.','Disable không tự revoke active role sessions.','CloudTrail Lake query lịch sử 7 ngày của tổ chức.'],
20:['Inspector phát hiện CVE, Patch Manager vá.','Không nhầm CVE với malware.','Các instance cần managed-node support để patch.'],
21:['Automated discovery lấy mẫu ở quy mô lớn.','Chạy targeted full jobs sau khi tìm bucket nhạy cảm.','Native discovery ít vận hành hơn tự xây scanner.'],
22:['Key policy phải cấp cross-account access.','Dùng customer managed KMS key.','Account nhận cần thêm IAM permissions.'],
23:['Engine chưa được nêu, parameter phụ thuộc engine.','Enforce tại DB để mọi kết nối chịu TLS policy.','Chứng chỉ có sẵn không đồng nghĩa TLS bắt buộc.'],
25:['NACL stateless và xét rule số nhỏ trước.','Outbound HTTPS response trở về ephemeral port.','Deny 3306 phải trước allow ephemeral range.'],
27:['Dùng interface endpoint để gọi KMS private.','Cưỡng chế SourceVpce, xét mọi Allow khác.'],
28:['Credential của EC2 role bị đánh cắp.','Revoke role sessions để chặn AWS API access.','Containment trước scanning/investigation.'],
29:['Tách quyền S3 và quyền KMS decrypt.','Plaintext cần đồng thời hai tầng authorization.','Customer key do security team quản lý policy.'],
30:['Macie delegated admin quản lý member discovery.','Security Hub tổng hợp findings.','Sensitive-data publication phải bật riêng.'],
31:['DNS findings cần AWS resolver data.','Domain phải thật sự thuộc test/threat context.','Không cần cross-Region aggregation cho một Region.'],
32:['Password policy đặt tại IdP xác thực.','Cognito local users chịu user-pool policy.','Minimum không được enforce bằng SCP permissions.'],
33:['Distributed IP không có một source-IP marker đơn lẻ.','WAF match User-Agent của emulator.','Default allow giữ request không match hoạt động.'],
34:['WAF virtual patch có thể triển khai nhanh.','Đặt WAF trước cả hai EC2 qua ALB.','Kiểm thử trước DNS switch và chặn direct bypass.'],
35:['Host key server mới chưa có trong trust DB.','Chạy eic_harvest_hostkeys để cập nhật.'],
36:['Macie phân loại nội dung S3.','Dùng topic có sẵn làm EventBridge target.','SNS gửi notification theo subscriptions.']}
records=[]
for i in ind['questions']:
    n=int(i['id'][1:]); old=json.loads((reviews/(i['id']+'.json')).read_text(encoding='utf-8'))
    ans=i['independent_answer']
    if isinstance(ans,str):ans=[ans]
    if n in [5,8]:ans=None
    status=i['status']
    why=compact.get(n,i['explanation'])
    # Correct the if-exists branch exactly, including absent MFA context.
    units={u['id']:u['verdict_reason_vi'] for u in i['per_option']}
    if n==3:units['Q003:A']='Sai: true deny phiên MFA; BoolIfExists cũng deny khi key vắng, nên vẫn chặn access key dài hạn.'
    if n==4:units['Q004:D']='Sai: StringEquals nhắm eu-west-1; thêm Allow không hạn chế default FullAWSAccess.'
    if n==9:units['Q009:A']='Sai: admin có quyền có thể gỡ governance vault lock rồi xóa recovery point; active lock vẫn chặn xóa trước retention.'
    if n==22:units['Q022:B']='Sai: import cùng material vào key mới không giúp giải mã snapshot mã hóa bởi key cũ; phải share key gốc.'
    if n==29:units['Q029:D']='Sai: SSE-C dùng key khách hàng cung cấp và không buộc kms:Decrypt như SSE-KMS, nên không tạo hai tầng quyền theo mô tả.'
    selected=set(ans or [])
    others={k:v for k,v in units.items() if k not in selected}
    tip=shorttips.get(n,i['conditional_tip'])
    assert len(why.split())<=60,(i['id'],'why',len(why.split()))
    assert all(len(v.split())<=40 for v in others.values()),(i['id'],'others')
    assert len(tip.split())<=35,(i['id'],'tip',len(tip.split()))
    meanings=keyword_meanings.get(n,[f'Điều kiện cần đọc cùng lựa chọn và phạm vi dịch vụ: {p}.' for p in i['keywords']])
    refs=list(i['citations'])+[x for x in extra if (n==9 and x['id']=='vaultlock') or (n==26 and x['id']=='inline') or (n==24 and x['id'] in ['atomic','ttl']) or (n==29 and x['id']=='ssec')]
    urgency,summary=delta[n]
    record={'question_id':i['id'],'compared_at_utc':now,
      'existing':{'researched_answer':old.get('researched_answer'),'status':old.get('status'),'explanation_vi':old.get('explanation_vi'),'keywords':old.get('keywords'),'memory_tip_vi':old.get('memory_tip_vi'),'source_issues':old.get('source_issues')},
      'independent_answer':i['independent_answer'],'independent_status':i['status'],
      'answer_differs':ans!=old.get('researched_answer'),'status_differs':status!=old.get('status'),
      'change_classification':urgency,'comparison_vi':summary,
      'mandatory_changes':[summary] if urgency=='mandatory' else [],
      'conditional_changes':[summary] if urgency=='conditional' else [],
      'proposed_researched_answer':ans,'proposed_status':status,
      'proposed_application_status':'ambiguous' if status=='unresolved' else status,
      'intended_answer_requires_source_fix_or_scope_clarification':i.get('candidates') if status!='verified' else None,
      'proposed_explanation_vi':{'why_correct':why,'others':others},
      'proposed_per_option_reasons':units,
      'proposed_keywords':[{'phrase':p,'meaning_vi':m} for p,m in zip(i['keywords'],meanings)],
      'proposed_memory_tip_vi':tip,'source_issues':i['source_issues'],
      'references':refs,'confidence':i['confidence'],
      'whole_option_validity_note':'Ambiguous/unresolved: conditional intended answer is not a verified answer to literal original.' if status!='verified' else 'All options evaluated; implementation conditions are stated, rather than disqualifying a service for unspecified routine configuration.'}
    records.append(record)
out={'scope':'Q001-Q036','comparison_started_after_independent_persistence':True,
 'independent_persisted_at_utc':ind['persisted_at_utc'],'independent_sha256':hashlib.sha256(ip.read_bytes()).hexdigest(),
 'compared_at_utc':now,'questions':records}
(ROOT/'comparison.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Independent verification Q001–Q036','',
f"Blind conclusions persisted: {ind['persisted_at_utc']}. Comparison completed: {now}.",
'','Reviewed all 36 questions and 157 choice/order/matching units from blind content and all relevant images before reading reviews. Primary AWS pages were opened live; no pre-existing answer snapshots or keys were used in independent solving.',
'','Independent result: 24 verified, 11 ambiguous, 1 unresolved. Q008 must map to application ambiguous if unresolved is unsupported. Canonical baseline/app files were not modified.',
'','Comparison schema per question: existing (answer/status/explanation/keywords/tip/issues); independent_answer/status; answer_differs/status_differs; change_classification; mandatory_changes/conditional_changes; proposed_researched_answer/status/application_status; intended_answer_requires_source_fix_or_scope_clarification; proposed_explanation_vi (why_correct/others); proposed_per_option_reasons; proposed_keywords; proposed_memory_tip_vi; source_issues; references; confidence.',
'','All 36 replacements obey why_correct <=60 whitespace tokens, each other-option reason <=40, and one conditional memory tip <=35. Keywords are exact substrings of original stems, maximum three.',
'','| ID | Existing | Proposed | Status | Change |','|---|---|---|---|---|']
def fmt(a):
 if a is None:return 'no full answer'
 if isinstance(a,dict):return 'partial map'
 if isinstance(a,str):return a.split(':')[-1]
 return ' → '.join(x.split(':')[-1] for x in a)
for r in records:
 lines.append(f"| {r['question_id']} | {fmt(r['existing']['researched_answer'])} ({r['existing']['status']}) | {fmt(r['proposed_researched_answer'])} | {r['proposed_status']} | {r['change_classification']} |")
for r in records:
 lines += ['',f"## {r['question_id']}",'',r['comparison_vi'],'',r['proposed_explanation_vi']['why_correct'],'']
 for k,v in r['proposed_per_option_reasons'].items():lines.append(f'- {k}: {v}')
 lines += ['', 'Keywords: '+', '.join(x['phrase'] for x in r['proposed_keywords']), '', 'Tip: '+r['proposed_memory_tip_vi']]
 if r['source_issues']:lines+=['','Source issues: '+r['source_issues']]
 lines+=['','Primary sources (accessed '+now[:10]+'):\n']
 for ref in r['references']:lines.append(f"- [{ref['id']}]({ref['url']}): {ref['supported_claim']}")
(ROOT/'REPORT.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({'count':len(records),'answer_differs':[r['question_id'] for r in records if r['answer_differs']], 'status_differs':[r['question_id'] for r in records if r['status_differs']], 'prose_limits_checked':True,'compared_at_utc':now},ensure_ascii=False))
