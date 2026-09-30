# Kiểm chứng độc lập Q073–Q108

Phạm vi đủ **36/36 câu, 152 lựa chọn/bước và 13 hàng matching**. Đã đọc hình policy/code và hàng ghép; nguồn bằng chứng là trang AWS primary được mở trực tiếp, truy cập ngày 2026-09-30 (61 URL khác nhau).

Independent conclusions được lưu lúc **2026-09-30 21:28:54 UTC**, trước khi đọc reviews hiện tại. Bản blind có 29 verified, 6 ambiguous, 1 unresolved; giữ nguyên bản lịch sử. Sau đối chiếu và nguồn bổ sung: **30 verified, 5 ambiguous, 1 unresolved**; Q082 được giải quyết thành verified, Q075 giữ verified A theo mục tiêu kiến trúc với caveat về email SLA.

Không sửa reviews, app, question bank hoặc output baseline; không chạy export. `proposed_answer=null` nghĩa không có đáp án duy nhất hoàn toàn được hỗ trợ theo chữ đề; `intended_answer` chỉ ghi ý đồ gần nhất.

## Những thay đổi cần ưu tiên

| Câu | Review hiện tại | Đề xuất | Mức thay đổi và lý do |
|---|---|---|---|
| Q075 | A / verified | verified; A | conditional: Giữ kiến trúc A; timing event theo blog2018 hỗ trợ mục tiêu năm phút, không bảo đảm SLA email receipt. |
| Q077 | B / ambiguous | ambiguous; không có key duy nhất | mandatory_answer: Giữ ambiguous và bỏ key duy nhất: preventive không đáp ứng; B là intended remediation. |
| Q084 | A / verified | unresolved; không có key duy nhất | mandatory_status: Không được bỏ hai bước selector sai rồi gọi toàn option verified; eventName trên event data store không tương đương trail, resources.ARN chỉ data events. |
| Q087 | B + E / ambiguous | ambiguous; không có key duy nhất | mandatory_answer: BE và CE đều hợp lệ, Config delegated admin không tự là StackSets delegated admin; không ép chọn BE. |
| Q094 | B / verified | ambiguous; không có key duy nhất | mandatory_status: Managed policy hiện hành ghi không gỡ, làm theo Support case; review paraphrase 'giữ tới remediation rồi gỡ' không được nguồn hỗ trợ. |
| Q095 | C / verified | ambiguous; không có key duy nhất | mandatory_status: Option C dùng một policy scope all Regions không khả thi cho ALBs; caveat không cứu whole-option verified. |
| Q107 | A / verified | ambiguous; không có key duy nhất | mandatory_status: Broad managed share chỉ là trần; identity policies phía nhận có thể loại reads và principals, nên A/B đều viable. |

Q084, Q094, Q095 và Q107 là **bắt buộc sửa status/giải thích**: option sai selector, tự gỡ quarantine, scope Regions hoặc loại bỏ đối thủ IAM hợp lệ không thể được cứu bằng bỏ qua một mệnh đề. Q077 và Q087 vốn đã ambiguous; nên giữ các phương án có điều kiện thay vì trình bày một key chắc chắn.

Q075 khác ở cách hiểu deadline: [blog AWS 2018](https://aws.amazon.com/blogs/security/visualizing-amazon-guardduty-findings/) hỗ trợ new finding event trong năm phút; [guide hiện hành](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html) dùng near-real-time và [SNS SMTP retry](https://docs.aws.amazon.com/sns/latest/dg/sns-message-delivery-retries.html) có thể kéo dài khi endpoint lỗi. Có thể giữ intended A cho mục tiêu kiến trúc, nhưng không nói email receipt có SLA năm phút.

Q082 được giải quyết sau đối chiếu: [SEC04-BP01](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/sec_detect_investigate_events_app_service_logging.html) bao gồm alerting; giữ mapping và ghi rõ các tên là best practices. Q076 phải giữ lưu ý legacy từ 26/03/2026 và bỏ “chặn ngay”; Q079 phải giữ giới hạn Audit Manager từ 30/04/2026. Q104 không được loại D vì environment variables “tĩnh/không mã hóa”; giải pháp runtime decrypt khả thi, chi phí tùy cấu hình.

## Q107: đối thủ B thực sự khả thi

[RAM consuming principals](https://docs.aws.amazon.com/ram/latest/userguide/getting-started-terms-and-concepts.html) yêu cầu quyền được cho phép bởi cả managed share lẫn IAM policy bên nhận. B có thể dùng share read/write, nhưng IAM của approved role chỉ Allow AllocateIpamPoolCidr/ReleaseIpamPoolAllocation trên pool ARN và Deny read actions; principals khác không có Allow hoặc có explicit Deny. Đây là counterexample theo documented evaluation, chưa chạy trong AWS; policy minh họa nằm ở `technical_counterexample` trong comparison.json.

[Blog CMP](https://aws.amazon.com/blogs/security/configure-fine-grained-access-to-your-resources-shared-using-aws-resource-access-manager/) chứng minh A và `aws:PrincipalTag/team` hợp lệ, nhưng ví dụ bổ sung yêu cầu không xem pool details mà stem không nêu. Không suy luận từ share read/write rằng IAM không thể thu hẹp effective permissions.

## Văn bản ngắn thay thế cho mọi câu

Các đoạn đúng ≤60 whitespace tokens; mỗi lựa chọn ≤40; tip ≤35; tối đa ba keywords là cụm nguyên văn trong stem/choices. Với matching, toàn bộ resource options và mỗi hàng đều đã được kiểm tra trong comparison.json.

### Q073 — verified; S1 + S3 + S4

Tạo custom action để có ARN, tạo EventBridge rule khớp ARN và đặt Lambda làm target, rồi chạy action trên finding của EC2 bị nhiễm. [AWS 1](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-custom-actions.html) [AWS 2](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-define-rule.html)

- S1: Chọn bước 1: đăng ký custom action trước để có ARN.
- S2: Không chọn: filter set trong Security Hub không thay thế event pattern của EventBridge.
- S3: Chọn bước 2: rule nối custom action với Lambda.
- S4: Chọn bước 3: finding EC2 xác định host cần cô lập.
- S5: Không chọn: finding security group không xác định trực tiếp host bị nhiễm.

Keywords: `quarantine Amazon EC2 hosts that become infected by malware` — Đối tượng xử lý là EC2 host nghi nhiễm -> chọn custom action trên finding EC2.; `as a custom action in Security Hub` — Custom action = analyst chủ động gửi finding đã chọn tới EventBridge.; `Define a rule in Amazon EventBridge` — Rule chứa ARN custom action, target là Lambda; phải có ARN nên đi sau bước tạo action.

Tip: Nếu analyst cần chạy Lambda trên finding, tạo custom action → EventBridge rule có ARN action và target Lambda → chọn finding EC2 rồi chạy action.

Lưu ý đối chiếu (conditional): Custom action ARN đi vào EventBridge; Lambda là rule target; cross-account Lambda cần assume role.

### Q074 — verified; C

WAF gửi access logs trực tiếp đến S3; Athena đọc bảng có partition projection để phân tích request và dấu hiệu tấn công. [AWS 1](https://docs.aws.amazon.com/athena/latest/ug/create-waf-table-partition-projection.html)

- A: CloudTrail ghi API quản trị WAF, không nhận web request logs theo cách này.
- B: Partition projection cho bảng S3 trong lựa chọn này thuộc Athena, không phải OpenSearch table.
- C: đường WAF logs → S3 → Athena được AWS hướng dẫn.
- D: CloudTrail trail không phải đích của WAF traffic logs.

Keywords: `analyze AWS WAF traffic` — Cần web ACL traffic logs (không phải CloudTrail API log).; `application-layer attacks` — Tấn công tầng 7 -> phân tích nội dung request trong WAF log.

Tip: Nếu cần truy vấn traffic WAF, dùng log S3 với Athena; partition projection là tính năng Athena.

### Q075 — verified; A

A dùng GuardDuty delegated administrator để tập trung threat findings và EventBridge → SNS để gửi email gần thời gian thực. Đây là kiến trúc phù hợp mục tiêu năm phút, không phải bảo đảm SLA email. [AWS 1](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html) [AWS 2](https://aws.amazon.com/blogs/security/visualizing-amazon-guardduty-findings/)

- A: Kiến trúc đúng; deadline email năm phút chưa có bảo đảm hiện hành.
- B: CloudWatch alarm không tự theo dõi GuardDuty findings, và IAM cross-account không thay delegated administration.
- C: Config đánh giá cấu hình, không thay GuardDuty để phát hiện hành vi độc hại.
- D: Inspector tìm lỗ hổng; mô hình agents báo về central console không phải giải pháp threat detection này.

Keywords: `suspicious and potentially malicious activity` — Mô tả đúng chức năng threat detection của GuardDuty.; `centralize security findings into an audit account` — Audit account làm delegated administrator.; `within 5 minutes` — Cần near-real-time delivery; AWS không công bố bảo đảm SLA email năm phút.

Tip: Nếu cần gom threat findings toàn organization, dùng GuardDuty delegated admin → EventBridge → SNS; triển khai từng Region và đừng coi email là SLA năm phút.

Lưu ý đối chiếu (conditional): Giữ A theo mục tiêu kiến trúc; blog AWS2018 hỗ trợ publication event trong năm phút, nhưng không nói SNS email có contractual/end-to-end SLA.

### Q076 — verified; D

D là lựa chọn theo Shield legacy: rate-based rule cộng automatic application-layer mitigation tự giảm thiểu DDoS. Từ 26/03/2026 cần kiểm tra Anti-DDoS AMR và điều kiện dùng tính năng legacy. [AWS 1](https://docs.aws.amazon.com/waf/latest/developerguide/ddos-automatic-app-layer-response.html)

- A: Chỉ bật bảo vệ và alarm chưa bật automatic L7 mitigation.
- B: Proactive SRT engagement cần con người và không đáp ứng no manual effort.
- C: Network Firewall ở origin không tự bảo vệ CloudFront HTTP theo thiết kế nêu.
- D: Đúng theo tính năng legacy: bật automatic L7 mitigation trên CloudFront.

Keywords: `detects and mitigates layer 7 DDoS attacks in real time` — Cần cả phát hiện lẫn giảm thiểu tầng 7 tự động.; `no manual effort` — Loại các option cần con người (SRT, cảnh báo email).

Tip: Nếu bài dùng Shield legacy, chọn automatic L7 mitigation; khi triển khai mới, kiểm tra Anti-DDoS AMR và quyền dùng tính năng legacy.

Lưu ý đối chiếu (mandatory_explanation): Bỏ 'chặn ngay': rate-based rule và Shield có detection/mitigation latency; tính năng legacy bị thay từ 26/03/2026.

### Q077 — ambiguous; không có key duy nhất

Không option nào chặn trước việc tạo rule theo CIDR/port. B chỉ phát hiện rồi xóa bằng Lambda, nên chỉ chọn được nếu đổi yêu cầu thành remediation. [AWS 1](https://aws.amazon.com/blogs/security/can-i-do-that-with-policy-understanding-the-aws-service-authorization-reference/)

- A: Chỉ gửi email sau sự kiện, không ngăn hoặc sửa rule.
- B: Có thể tự xóa rule sau finding, nhưng là remediation sau tạo.
- C: IAM/SCP không có condition keys cho CIDR, port hay protocol của AuthorizeSecurityGroupIngress.
- D: Chặn traffic không ngăn tạo security group rule.

Keywords: `prevent the creation of security group rules` — Đòi kiểm soát ngăn chặn — nhưng SCP không lọc được CIDR/port, các option còn lại chỉ phát hiện/khắc phục.; `needs an automated system` — Loại giải pháp chỉ gửi email (A).; `enabled AWS Security Hub in all member accounts` — Đã có control EC2.13 để sinh finding cho rule SSH mở.

Tip: Nếu đề đòi chặn tạo rule theo CIDR/port, kiểm tra condition keys; phát hiện rồi xóa không đáp ứng preventive.

Lưu ý đối chiếu (mandatory_answer): Giữ ambiguous và bỏ key duy nhất: preventive không đáp ứng; B là intended remediation.

### Q078 — verified; A

Rate-based rule giới hạn nguồn/nhóm request vượt ngưỡng thay vì cấm toàn bộ người dùng của hai quốc gia; cần chọn ngưỡng và aggregation phù hợp. [AWS 1](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-request-limiting.html) [AWS 2](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)

- A: áp dụng rate-based rule cho incoming requests để chỉ xử lý nhóm vượt rate limit.
- B: Chặn cả traffic hợp lệ từ hai nước.
- C: Security group không có geographic match rule.
- D: Security group không hỗ trợ deny rules.

Keywords: `quickly limit the potentially malicious requests` — Giới hạn (rate limit) chứ không chặn toàn bộ.; `does not want to prevent legitimate users` — Loại geo block toàn quốc gia.; `hundreds of IP addresses in two countries` — Quá nhiều IP để chặn tay; rate-based rule tự theo dõi từng IP.

Tip: Nếu cần giảm request quá mức mà giữ người dùng trong quốc gia đó, dùng rate-based rule với ngưỡng phù hợp.

### Q079 — verified; P1→R2, P2→R6, P3→R1

Ghép P1→R2 Audit Manager, P2→R6 internal Access Analyzer, P3→R1 Artifact. Audit Manager thu thập evidence nhưng từ 30/04/2026 bị giới hạn thiết lập mới theo account/Region. [AWS 1](https://docs.aws.amazon.com/audit-manager/latest/userguide/how-evidence-is-collected.html) [AWS 2](https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html)

- R1: Ghép row3: tải báo cáo bảo mật/tuân thủ AWS.
- R2: Ghép row1: thu thập evidence từ CloudTrail, Config, Security Hub.
- R3: Không chọn: gói rules/remediation, không tạo evidence assessment này.
- R4: Không chọn: đánh giá cấu hình, không phân tích đường truy cập IAM.
- R5: Không chọn: điều tra hành vi bảo mật, không tải compliance documents.
- R6: Ghép row2: phân tích IAM principals nội bộ cho supported resources.

Keywords: `security audit` — Chuẩn bị audit: evidence (Audit Manager), phân tích quyền (Access Analyzer), tài liệu AWS (Artifact).; `Select each resource one time or not at all` — 6 resource cho 3 hàng: 3 resource bị bỏ qua.; `internal access analyzers` — Access Analyzer loại internal: ai TRONG account/org truy cập được resource chỉ định.

Tip: Nếu cần audit evidence, dùng Audit Manager trong phạm vi còn được hỗ trợ; quyền nội bộ dùng Access Analyzer, tài liệu AWS dùng Artifact.

Lưu ý đối chiếu (conditional): Maintenance mode từ 30/04/2026 đã được review nêu; phải giữ caveat account/Region mới.

### Q080 — verified; A

Xem failed API trong CloudTrail của Production trước để xác định action, principal và loại deny, rồi đối chiếu IAM role/SCP. [AWS 1](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/determine-root-cause-for-stack-failures.html)

- A: bằng chứng lỗi API hướng dẫn kiểm tra quyền cụ thể.
- B: Gỡ toàn bộ SCP làm mất guardrails trước khi biết nguyên nhân.
- C: Cần kiểm tra sau khi xác định API/principal; chỉ IAM role không giải thích SCP deny.
- D: Đồng nhất SCP với Testing làm đổi chính sách Production mà chưa chẩn đoán.

Keywords: `Different SCPs are attached to each workload OU` — Khác biệt giữa các môi trường là SCP -> nghi SCP chặn API.; `insufficient IAM permissions` — Lỗi access denied: cần xem API nào bị từ chối và bởi loại policy nào.; `FIRST step` — Ưu tiên bước chẩn đoán không xâm lấn trước khi thay đổi cấu hình.

Tip: Nếu CloudFormation thất bại vì quyền, xem API bị từ chối trong CloudTrail trước khi sửa role hoặc SCP.

### Q081 — verified; P1→R2, P2→R1, P3→R4, P4→R3, P5→R5

Ghép P1→R2 conformance packs, P2→R1 aggregator, P3→R4 rules, P4→R3 Systems Manager, P5→R5 User Notifications. Chúng lần lượt gói rules, tập trung dữ liệu, đánh giá, khắc phục và thông báo. [AWS 1](https://docs.aws.amazon.com/config/latest/developerguide/config-concepts.html) [AWS 2](https://docs.aws.amazon.com/config/latest/developerguide/remediation.html)

- R1: Ghép row2: tập trung configuration/compliance nhiều accounts/Regions.
- R2: Ghép row1: triển khai tập hợp rules trong tổ chức.
- R3: Ghép row4: Automation runbook sửa tài nguyên không tuân thủ.
- R4: Ghép row3: so sánh configuration với desired settings.
- R5: Ghép row5: cấu hình notification theo EventBridge events.

Keywords: `across the organization` — Phạm vi organization: organization conformance packs, aggregator cho cả org.; `receive notifications` — Cần kênh thông báo khi resource noncompliant/cấu hình thay đổi.; `Select each AWS Config based solution one time` — Ghép một-một 5 giải pháp cho 5 yêu cầu.

Tip: Nếu ghép Config, nhớ pack=gói rules, aggregator=tập trung, rules=đánh giá, Systems Manager=khắc phục, User Notifications=thông báo.

Lưu ý đối chiếu (conditional): User Notifications cần cấu hình event filter/channel, Config remediation cần role quyền phù hợp.

### Q082 — verified; P1→R3, P2→R2, P3→R4, P4→R5, P5→R1

Ghép P1→R3 deploy programmatically, P2→R2 giảm interactive access, P3→R4 network flow, P4→R5 data in transit, P5→R1 logging. Logging practice bao gồm thiết lập cảnh báo từ log. [AWS 1](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_appsec_deploy_software_programmatically.html) [AWS 2](https://docs.aws.amazon.com/wellarchitected/latest/framework/sec_protect_compute_reduce_manual_management.html)

- R1: Ghép P5: configure logging bao gồm thiết lập cảnh báo từ log, nên không chỉ bật CloudTrail.
- R2: Ghép row2; row1 cũng vi phạm nên trọng tâm/bijection quyết định.
- R3: Ghép row1: bypass deployment pipelines.
- R4: Ghép row3: 0.0.0.0/0 mở toàn bộ ports.
- R5: Ghép row4: HTTP không mã hóa.

Keywords: `primarily violates` — Chọn best practice bị vi phạm CHỦ YẾU khi một phát hiện chạm nhiều mục.; `Select each security pillar design principle one time` — Ghép một-một, dùng loại trừ để phân biệt P1 và P2.; `Well-Architected Framework security pillar` — Các lựa chọn là tên best practice trong Security Pillar.

Tip: Nếu phải ghép một-một, dùng trọng tâm: pipeline, interactive access, network flow, TLS, rồi log và cảnh báo.

Lưu ý đối chiếu (clarification): Bằng chứng bổ sung xác nhận logging practice có alerting, nên giải quyết nghi ngờ blind và giữ mapping; thuật ngữ options là best practices.

### Q083 — verified; B

Bật CloudTrail S3 data events để ghi object API với IAM identity và timestamp dạng JSON; delivery thường khoảng 5 phút. [AWS 1](https://docs.aws.amazon.com/AmazonS3/latest/userguide/logging-with-S3.html)

- A: S3 server logs đến bucket có latency vài giờ và best effort.
- B: structured object API audit có identity và thời điểm.
- C: Config rules không ghi object access requests.
- D: Macie phát hiện dữ liệu nhạy cảm, không phải access logger.

Keywords: `IAM identity that makes the request` — Cần trường userIdentity của CloudTrail.; `structured` — Định dạng JSON (CloudTrail) thay vì text phân tách dấu cách.; `near real time` — CloudTrail data events giao mỗi ~5 phút; server access log vào S3 trễ vài giờ.

Tip: Nếu cần IAM identity và JSON cho object requests, bật CloudTrail S3 data events; thời gian giao log không phải SLA.

Lưu ý đối chiếu (conditional): S3 object access cần data events; khoảng 5 phút không SLA; server access log tới S3 không tương đương CloudWatch delivery mới.

### Q084 — unresolved; không có key duy nhất

A gần đúng kiến trúc nhưng selector management events trên trail không hỗ trợ lọc CreateKey/eventName và key ARN như mô tả. Không option nào hoàn toàn đúng; phải sửa A thành ghi KMS events rồi lọc downstream. [AWS 1](https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_AdvancedEventSelector.html) [AWS 2](https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html) [AWS 3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)

- A: Gần nhất nhưng trail management selector không hỗ trợ các trường lọc CreateKey/key ARN đã nêu.
- B: Application logs có thể bỏ sót thao tác KMS và CloudWatch export không bất biến.
- C: DynamoDB ghi được sửa/xóa và filter key ARN bỏ sót CreateKey trước khi có ARN.
- D: Metrics/dashboard không lưu evidence bất biến của creation/origin/use.

Keywords: `immutable evidence` — Object Lock phải có retention/legal hold; log validation chỉ phát hiện sửa log.; `creation, origin, and use of the KMS key` — CloudTrail ghi CreateKey (có origin) và các thao tác dùng key.; `internal auditors` — Cấp quyền đọc bucket log cho auditor.

Tip: Nếu cần KMS audit bất biến, ghi management events vào S3 có retention Object Lock; lọc API/key downstream thay vì selector không hỗ trợ.

Lưu ý đối chiếu (mandatory_status): Không được bỏ hai bước selector sai rồi gọi toàn option verified; eventName trên event data store không tương đương trail, resources.ARN chỉ data events.

### Q085 — verified; A

OpenSearch Security Analytics phân tích security logs theo detection rules và phát cảnh báo đến SNS notification channel. [AWS 1](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/security-analytics.html) [AWS 2](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/alerting.html)

- A: search + security detectors/rules + SNS channel.
- B: Security Hub xử lý findings, không search raw logs hay tự match logs bằng custom actions.
- C: CloudWatch subscription filters không gửi trực tiếp SNS; phải dùng metric/alarm hoặc processor.
- D: QuickSight không là near-real-time security rule engine với SNS như mô tả.

Keywords: `near real time` — Phân tích log gần thời gian thực - cần công cụ ingest/phân tích liên tục, không phải BI dashboard.; `search the logs` — Cần khả năng tìm kiếm log (search engine như OpenSearch).; `detection rules` — Quy tắc phát hiện mối đe dọa áp lên log - gợi ý Security Analytics (detector + rules) của OpenSearch.

Tip: Nếu cần search security logs và detection alerts, dùng OpenSearch Security Analytics với SNS notification channel.

### Q086 — verified; D

Statement cho account quyền ủy quyền truy cập KMS key qua IAM policies. Users/roles cần IAM Allow phù hợp; account root có quyền trực tiếp theo key policy. [AWS 1](https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html)

- A: Principal bị giới hạn account 111122223333.
- B: Account principal cho phép ủy quyền IAM, không chỉ root user.
- C: Không có điều kiện giới hạn S3.
- D: Đúng cho IAM principals: key policy bật IAM delegation, IAM policy cấp quyền dùng.

Keywords: `AWS KMS key policies` — Key policy là resource policy chính của KMS key; phải cho phép account thì IAM policy mới có hiệu lực.; `What does the statement allow` — Cần diễn giải đúng Principal ':root' = account principal, không phải chỉ root user.

Tip: Nếu KMS Principal là account :root, IAM policies có thể được ủy quyền; users/roles vẫn cần Allow phù hợp.

Lưu ý đối chiếu (mandatory_explanation): Root account principal bật delegation; không nói root user cũng cần identity policy.

### Q087 — ambiguous; không có key duy nhất

B+E và C+E đều khả thi: management account hoặc Config delegated admin triển khai organization conformance pack, còn management account bật Config bằng StackSets auto-deployment. Không đủ dữ kiện chọn duy nhất. [AWS 1](https://docs.aws.amazon.com/config/latest/APIReference/API_PutOrganizationConformancePack.html) [AWS 2](https://docs.aws.amazon.com/config/latest/developerguide/conformance-pack-organization-apis.html)

- A: Có thể làm nếu đăng ký thêm StackSets delegation/auto-deployment; đề chưa cho prerequisite này.
- B: Hợp lệ: Config delegated admin được triển khai organization conformance pack.
- C: Cũng hợp lệ: management account được gọi cùng API.
- D: Config delegation không tự cấp quyền StackSets organization deployment.
- E: Hợp lệ với service-managed StackSets, trusted access và automatic deployment.

Keywords: `delegated administrator for AWS Config` — security-01 được ủy quyền quản lý Config cho organization (rules, conformance packs, aggregator) - theo best practice nên deploy conformance pack từ đây, dù management account cũng làm được.; `all existing and future AWS accounts` — Cần cơ chế tự áp cho account mới: organization conformance pack và StackSets automatic deployment.; `turn on AWS Config automatically during account creation` — Cần StackSets service-managed (automatic deployment) để bật configuration recorder ở account mới.

Tip: Nếu cần Config cho account tương lai, bật recorder bằng StackSets auto-deployment; conformance pack có thể do management hoặc Config delegated admin triển khai.

Lưu ý đối chiếu (mandatory_answer): BE và CE đều hợp lệ, Config delegated admin không tự là StackSets delegated admin; không ép chọn BE.

### Q088 — verified; B

Deny s3:* với Bool aws:SecureTransport=false trên bucket và objects chặn HTTP, buộc TLS khi truyền. [AWS 1](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html)

- A: Deny khi SecureTransport=true sẽ chặn HTTPS.
- B: explicit deny cho kết nối không TLS.
- C: Kiểm tra server-side encryption ở rest, không kiểm tra transit.
- D: SSE header phải là thuật toán chuỗi; boolean true không kiểm tra TLS.

Keywords: `encryption of all Amazon S3 bucket data in transit` — Mã hóa khi truyền = bắt buộc HTTPS/TLS, dùng aws:SecureTransport.; `denies any S3 operations if data is not encrypted` — Effect Deny, Action s3:*, điều kiện aws:SecureTransport = false.

Tip: Nếu cần buộc HTTPS cho S3, Deny aws:SecureTransport=false trên cả bucket ARN và object ARN.

### Q089 — verified; B

Bắt buộc boundary đã định nghĩa khi CreateRole để giới hạn quyền tối đa các role do developer tạo; bảo vệ boundary khỏi sửa/gỡ để tránh leo thang. [AWS 1](https://aws.amazon.com/blogs/security/when-and-where-to-use-iam-permissions-boundaries/)

- A: Standalone account không dùng SCP trong Organizations.
- B: iam:PermissionsBoundary condition ép role dùng permission ceiling.
- C: Access Analyzer và remediation diễn ra sau tạo, không chặn privilege escalation.
- D: So sánh bằng Lambda sau tạo để lại cửa sổ quyền quá rộng.

Keywords: `standalone AWS account` — Không thuộc AWS Organizations - loại SCP.; `maximum set of permissions` — Quyền tối đa cho một IAM entity = permissions boundary.; `prevent the developers from increasing their permissions` — Cần kiểm soát phòng ngừa (preventive), không chỉ phát hiện sau.

Tip: Nếu developer được tạo role, bắt buộc permissions boundary khi CreateRole và bảo vệ boundary khỏi sửa/gỡ.

Lưu ý đối chiếu (conditional): Boundary phải được bắt buộc khi CreateRole, ngăn detach/edit và kiểm soát PassRole.

### Q090 — verified; A

Tạo CloudFormation product trong Service Catalog portfolio, share portfolio qua Organizations và cấp quyền end users để họ tự triển khai S3 theo mẫu chuẩn. [AWS 1](https://docs.aws.amazon.com/servicecatalog/latest/adminguide/catalogs_portfolios_sharing_how-to-share.html) [AWS 2](https://docs.aws.amazon.com/ram/latest/userguide/shareable.html)

- A: Đúng nhưng cần share portfolio với tổ chức/OU và grant principal access trong receiving accounts.
- B: RAM không chia sẻ arbitrary CloudFormation template như loại resource này.
- C: RAM permission cho S3 không biến template thành deployable product.
- D: RAM không chia sẻ S3 bucket/template để người dùng tạo bucket mới.

Keywords: `standardized template` — Template chuẩn đã phê duyệt để tái sử dụng - gợi ý Service Catalog product.; `available to all the AWS accounts` — Phải phân phối cho mọi account trong organization - share portfolio qua AWS Organizations.; `end users can use the template to deploy new S3 buckets` — End users tự launch tài nguyên từ template - đúng mô hình self-service của Service Catalog.

Tip: Nếu cần template chuẩn tự phục vụ nhiều account, tạo Service Catalog product, share portfolio qua Organizations và cấp quyền end users.

Lưu ý đối chiếu (conditional): Option A phải được triển khai với org portfolio sharing/end-user access, không chỉ product/portfolio.

### Q091 — verified; C

Reimport đúng key material cũ vào chính KMS key ban đầu để phục hồi khả năng giải mã data key của EBS. [AWS 1](https://docs.aws.amazon.com/kms/latest/developerguide/importing-keys-import-key-material.html)

- A: Material mới không giải mã ciphertext dùng material đã xóa.
- B: Snapshot mã hóa cùng key vẫn cần key material cũ.
- C: khôi phục material cũ giữ key identity.
- D: Key mới/material mới không thay thế KMS key bảo vệ data key.

Keywords: `key material for the key was deleted` — Key ở trạng thái Pending import; chỉ khôi phục bằng reimport đúng material cũ.; `decrypt the EBS volume's encrypted data key` — Phải làm CHÍNH KMS key đó dùng được lại, không thay bằng key/material khác.

Tip: Nếu imported key material cũ bị xóa, reimport chính material đó vào chính key để giải mã dữ liệu cũ.

Lưu ý đối chiếu (mandatory_explanation): Chỉ material gắn dữ liệu cũ mới khôi phục decrypt; không suy rộng thành KMS imported material không hỗ trợ rotation hiện nay.

### Q092 — verified; B + D

Gắn Deny s3:* cho group với BoolIfExists aws:MultiFactorAuthPresent=false để chặn cả temporary session chưa MFA lẫn long-term credentials không có key. [AWS 1](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html)

- A: Deny từng user tăng maintenance so với group.
- B: group policy tự bao phủ thành viên.
- C: Allow thêm không thu hồi full access đang có.
- D: Deny BoolIfExists=false xử lý cả key vắng mặt.
- E: Bool=false không chặn long-term key thiếu MFA context; snippet còn thiếu dấu hai chấm.

Keywords: `only after the users authenticate with MFA` — Deny khi không có MFA, dùng aws:MultiFactorAuthPresent.; `least maintenance overhead` — Gắn policy một lần vào IAM group thay vì từng user.

Tip: Nếu Deny khi chưa MFA phải bao phủ long-term keys, dùng BoolIfExists=false và gắn policy vào group.

Lưu ý đối chiếu (mandatory_explanation): BoolIfExists bao phủ missing MFA key; option E còn lỗi JSON thiếu colon.

### Q093 — verified; C

Group Cloud phải được assign vào Account A cùng permission set hợp lệ trong IAM Identity Center. [AWS 1](https://docs.aws.amazon.com/singlesignon/latest/userguide/assignusers.html)

- A: Account ở organization root vẫn có thể được assign truy cập.
- B: Nếu group sync chung hỏng thì không chỉ Account A bị thiếu.
- C: account assignment + permission set quyết định truy cập.
- D: Permissions boundary gắn IAM identity, không gắn trực tiếp toàn AWS account.

Keywords: `cannot access an account named Account A` — Chỉ một account lỗi -> kiểm tra assignment của account đó.; `Account A exists in the organization` — Account là thành viên org nhưng vẫn cần assignment group + permission set riêng.

Tip: Nếu group vào được account khác nhưng thiếu Account A, kiểm tra assignment group + permission set của Account A.

### Q094 — ambiguous; không có key duy nhất

B hợp lý ở bước điều tra CloudTrail, xóa tài nguyên trái phép và rotate keys, nhưng tự gỡ quarantine policy không được tài liệu hiện hành hỗ trợ. Phải làm theo hướng dẫn trong Support case. [AWS 1](https://docs.aws.amazon.com/IAM/latest/UserGuide/securing_access-keys.html) [AWS 2](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCompromisedKeyQuarantineV3.html)

- A: Xóa user trước làm gián đoạn và CloudWatch không là nguồn API audit chính.
- B: Gần nhất; chỉ gỡ quarantine nếu Support case hướng dẫn, không mặc định.
- C: Gỡ quarantine trước điều tra/rotate sẽ khôi phục quyền cho credential bị lộ.
- D: CloudWatch logs không thay CloudTrail API history và chỉ rotate impacted key có thể thiếu key/backdoor khác.

Keywords: `compromised access key` — Access key bị lộ: xem CloudTrail, rotate key, xóa tài nguyên trái phép.; `determine the scope of the issue` — Xác định phạm vi = xem CloudTrail (API call do key thực hiện).; `triage and remediate` — Eradication: xóa tài nguyên trái phép, rotate key, sau cùng mới khôi phục trạng thái user.

Tip: Nếu AWS gắn quarantine vì key lộ, điều tra CloudTrail và rotate keys; xử lý quarantine theo Support case.

Lưu ý đối chiếu (mandatory_status): Managed policy hiện hành ghi không gỡ, làm theo Support case; review paraphrase 'giữ tới remediation rồi gỡ' không được nguồn hỗ trợ.

### Q095 — ambiguous; không có key duy nhất

C chọn đúng Firewall Manager nhưng một policy không bao phủ ALB ở mọi Region. Phải sửa thành policy từng Region, bật remediation và có subscription Marketplace phù hợp. [AWS 1](https://docs.aws.amazon.com/waf/latest/developerguide/waf-policies-rule-groups.html) [AWS 2](https://docs.aws.amazon.com/waf/latest/developerguide/create-policy.html)

- A: StackSets cần discovery/update nhiều existing ACL, overhead cao hơn Firewall Manager.
- B: SCP giới hạn API permissions, không chèn rule group vào ACL.
- C: Đúng dịch vụ, nhưng một policy không có scope mọi Regions như câu viết.
- D: Security Hub findings không tự triển khai rule group.

Keywords: `every web ACL that is attached to every ALB` — Cần áp bắt buộc, tự động cho mọi web ACL -> Firewall Manager (có retrofit).; `multiple accounts and multiple AWS Regions` — Quản lý tập trung qua Organizations; Firewall Manager policy theo từng Region.; `LEAST operational overhead` — Dịch vụ tự áp cho resource mới thay vì tự viết/triển khai template.

Tip: Nếu bắt buộc rule group WAF nhiều account/Regions, dùng Firewall Manager policy từng Region, bật remediation và bảo đảm subscription Marketplace.

Lưu ý đối chiếu (mandatory_status): Option C dùng một policy scope all Regions không khả thi cho ALBs; caveat không cứu whole-option verified.

### Q096 — verified; C

Bắt CloudTrail API events ScheduleKeyDeletion (và DisableKey nếu muốn) bằng EventBridge rồi dùng Lambda/SNS báo trước khi waiting period hết. [AWS 1](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/monitor-and-remediate-scheduled-deletion-of-aws-kms-keys.html)

- A: Không cấu hình thời điểm xóa KMS key khi CreateKey; expiration imported material là khác.
- B: DeleteAlias không xóa key.
- C: ScheduleKeyDeletion xảy ra trước việc xóa thực.
- D: SNS policy không là event detector hay có Lambda target như mô tả.

Keywords: `notify the company before a KMS key is deleted` — Bắt ScheduleKeyDeletion (bắt đầu waiting period), không chờ event sau khi xóa.; `integration of AWS CloudTrail with Amazon CloudWatch` — API call KMS được ghi lại để EventBridge/CloudWatch dùng làm tín hiệu.

Tip: Nếu cần báo trước lúc key bị xóa, bắt ScheduleKeyDeletion qua EventBridge; đừng chờ event sau deletion.

### Q097 — verified; C

Tắt source/destination check trên appliance ENI để nó chuyển tiếp gói mà appliance không là nguồn hay đích cuối. [AWS 1](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html)

- A: Không cần vô hiệu network ACL; cấu hình rules phù hợp.
- B: Promiscuous mode không là thiết lập EC2 ENI cần cho routing.
- C: điều kiện bắt buộc cho middlebox forwarding.
- D: Appliance không bắt buộc ở public subnet có IGW.

Keywords: `virtual security appliance deployed inline` — Appliance nằm giữa đường đi của traffic, phải chuyển tiếp gói của máy khác -> tắt source/destination check.; `route the traffic` — Instance làm router/firewall/NAT -> cấu hình ENI cho phép forward.

Tip: Nếu EC2 chuyển tiếp traffic của máy khác, tắt source/destination check trên ENI.

### Q098 — verified; D

Truyền GrantToken do CreateGrant trả về trong Encrypt request để dùng quyền grant ngay trước khi eventual consistency hoàn tất. [AWS 1](https://docs.aws.amazon.com/kms/latest/developerguide/using-grant-token.html)

- A: Retry có thể thành công sau propagation nhưng không đáp ứng dùng ngay.
- B: Token không do người dùng tự tạo rồi đưa vào CreateGrant.
- C: Grant name không phải grant token; tên phục vụ chống tạo trùng.
- D: dùng token thật trả từ CreateGrant.

Keywords: `Immediately after a grant is created` — Cần dùng grant trước khi nó đạt eventual consistency -> grant token.; `AccessDeniedException errors occur occasionally` — Lỗi lẻ tẻ do grant chưa lan truyền hết hệ thống KMS.

Tip: Nếu phải dùng grant ngay sau CreateGrant, truyền GrantToken thực vào Encrypt.

### Q099 — verified; C

S3 Lifecycle transition sau 90 ngày sang Glacier Flexible Retrieval và expiration sau 2 năm; Standard retrieval thường 3–5 giờ. [AWS 1](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html) [AWS 2](https://docs.aws.amazon.com/AmazonS3/latest/userguide/glacier-storage-classes.html)

- A: Data Lifecycle Manager quản lý EBS snapshots/AMIs, không S3 objects.
- B: DLM không quản lý S3 và Deep Archive không đáp ứng vài giờ.
- C: Lifecycle đúng dịch vụ và Flexible Standard retrieval phù hợp.
- D: Deep Archive thường 12 giờ; xóa noncurrent không tự xóa current objects.

Keywords: `available within a few hours` — Truy xuất vài giờ -> Glacier Flexible Retrieval (3–5 giờ), không phải Deep Archive (~12 giờ).; `deleted after 2 years` — Cần Expiration action cho object hiện hành, không chỉ noncurrent version.; `several Amazon S3 buckets` — Vòng đời object S3 -> S3 Lifecycle configuration trên từng bucket (không phải DLM).

Tip: Nếu S3 cần lấy trong vài giờ, dùng Glacier Flexible Retrieval; Lifecycle cần cả transition và expiration.

Lưu ý đối chiếu (conditional): Versioned bucket cần NoncurrentVersionExpiration nếu xóa hoàn toàn sau hai năm; current expiration chỉ tạo delete marker.

### Q100 — verified; D

Deny s3:DeleteBucket bằng SCP ở root/OU áp guardrail tập trung cho principals trong member accounts và dễ mở rộng. [AWS 1](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)

- A: Boundary phải gắn/quản lý từng IAM identity.
- B: Bucket policy phải áp từng bucket.
- C: Tag policies chuẩn hóa tags, không cấm DeleteBucket.
- D: Đúng cho principals member accounts: SCP tập trung permission guardrail.

Keywords: `across the organization` — Phạm vi toàn AWS Organizations -> chính sách tổ chức như SCP gắn ở root.; `MOST scalable` — Một chính sách tập trung thay vì cấu hình từng bucket/từng principal.

Tip: Nếu cần cấm DeleteBucket tập trung cho member accounts, dùng SCP; kiểm tra ngoại lệ management account và service-linked roles.

Lưu ý đối chiếu (conditional): SCP không áp cho management account, external principals hay service-linked roles; định nghĩa any bucket phải có scope.

### Q101 — verified; A

SCP chặn RunInstances khi thiếu environment/asset; tag policy với enforcement kiểm soát giá trị environment được phép. [AWS 1](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html) [AWS 2](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)

- A: SCP yêu cầu presence; tag policy kiểm soát giá trị/case khi enforce ec2:instance.
- B: Tag policy không là API permission condition yêu cầu RunInstances như mô tả.
- C: Config remediation xảy ra sau launch, không phòng ngừa.
- D: Config scope không phải tags độc lập và vẫn là hậu kiểm.

Keywords: `prevents the launch of an EC2 instance unless the required tags are present` — Kiểm soát phòng ngừa lúc tạo -> SCP Deny ec2:RunInstances với điều kiện aws:RequestTag.; `must have a value of Development, Staging, or Production` — Ràng buộc giá trị tag -> tag policy ở chế độ enforced.; `enables AWS Config` — Chi tiết gây nhiễu: Config chỉ phát hiện sau, không ngăn launch.

Tip: Nếu EC2 bắt buộc tags và giá trị, dùng SCP kiểm tra presence cộng tag policy enforced kiểm tra value.

Lưu ý đối chiếu (conditional): Current tag policy có required-tag reporting/IaC behavior; không nói mọi tag policy không bao giờ required tags; SCP presence vẫn phù hợp.

### Q102 — verified; A + C

Geo restriction deny list ở CloudFront chặn các nước không có license; OAC/bucket policy khóa origin S3 để tránh truy cập trực tiếp vòng qua CloudFront. [AWS 1](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html) [AWS 2](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)

- A: chỉ cho distribution qua OAC đọc origin.
- B: DNS geolocation không là deny list bảo mật và có thể bypass.
- C: CloudFront country deny list.
- D: S3 bucket policy không có country condition key.
- E: Restrict Viewer Access yêu cầu signed URLs/cookies, không country deny list.

Keywords: `countries where the company does not have a distribution license` — Chặn theo quốc gia -> CloudFront geo restriction (denylist).; `using Amazon CloudFront to serve the images` — Phải khóa origin S3 cho riêng CloudFront (OAC) để không bị vòng qua.

Tip: Nếu chặn quốc gia tại CloudFront, khóa truy cập trực tiếp S3 bằng OAC để tránh bỏ qua geo restriction.

Lưu ý đối chiếu (mandatory_explanation): OAC không là Principal trong S3 policy: CloudFront service principal + distribution SourceArn.

### Q103 — verified; C

Well-Architected Tool đánh giá workload qua security pillar questions và tạo improvement plan cho rủi ro kiến trúc. [AWS 1](https://docs.aws.amazon.com/wellarchitected/latest/userguide/tutorial.html)

- A: Trusted Advisor kiểm tra selected configurations, không thay workload architecture review.
- B: Macie khám phá sensitive data trong S3, không scan RDS như mô tả.
- C: workload review, security questions và improvement plan.
- D: Inspector tìm vulnerabilities/network exposure, không hoàn chỉnh đánh giá architecture design.

Keywords: `evaluate whether the workload architecture aligns with AWS security best practices` — Đánh giá kiến trúc theo best practices -> Well-Architected review (Security pillar).; `identify potential security risks` — WA Tool xác định high/medium risk issues (HRI/MRI) từ câu trả lời.; `personally identifiable information (PII)` — Bẫy dẫn tới Macie; nhưng yêu cầu là đánh giá kiến trúc, không phải khám phá dữ liệu.

Tip: Nếu đánh giá kiến trúc theo security best practices, dùng Well-Architected Tool; vulnerability/data scanners giải quyết yêu cầu khác.

### Q104 — verified; C

C là lựa chọn mặc định tiết kiệm cho token tĩnh: standard SecureString được KMS mã hóa, Lambda lấy qua SDK với decryption. So sánh chi phí thực còn phụ thuộc throughput, caching và key. [AWS 1](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) [AWS 2](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html)

- A: Đáp ứng chức năng nhưng có phí secret/API và lợi ích rotation không được yêu cầu.
- B: API Gateway authorizer xác thực caller, không lưu/cấp token SaaS cho Lambda.
- C: Đúng trong giả định standard tier/default throughput: KMS-encrypted parameter, runtime SDK retrieval.
- D: Có thể runtime decrypt token đã mã hóa trong environment; chi phí key/API phụ thuộc cấu hình, nên không loại vì environment tĩnh.

Keywords: `encrypt the access token at rest` — Cần kho lưu trữ có mã hóa KMS (SecureString/Secrets Manager).; `pass the token to the Lambda function at runtime` — Lambda lấy giá trị qua SDK khi chạy, không nhúng cứng vào cấu hình.; `MOST cost-effectively` — SecureString standard là default tiết kiệm; chi phí thật phụ thuộc key, volume và caching.

Tip: Nếu token tĩnh nhỏ không cần rotation, SecureString standard là lựa chọn mặc định tiết kiệm; chi phí thực còn phụ thuộc API volume và key.

Lưu ý đối chiếu (mandatory_explanation): D không sai vì environment variables là static/không mã hóa; encrypted environment có thể runtime decrypt, so sánh chi phí phụ thuộc key/request assumptions.

### Q105 — verified; C

IAM Identity Center dùng SAML để authenticate với IdP, SCIM provision users/groups và permission sets/accounts để quản lý workforce truy cập tập trung. [AWS 1](https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-idp.html)

- A: Cognito identity pool/roles management account không provision organizational member access như yêu cầu.
- B: SAML federation không authenticate IAM users; tạo IAM user từng account không là thiết kế tập trung này.
- C: AWS Organizations workforce federation qua Identity Center.
- D: Verified Permissions là application authorization, không cấp IAM role account federation.

Keywords: `central IdP for AWS authentication` — Dùng IdP ngoài làm identity source của IAM Identity Center.; `grant access to the member accounts throughout the organization` — Permission set gán cho user/group trên nhiều account trong Organizations.; `all features enabled` — Điều kiện để dùng IAM Identity Center với Organizations.

Tip: Nếu workforce dùng IdP tập trung vào nhiều AWS accounts, dùng IAM Identity Center với SAML, SCIM và permission sets.

### Q106 — verified; C

Xóa default NAT route trong riêng hai route tables của DB subnets; local VPC route giữ kết nối ứng dụng, route của app không đổi. [AWS 1](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html)

- A: Xóa shared NAT làm gián đoạn app.
- B: NACL không tham chiếu security group ID và NAT gateway không gắn SG.
- C: cắt internet egress của DB subnets nhưng giữ local routes.
- D: Route table không có deny connection rules.

Keywords: `Each subnet in the VPC uses its own unique route table` — Có thể đổi định tuyến của subnet DB mà không ảnh hưởng subnet khác.; `must never be able to connect to the internet` — Bỏ đường ra internet (route 0.0.0.0/0) của subnet DB.; `without disrupting the application servers' network traffic` — Không được động vào NAT gateway/route của subnet app.

Tip: Nếu chỉ DB subnets phải mất internet, bỏ NAT default routes của chúng và giữ local VPC route.

### Q107 — ambiguous; không có key duy nhất

A khả thi nếu chỉ cần write actions và kiểm soát principal tags; B cũng khả thi khi IAM phía nhận giới hạn đúng principals/actions. Đề thiếu yêu cầu chỉ-write hoặc owner-side enforcement để chọn duy nhất. [AWS 1](https://docs.aws.amazon.com/ram/latest/userguide/getting-started-terms-and-concepts.html) [AWS 2](https://docs.aws.amazon.com/ram/latest/userguide/managed-permission-considerations.html)

- A: Khả thi: IPAM pools hỗ trợ custom permissions, write-only actions và condition bằng customer PrincipalTag không bị cấm chung.
- B: Khả thi: IAM bên nhận chỉ cấp các actions/resources cần thiết cho approved principals, nên broad share không tự cấp read access.
- C: Có thể guardrail bằng SCP, nhưng SCP không cấp quyền và tự sửa resource policy ngoài RAM tăng phức tạp.
- D: Full-access permission rộng; VPC endpoint policy không ràng buộc mọi đường gọi public endpoint.

Keywords: `principle of least privilege` — Quyền hiệu lực phải tối thiểu ở cả share và IAM; broad share không đồng nghĩa effective permission rộng.; `only specific IAM principals in the development account` — Giới hạn principal: IAM policy ở account nhận (bắt buộc) và/hoặc condition trong CMP.; `AWS Resource Access Manager (AWS RAM)` — Quyền thực tế = managed permission của share giao với IAM policy bên nhận.

Tip: Nếu chia sẻ RAM tới account, quyền hiệu lực còn giao với IAM bên nhận; đừng loại B chỉ vì share có thêm read actions.

Lưu ý đối chiếu (mandatory_status): Broad managed share chỉ là trần; identity policies phía nhận có thể loại reads và principals, nên A/B đều viable.

### Q108 — verified; A

Role có quyền baseline cho incident types; session policy truyền mỗi AssumeRole chỉ giữ subset cần cho incident đó, độc lập với các session đồng thời. [AWS 1](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)

- A: session permission là giao của role policy và session policy.
- B: Boundary gắn role, không thay đổi độc lập theo mỗi concurrent session.
- C: Session policy không tự cấp quyền vượt role baseline rỗng.
- D: Tạo role mỗi incident tăng vận hành; managed service-role policy không là responder permissions tùy incident.

Keywords: `temporary credentials from AWS STS` — Dùng AssumeRole, có thể truyền session policy cho từng session.; `multiple different types of incidents simultaneously` — Cần nhiều session song song với quyền khác nhau -> theo session, không theo role.; `dynamically assign minimal permissions` — Session policy thu hẹp quyền của role theo từng lần assume.

Tip: Nếu cần quyền khác nhau cho các session song song, truyền session policy từng AssumeRole; role phải có quyền baseline.

## Dữ liệu tích hợp

`independent.json` là blind record bất biến. `comparison.json` có `records[]` gồm canonical `question_id`, `proposed_answer`, `proposed_status`, `intended_answer`, `candidate_answers`; văn bản ở `proposed_explanation_vi.why_correct/others`, `proposed_keywords`, `proposed_memory_tip_vi`. `all_option_verdicts_vi` giữ mọi option, `mapping_reasons_vi` giữ mọi matching row; `source_issues` và `citations` giữ các điều kiện dài và bằng chứng. Timestamps thật từ clock tool; không suy đoán ngày cập nhật từ crawler.

Không có live AWS configuration tests; kết luận là verification theo primary documentation và semantics các policy/API. Completed comparison: 2026-09-30 21:40:51 UTC.
