# Discrepancies & source issues (research_version r1)

Generated 2026-09-30T20:44:03+00:00 by `tools/make_discrepancies.py` from `research/reviews/`, `research/blind/` and `data/keys/source_keys.json`.
Source keys are never modified; this file only reports differences.

## Status counts

| status | questions |
|---|---|
| ambiguous | 8 |
| verified | 135 |

## Source key vs research — every question that differs or cannot be compared

| Q | type | source key | blind verdict | final research | status | confidence | graded by research? | reason (short) |
|---|---|---|---|---|---|---|---|---|
| Q005 | ordering | S6 > S1 > S3 | S6 > S1 > S3 | S6 > S1 > S3 | ambiguous | medium | no | Blind đề xuất ambiguous với cùng chuỗi S6 -> S1 -> S3 như source key. Pass đối chiếu đã đọc lại tutorial Okta (Step 1 lấy metadata IdP, Step 2 cấu hình IdP làm identity source, Step 3 bật automatic provisioning trong IAM Identity Center rồi mới cấu hình ở Okta |
| Q008 | matching | P1→R5, P2→R4, P3→R3, P4→R1, P5→R2 (ungradable) | — | — | ambiguous | medium | no | Source key: P1->R5, P2->R4, P3->R3, P4->R1, P5->R2; blind: không có đáp án đầy đủ (P4->R2 khả năng cao, P5/R1 không ghép được). Ba ghép P1/P2/P3 trùng nhau và được xác nhận (VPC Flow Logs có bytes/dstaddr, metric filter có dimension, CloudTrail Insights so bas |
| Q024 | multiple_choice | A | — | — | ambiguous | medium | no | Blind = null (ambiguous), source key = A. Đã cố tìm cách đọc đề để A đúng: kiểm tra lịch sử ngưỡng WAF – What's New 30/08/2024 hạ tối thiểu từ 100 xuống 10; API WAF Classic cũng tối thiểu 100; tài liệu caveats nói rate limiting 'not intended for precise' – nên |
| Q056 | multiple_choice | C | A | A | verified | medium | yes | Mismatch: blind = A (verified, medium), source = C. Đã tìm cách đọc đề để C đúng: EC2 doc (connection tracking) nói trực tiếp NACL chặn một chiều sẽ cắt kết nối đang có, và trang GuardDuty 'Remediating a potentially compromised EC2 instance' trỏ tới NACL để ch |
| Q077 | multiple_choice | C | B | B | ambiguous | medium | no | Mismatch: blind = B (proposed verified, medium), source = C. Đã tìm cách đọc đề để C đúng: fetch lại Service Authorization Reference cho EC2 (snapshot e09ff3211f53, 30/9/2026) — hành động AuthorizeSecurityGroupIngress chỉ có key ec2:SecurityGroupID/ec2:Vpc/ec2 |
| Q087 | multiple_response | B,E | B,E | B,E | ambiguous | medium | no | Blind và source key cùng chọn B+E. Đã xem xét kỹ phương án C theo yêu cầu: What's New (05/2020) xác nhận có thể deploy Config rules/conformance packs từ delegated member account 'in addition to the master account', và API PutOrganizationConformancePack cho phé |
| Q107 | multiple_choice | B | A | A | verified | high | yes | Blind = A, source key = B (mismatch). Đã tìm lý lẽ cho B: trang Terms and concepts xác nhận principal ở consuming account chỉ làm được những gì vừa được managed permission vừa được IAM identity-based policy do admin account nhận cho phép, và admin phải gắn pol |
| Q118 | multiple_choice | D | D | — | ambiguous | medium | no | Source key = D; blind chọn D nhưng đề xuất ambiguous vì A mới khả thi. Theo bias-guard, chỉ nâng lên verified nếu có bằng chứng trực tiếp mới cho thấy A không đáp ứng. Đã kiểm tra lại: (1) What's New 23/07/2026 (ref6) xác nhận ALB access logs giao tới CloudWat |
| Q122 | multiple_choice | A | A | A | ambiguous | medium | no | Source key = A (Count), trùng đáp án blind; blind đề xuất ambiguous vì tiền đề WAF trên NLB. Theo quy tắc bias-guard, chỉ nâng lên verified nếu có bằng chứng trực tiếp mới cho thấy WAF hỗ trợ NLB. Đã refresh trang 'Resources that you can protect with AWS WAF'  |
| Q133 | multiple_choice | B | A | — | ambiguous | medium | no | Blind = A (verified, medium), source key = B. Đã kiểm tra cả hai phía: (1) trang rule s3-default-encryption-kms chỉ có một tham số tùy chọn kmsKeyArns (ref1) và trang Adding Config Rules định nghĩa parameter là thuộc tính tài nguyên phải tuân theo (ref8), còn  |

## Blind → final changes (bias check)

Questions where the final answer or status differs from the blind (pre-key) verdict. `AUDIT` = moved toward the source key after seeing it.

| Q | blind answer / status | final answer / status | source key | AUDIT flag |
|---|---|---|---|---|
| Q077 | B / verified | B / ambiguous | C |  |
| Q087 | B,E / verified | B,E / ambiguous | B,E |  |
| Q118 | D / ambiguous | — / ambiguous | D |  |
| Q133 | A / verified | — / ambiguous | B |  |

## Medium/low confidence verified questions (graded, but with open issues)

- **Q001** (medium): Trong thực tế, request của function đến S3 được ký bằng credentials của execution role; bucket policy chuẩn nên dùng Principal là ARN của execution role (hoặc chỉ cần identity policy của role nếu cùng account). Không phương án nào nêu điều này; C là thay đổi duy nhất sửa lỗi có tài liệu hỗ trợ.
- **Q002** (medium): S2 cấp credentials tạm thời cho code của microservice gọi AWS API, không xác thực người dùng bên ngoài; nếu hiểu 'temporary credentials' là AWS STS credentials thì có thể tranh luận.; JWT authorizer native ít công sức hơn Lambda authorizer cho token Cognito nhưng không có trong danh sách.
- **Q010** (medium): Theo tài liệu, key đã lên lịch xóa ở trạng thái PendingDeletion hoặc PendingReplicaDeletion đều không dùng được cho cryptographic operations, trái với câu 'still enabled and usable' trong đề.; ARN sai định dạng ('arn:aws;kms'), account ID trong đề (1234156789012) không khớp ARN (123456789012).
- **Q019** (medium): Đề dùng 'IAM user' cho danh tính Identity Center; nếu hiểu theo nghĩa IAM user thật thì không phương án nào chặn được ở mọi account.; Disable user không cắt IAM role session đang tồn tại; kế hoạch thực tế cần thêm bước thu hồi session.
- **Q023** (medium): Nếu cluster là Aurora PostgreSQL thì tham số đúng là rds.force_ssl, không phải require_secure_transport.
- **Q040** (medium): Nếu hiểu attacker chỉ giữ một bộ credential và không còn truy cập instance/lỗ hổng, A cũng chặn được ngay và ít gây gián đoạn hơn; đề không nói rõ, nhưng chi tiết 'development team will require 4 hours to implement and deploy a fix' ngụ ý lỗ hổng vẫn mở.; D chặn cả truy cập hợp lệ vào bucket trong 4 giờ; đề chỉ yêu cầu chặn attacker ngay, không yêu cầu duy trì dịch vụ.
- **Q041** (medium): Mọi giải pháp dựa trên dữ liệu billing đều có độ trễ tới ~24 giờ; không có lựa chọn nào thời gian thực.; A chạy mỗi giờ nhưng không nhận dữ liệu sớm hơn tần suất refresh của Data Exports; về lý thuyết độ trễ dữ liệu của A và B tương đương, khác biệt nằm ở việc B có sẵn ML và alert tức thì.
- **Q047** (medium): Aggregator không có quyền mutating; Lambda thực tế nhận event compliance change (EventBridge) từ từng account/Region hoặc được chuyển tiếp về account trung tâm, và cần role cross-account để sửa bucket.; Remediation native của AWS Config dùng SSM Automation; đề không đưa lựa chọn này.
- **Q049** (medium): Nếu hiểu 'Adjust the configuration and architecture of the workloads' là áp dụng cả cho production thì D có thể tranh luận; văn bản chỉ nói thí nghiệm và report ở development account.; Bằng chứng của B là tài liệu review/mitigation, không phải kiểm thử thực nghiệm; B cũng không nói rõ review workload production (chỉ 'the architecture').
- **Q051** (medium): A chỉ hiệu lực khi FullAWSAccess (hoặc Allow rộng khác) không còn cho phép s3:PutObject; cách phổ biến hơn là SCP Deny có điều kiện.; SCP không áp dụng cho user/role trong management account và principal ngoài organization.; Trước 19/09/2025 SCP Allow không hỗ trợ Condition, khi đó A không thực hiện được và không lựa chọn nào đáp ứng trọn vẹn; kết luận A phụ thuộc hành vi hiện tại.; Allow có điều 
- **Q056** (medium): Tài liệu runbook mô tả bước SG 'all access' tạm thời nhưng không nêu nguyên văn lý do (chuyển kết nối tracked sang untracked); đây vẫn là suy luận có căn cứ.; Trong khoảnh khắc rule 0.0.0.0/0 tồn tại, instance mở cho mọi nguồn (rủi ro ngắn); A chấp nhận điều này theo đúng mô tả 'immediately delete'.
- **Q062** (medium): Câu chữ E ('last logged in') không khớp chính xác trường cần xem (access_key_last_used_date); chỉ đúng khi hiểu rộng là 'lần cuối credential của user được dùng'.; Công cụ điều tra đầy đủ (CloudTrail lọc theo access key ID) không có trong các lựa chọn.
- **Q070** (medium): Runbook AWS-EnableCloudTrail chỉ có tham số TrailName 'của trail mới'; tài liệu không nêu hành vi khi trail cùng tên đã tồn tại (có thể CreateTrail lỗi ở lần khắc phục thứ hai nếu dùng lại cùng tên).; Rule cloudtrail-enabled là periodic nên khôi phục có độ trễ; Config rule/remediation phải triển khai ở từng Region (hoặc qua conformance pack/organization rule).; Trang Prescriptive Guidance 'Automat
- **Q076** (medium): Điều kiện thời gian: từ 26/3/2026, Anti-DDoS Managed Rule Group (AWSManagedRulesAntiDDoSRuleSet) là giải pháp mặc định cho HTTP flood và thay thế L7 Auto Mitigation; khách hàng Shield Advanced hiện hữu vẫn dùng được L7AM, khách hàng mới phải liên hệ AWS Support. AMR không có trong các option nên D vẫn là đáp án tốt nhất trong đề.; Automatic mitigation cần 24 giờ đến 30 ngày để lập baseline traffic
- **Q080** (medium): C là bước troubleshoot hợp lệ theo trang 'Troubleshooting CloudFormation' (Insufficient IAM permissions: review IAM policy); không có tài liệu AWS nêu thứ tự bắt buộc giữa A và C, nên việc chọn A dựa trên chữ FIRST và dữ kiện SCP khác nhau theo OU.
- **Q084** (medium): Với trail, advanced event selector cho management events chỉ hỗ trợ eventCategory, eventSource (chỉ NotEquals kms.amazonaws.com để loại toàn bộ KMS), readOnly; eventName chỉ cho event data store; resources.ARN chỉ cho data events. Bước 'lọc CreateKey' và 'lọc theo key ARN' trong A không làm được; nếu bỏ qua bước lọc, trail ghi toàn bộ KMS events và vẫn đáp ứng mọi yêu cầu, nên A vẫn là phương án d
- **Q095** (medium): Firewall Manager yêu cầu tạo policy riêng cho mỗi Region (trừ CloudFront/Global); không tìm thấy What's New nào bổ sung policy đa Region tính đến 2026-09-30. Cụm 'scope ... all accounts and Regions' ở C chỉ đúng theo nghĩa lặp lại policy cho mỗi Region.; Member account phải có subscription rule group Marketplace thì Firewall Manager mới propagate được (điều kiện chung cho mọi phương án).
- **Q104** (medium): Cách đọc khác của D: chỉ dựa vào mã hóa at rest mặc định của Lambda env var bằng AWS managed key (AWS không tính phí dùng key này) thì D có chi phí gần 0, có thể không đắt hơn C; đề không nói rõ nên tồn tại rủi ro diễn giải.; Lưu lượng GetParameter rất cao có thể cần higher throughput (có phí) và KMS request vượt free tier — đề không nêu.
- **Q111** (medium): A: 'Organizations has applied an IAM policy to the AWS account' không phải loại policy có thật; RCP (từ 11/2024) hỗ trợ KMS và có thể deny theo ARN key, nhưng RCP không phải IAM policy. Theo đúng chữ, chỉ C và D hợp lệ → đúng Choose two.
- **Q114** (medium): A không hoàn toàn vô dụng: CPU cao là dấu hiệu được AWS nêu (ref14) và quyền IAM role giúp đánh giá impact; A thua C vì một vế (MITRE tactic) chỉ là metadata của finding.; Process details chỉ có khi bật GuardDuty Runtime Monitoring; VPC Flow Logs phải do khách hàng bật vì GuardDuty dùng luồng flow log riêng (ref12).
- **Q116** (medium): Trang EBS encryption liệt kê quyền cho user: kms:CreateGrant, kms:Decrypt, kms:DescribeKey, kms:GenerateDataKeyWithoutPlaintext, kms:ReEncrypt; option C chỉ nêu kms:Encrypt và kms:Decrypt nên thực tế có thể phải thêm quyền (đặc biệt CreateGrant).; Nếu key policy là default (cho phép IAM policy trong account) thì sửa IAM policy của role cũng được; nhưng D chỉ cấp kms:DescribeKey nên vẫn không đủ.
- **Q124** (medium): Câu chữ A: identity policy phải được tạo/gắn trong account của IAM user; 'in the AWS account that contains the resources' chỉ đúng nếu hiểu là tài nguyên đích của sts:AssumeRole (tutorial IAM dùng đúng cách diễn đạt này).; SCP của organization chứa IAM user (không phải của organization sở hữu resource) cũng không được deny sts:AssumeRole; RCP của organization sở hữu resource có thể chặn principal 
- **Q137** (medium): A và B chỉ khác ở bên được phép ghi; cách diễn đạt 'allow account to write' không trùng với policy thực tế dùng service principal CloudTrail.
- **Q138** (medium): Nếu bỏ qua yêu cầu 'updates as the incident progresses', A (EventBridge + Lambda + SNS) cũng đóng port, ghi log và thông báo một lần.; C không nói rõ runbook được kích hoạt tự động hay chạy từ OpsItem.
- **Q139** (medium): Trên thực tế nếu trust policy không tin lambda.amazonaws.com thì CreateFunction/UpdateFunctionConfiguration thường bị từ chối và invoke cũng lỗi, nên A ít khả năng là nguyên nhân thực sự khi function đã deploy; chưa có trang doc mô tả rõ hành vi kiểm tra này. A vẫn là bước kiểm tra hợp lệ duy nhất còn lại trong các option.
- **Q142** (medium): 'full header information' trong A vượt quá khả năng thực tế của standard logging v2 (chỉ có một số header cụ thể; toàn bộ header cs-headers chỉ có ở real-time logs).

## Time-dependent / outdated notes

- **Q011** `Q011:B`: Mô hình giá cho hybrid node thay đổi năm 2026 (bỏ Advanced Instances Tier theo giờ, chuyển sang tính theo session); kết luận không đổi.
- **Q019** `Q019:D`: CloudTrail Lake không nhận khách hàng mới từ 31/05/2026; không ảnh hưởng tình huống vì tổ chức đã có organization event data store.
- **Q028** `Q028:stem:1`: Tên finding hiện tại là UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS (hoặc .InsideAWS); đề dùng tên cũ không có hậu tố. Không ảnh hưởng đáp án.
- **Q030** `Q030:A`: 'AWS Security Hub' trong đề nay tương ứng với AWS Security Hub CSPM (dịch vụ Security Hub mới cũng tổng hợp tín hiệu từ Macie); chỉ là đổi tên, không ảnh hưởng đáp án.
- **Q067** `Q067:stem:0`: Tính đến 2026-09-30: Amazon Q Developer (CLI/IDE/console) đã được rebrand thành Kiro; Kiro console là Q Developer console đổi tên với cùng chức năng, và bảng AWS managed applications của IAM Identity Center liệt kê Kiro thay vì Amazon Q Developer. Cơ chế trong đáp án A (IAM Identity Center + managed application QDevProfile-region) vẫn được tài liệu Q Developer mô tả nên đáp án không đổi; chỉ tên sản phẩm có thể khác trên console hiện tại.
- **Q076** `Q076:D`: Từ 26/3/2026, Layer 7 Auto Mitigation của Shield Advanced là legacy, Anti-DDoS AMR là giải pháp mặc định; khách hàng mới cần liên hệ AWS Support để dùng L7AM. Khái niệm option D vẫn đúng.
- **Q079** `Q079:R2`: AWS Audit Manager chuyển sang maintenance mode; từ 30/04/2026 không thể thiết lập dịch vụ cho account mới (khách hàng hiện hữu vẫn dùng được). Chức năng thu thập evidence vẫn đúng như đề mô tả.
- **Q112** `Q112:A`: Phương án A dựa trên Amazon Inspector Classic (agent + assessment + CVE rules package), mô hình đã bị thay bởi Amazon Inspector mới; trang tài liệu Inspector Classic hiện trả 404.
- **Q118** `Q118:A`: Từ 23/07/2026 (What's New) ALB gửi được access logs trực tiếp tới CloudWatch Logs, nên A không còn sai về mặt kỹ thuật; câu single-choice có 2 đáp án khả thi theo hành vi AWS hiện tại. Đáp án nguồn D vẫn đúng và là đáp án duy nhất trước mốc này.

## All recorded source issues (typos, data, layout, ambiguity)

- **Q001** [typo] `Q001:C`: Chuỗi ARN có khoảng trắng thừa 'DOC-EXAMPLE- BUCKET/*' và dấu nháy kết thúc sai (''), ý định rõ là arn:aws:s3:::DOC-EXAMPLE-BUCKET/*.
- **Q001** [data] `Q001:stem:1`: ARN Lambda 'arn:aws:lambda:::function:MyLambdaFunction' thiếu Region và account ID; và thiết kế Principal lambda.amazonaws.com không phản ánh cách Lambda function thực sự gọi S3 (qua execution role).
- **Q002** [layout] `Q002:stem:0`: Đề ghi 'HOTSPOT' nhưng thực chất là dạng chọn và sắp xếp 3 bước.
- **Q003** [typo] `Q003:B`: Ghi '-token-code' (một gạch) thay vì '--token-code'.
- **Q004** [layout] `Q004:C`: Ảnh phương án C bị cắt, thiếu dấu ngoặc '}' đóng cuối policy.
- **Q004** [typo] `Q004:B`: Sid 'DenyNonDefaultRegions' dùng cho statement Allow ở B và D – chỉ là nhãn, gây nhầm.
- **Q005** [typo] `Q005:stem:1`: 'exlemai' là lỗi chính tả của 'external'.
- **Q005** [typo] `Q005:S2`: 'specifics' là lỗi chính tả của 'specifies'.
- **Q005** [ambiguous] `Q005:stem:2`: Quy trình đầy đủ gồm ít nhất 4-5 bước hợp lệ (S6, S5, S1, S3, S4) nhưng chỉ có 3 ô; đề không nói phạm vi (chỉ SAML hay cả SCIM), nên nhiều chuỗi 3 bước có thể bảo vệ được.
- **Q005** [ambiguous] `Q005:stem:2`: AUDIT: 3 ô cho 5 bước hợp lệ; tutorial Okta cho S6->S1->S3, tutorial Entra ID cho S5->S6->S1, các tutorial SCIM (JumpCloud/OneLogin/PingOne/CyberArk) cho (SAML) S1->S3->S4. Đề không nói chọn 3 bước nào.
- **Q006** [typo] `Q006:stem:0`: '(AWS KMS}' dùng sai dấu ngoặc đóng '}'.
- **Q007** [data] `Q007:A`: Mọi phương án chỉ ghi Resource arn:aws:s3:::DOC-EXAMPLE-BUCKET, thiếu arn:aws:s3:::DOC-EXAMPLE-BUCKET/*; policy thực tế sẽ không chặn GetObject/PutObject. Không ảnh hưởng việc chọn principal.
- **Q007** [layout] `Q007:D`: Ký tự Action trong ảnh D bị mờ ('s3:*' đọc không rõ).
- **Q008** [data] `Q008:P5`: Dòng 5 trùng nguyên văn dòng 1 (VPC Flow Logs + Logs Insights); với quy tắc mỗi chiến lược dùng một lần thì không có ghép hợp lệ cho cả 5 dòng. Có lẽ dòng gốc bị mất.
- **Q008** [typo] `Q008:R1`: 'Amazon EC2 distances' — đúng ra là 'Amazon EC2 instances'.
- **Q008** [layout] `Q008:P4`: Trong đề, danh sách response nằm ở stem còn prompt là các dòng trong ảnh; vai trò 'strategy' và 'scenario' bị đảo so với câu hướng dẫn.
- **Q008** [data] `Q008:P4`: Source key ghép P5 (bản sao VPC Flow Logs) -> R2 và P4 -> R1; ghép P5->R2 không thể đúng với văn bản hiện tại, cho thấy dòng 5 gốc (nhiều khả năng là dịch vụ tương quan finding) đã bị thay bằng bản sao dòng 1.
- **Q010** [typo] `Q010:stem:2`: ARN ghi 'arn:aws;kms' (dấu ';' thay ':'); key ID 'mrk-0bb0212cd9864fdea0dcamzo26efb5670' chứa ký tự không phải hex.
- **Q010** [data] `Q010:stem:0`: Account ID 1234156789012 (13 chữ số) không khớp với 123456789012 trong ARN.
- **Q010** [data] `Q010:stem:2`: Đề nói key 'still enabled and usable', nhưng tài liệu hiện tại nói primary key ở PendingReplicaDeletion không dùng được cho cryptographic operations.
- **Q010** [typo] `Q010:C`: 'lo allow' — đúng ra là 'to allow'.
- **Q011** [ambiguous] `Q011:stem:0`: Đề yêu cầu 'use SSH' nhưng lại không muốn quản lý SSH key; Session Manager đáp ứng nhu cầu truy cập shell chứ không phải SSH thuần.
- **Q012** [typo] `Q012:C`: 'Enable Amazon GuardDuty Enable EKS Protection' thiếu dấu chấm giữa hai câu.
- **Q012** [typo] `Q012:A`: 'mailiing' — đúng ra là 'mailing'.
- **Q012** [typo] `Q012:D`: 'lo collect' và 'when now audit logs' — đúng ra là 'to collect', 'when new audit logs'.
- **Q013** [typo] `Q013:stem:0`: 'lo subscribe la specific' là lỗi gõ của 'to subscribe to specific'.
- **Q013** [typo] `Q013:A`: 'conned' là lỗi gõ của 'connect'.
- **Q013** [typo] `Q013:E`: Biến policy viết '${iot:Connection.Thing.ThingName)' dùng ')' thay '}'; nếu hiểu theo nghĩa đen thì biến không hợp lệ.
- **Q015** [data] `Q015:stem:1`: Đề nói dùng data key pair asymmetric, nhưng GenerateDataKeyPair không hỗ trợ KMS key trong custom key store; cần một KMS key khác trong key store chuẩn. Không phân biệt được các lựa chọn vì A/C/D có cùng phần tạo khóa.
- **Q018** [typo] `Q018:A`: 'Regional duster ARN' là lỗi gõ của 'Regional cluster ARN'.
- **Q018** [typo] `Q018:stem:0`: Thiếu dấu chấm sau 'eradicated the attack' và '3:15 PM'.
- **Q019** [typo] `Q019:stem:0`: 'IAM Identify Center' phải là 'IAM Identity Center'.
- **Q019** [typo] `Q019:C`: 'arc assigned' -> 'are assigned'; 'performed m the' -> 'performed in the'.
- **Q019** [ambiguous] `Q019:stem:0`: Đề gọi danh tính là 'IAM user' trong khi truy cập được quản lý bằng IAM Identity Center; lựa chọn D ngầm hiểu đây là người dùng Identity Center.
- **Q022** [typo] `Q022:stem:0`: 'sands' phải là 'sends'.
- **Q022** [typo] `Q022:A`: 'Key Management Sen/ice' phải là 'Key Management Service'.
- **Q023** [ambiguous] `Q023:stem:0`: Không nêu engine Aurora; require_secure_transport chỉ đúng cho Aurora MySQL (PostgreSQL dùng rds.force_ssl).
- **Q024** [data] `Q024:A`: Giới hạn 3 request/5 phút thấp hơn mức tối thiểu của AWS WAF rate-based rule (10 từ 30/08/2024; trước đó 100; WAF Classic 100); đề nhắm tới WAF nhưng con số không cấu hình được.
- **Q024** [ambiguous] `Q024:B`: 'Lambda function based on an Amazon CloudWatch request' không rõ nghĩa.
- **Q026** [typo] `Q026:stem:0`: 'wore stored' nên là 'were stored'.
- **Q027** [typo] `Q027:stem:0`: 'slates' nên là 'states'.
- **Q028** [ambiguous] `Q028:D`: Thao tác thực tế là revoke session của IAM role gắn với instance profile (không phải của chính instance profile); cách diễn đạt hơi lỏng nhưng không đổi đáp án.
- **Q031** [typo] `Q031:stem:2`: Lỗi ngữ pháp 'Why was the finding was not created' (thừa 'was').
- **Q031** [data] `Q031:stem:1`: example.com là domain giữ chỗ, không nằm trong threat list; domain test GuardDuty hướng dẫn là guarddutyc2activityb.com. Cần hiểu example.com là 'domain test sinh finding DNS'.
- **Q033** [typo] `Q033:A`: Thiếu dấu chấm giữa hai câu ('user agent string Add').
- **Q033** [typo] `Q033:C`: Thiếu dấu chấm giữa hai câu ('for the ALB Create').
- **Q034** [data] `Q034:stem:0`: 'Route 53 weighted load balancing' là cách gọi không chuẩn của weighted routing policy; không ảnh hưởng đáp án.
- **Q035** [typo] `Q035:stem:1`: 'do lo resolve' là lỗi đánh máy của 'to resolve'.
- **Q037** [typo] `Q037:stem:0`: 'ousting APIs' là lỗi OCR của 'existing APIs'.
- **Q038** [typo] `Q038:C`: 'application VPAttach' bị dính chữ, đúng là 'application VPC. Attach'.
- **Q038** [typo] `Q038:stem:0`: Thiếu dấu chấm sau 'for database access'.
- **Q039** [typo] `Q039:D`: 'rote' là lỗi của 'role'.
- **Q039** [typo] `Q039:A`: Thiếu dấu chấm sau 'production account'.
- **Q040** [typo] `Q040:stem:0`: Lỗi OCR: 'stares mare' = 'stores more', '(Pit)' = '(PII)'.
- **Q040** [typo] `Q040:stem:3`: 'moot' là lỗi của 'meet'.
- **Q040** [typo] `Q040:C`: 'Amazon Made' là lỗi của 'Amazon Macie'.
- **Q044** [typo] `Q044:stem:0`: "security learn" nên là "security team".
- **Q044** [typo] `Q044:D`: "on promises" nên là "on premises".
- **Q045** [typo] `Q045:A`: "CloudFormatlon" nên là "CloudFormation"; "aws:RequestTagCostCenter" thiếu dấu "/" (aws:RequestTag/CostCenter).
- **Q045** [typo] `Q045:C`: "aws:RequestTag.CostCenter" nên là "aws:RequestTag/CostCenter".
- **Q046** [typo] `Q046:stem:0`: "has learns" nên là "has teams".
- **Q046** [typo] `Q046:D`: "now dedicated account" nên là "new dedicated account".
- **Q048** [ambiguous] `Q048:D`: Lựa chọn D diễn đạt mơ hồ ('EC2 role ... must be set to the destination account role'), không tương ứng cơ chế AWS cụ thể.
- **Q051** [typo] `Q051:A`: 's3-default-encryplion-kms' (đúng: s3-default-encryption-kms), 'identity' (đúng: identify), 'AWS. Config' thừa dấu chấm.
- **Q051** [typo] `Q051:B`: 'server-since encryption' (đúng: server-side encryption), 'AWS. Config' thừa dấu chấm.
- **Q052** [typo] `Q052:B`: 'CryptoCurroncy:EC2/*' (đúng: CryptoCurrency).
- **Q052** [data] `Q052:D`: 'CryptoCurrency:ЕС2/*' chứa ký tự Cyrillic U+0415 'Е' và U+0421 'С' (homoglyph) thay cho 'EC2' Latin.
- **Q054** [ambiguous] `Q054:F`: Cách diễn đạt 'Create user assignments only in the organization’s management account' không rõ nghĩa ('only' đặt sai chỗ); ý đúng theo tài liệu là chỉ gán user (không group) cho management account.
- **Q056** [data] `Q056:C`: Đáp án nguồn C (NACL deny all 0.0.0.0/0 hai chiều trên subnet) chặn cả traffic của forensics team và ảnh hưởng mọi instance trong subnet, mâu thuẫn trực tiếp với yêu cầu 'except for traffic from the company's forensics team' và chi tiết 'A subnet can contain multiple instances'.
- **Q060** [typo] `Q060:B`: Thiếu dấu chấm: 'Specify the IAM role Run an assessment report.'
- **Q062** [ambiguous] `Q062:E`: E nói 'last logged in' (đăng nhập console, password_last_used) trong khi việc cần kiểm tra là access key last used; credential report có cả hai trường.
- **Q062** [typo] `Q062:stem:1`: Câu thiếu dấu chấm cuối; 'user's IAM account' ở B nên là IAM user.
- **Q063** [typo] `Q063:A`: Viết 'S3:Get*', 'S3:List*' thay vì tiền tố action chuẩn 's3:'.
- **Q064** [typo] `Q064:stem:0`: 'Amazon Made' là lỗi gõ của 'Amazon Macie'; dấu chấm sau 'Firewall Manager.' nên là dấu phẩy.
- **Q066** [typo] `Q066:A`: 'Associate the Amazon Cognito function' nên là 'Associate the Lambda function'.
- **Q067** [typo] `Q067:C`: Lựa chọn C thiếu dấu chấm cuối câu.
- **Q070** [data] `Q070:C`: Mô tả 'CloudWatch alarm với event source và event name' là cấu hình của EventBridge rule (tên cũ CloudWatch Events), không phải CloudWatch alarm.
- **Q070** [ambiguous] `Q070:A`: Runbook AWS-EnableCloudTrail tạo trail mới theo TrailName và bật logging cho nó, không gọi StartLogging trên trail đã bị tắt; rule cloudtrail-enabled là periodic và phải triển khai ở từng Region. Đề nói 'turn CloudTrail back on' nên cách hiểu 'khôi phục việc ghi log' vẫn khớp A.
- **Q073** [ambiguous] `Q073:S1`: 'Create a custom action that uses the Lambda function' — custom action không tham chiếu Lambda; Lambda là target của rule EventBridge. Cách diễn đạt lỏng nhưng vẫn chỉ đúng bước tạo custom action.
- **Q074** [typo] `Q074:B`: Thiếu dấu chấm: 'Amazon S3 bucket Configure...' và cuối câu thiếu dấu chấm.
- **Q076** [typo] `Q076:C`: 'in the VPCreate security policies' — thiếu dấu chấm và khoảng trắng giữa 'VPC' và 'Create'.
- **Q077** [ambiguous] `Q077`: Yêu cầu 'prevent the creation' không option nào đáp ứng theo nghĩa chặn trước: SCP không có condition key CIDR/port; B chỉ tự động xóa sau khi tạo. B là lựa chọn khả thi duy nhất.
- **Q077** [data] `Q077:C`: Đáp án nguồn C giả định SCP lọc được security group rule theo CIDR 0.0.0.0/0 và TCP port 22, nhưng Service Authorization Reference cho ec2:AuthorizeSecurityGroupIngress không có condition key nào như vậy.
- **Q078** [typo] `Q078:C`: Thiếu dấu chấm cuối câu.
- **Q080** [typo] `Q080:stem:0`: "Production. Development, and Testing" dùng dấu chấm thay vì dấu phẩy sau Production; không ảnh hưởng nghĩa.
- **Q081** [typo] `Q081:stem:2`: "when any AWS resources does not comply" sai ngữ pháp số ít/số nhiều; không ảnh hưởng nghĩa.
- **Q082** [ambiguous] `Q082:stem:3`: Đề gọi các mục là 'security pillar design principle', nhưng design principles chính thức của Security Pillar là: Implement a strong identity foundation, Maintain traceability, Apply security at all layers, Automate security best practices, Protect data in transit and at rest, Keep people away from data, Prepare for security events. Các lựa chọn thực ra là tên best practice (SEC04-BP01, SEC06-BP03, SEC11-BP06, SEC05-BP02) và tên phần 'Protecting data in transit'. Không ảnh hưởng mapping.
- **Q082** [layout] `Q082:R1`: Danh sách text ghi 'Configure service and application logging' (không dấu chấm) còn dropdown trong ảnh có dấu chấm; ảnh dùng '0–65535' (en-dash) còn prompt dùng '-'. Không ảnh hưởng nghĩa.
- **Q084** [data] `Q084:A`: Phương án A mô tả event selector lọc riêng CreateKey và lọc theo key ARN; với trail, KMS là management events và chỉ lọc được theo eventCategory/eventSource/readOnly (KMS chỉ có thể loại trừ toàn bộ), nên chi tiết này không chính xác về kỹ thuật.
- **Q084** [typo] `Q084:B`: Thiếu dấu chấm: 'Configure an automated export of the log group Send the export to the auditors.'
- **Q086** [typo] `Q086:stem:1`: Trong ảnh, dấu nháy đóng sau 'arn:aws:iam::111122223333:root' là nháy cong (”) thay vì nháy thẳng (") như các chuỗi khác; về cú pháp JSON là không hợp lệ nhưng không đổi ý nghĩa câu hỏi.
- **Q087** [ambiguous] `Q087`: Choose two nhưng có 3 phương án bảo vệ được: E bắt buộc (bật Config cho account mới), còn phần deploy 10 rules thì B (delegated admin security-01) và C (management-01) đều đáp ứng mọi yêu cầu nêu trong đề; đề không có tiêu chí best practice/least privilege để phân định B với C.
- **Q088** [typo] `Q088:C`: Sid 'AllowSSLRequestsOnly' được dùng cho cả policy C và D dù nội dung là điều kiện SSE (không liên quan SSL); không ảnh hưởng tính hợp lệ nhưng gây nhầm.
- **Q089** [typo] `Q089:stem:1`: Cụm 'increasing their permissions to creation of these new resources' có vẻ thiếu/sai từ (ý là 'through creation of'); ý nghĩa vẫn hiểu được.
- **Q092** [typo] `Q092:E`: Điều kiện ở E thiếu dấu ':' giữa "aws:MultiFactorAuthPresent" và false (JSON không hợp lệ). Có thể do lỗi chép đề; kể cả khi sửa, Bool false vẫn không chặn long-term access keys.
- **Q094** [typo] `Q094:D`: "IAM abbess keys" là lỗi chính tả của "IAM access keys".
- **Q095** [ambiguous] `Q095:C`: Policy Firewall Manager cho WAF là theo Region (phải tạo policy riêng cho mỗi Region); cụm 'Set the scope of the policy to all accounts and Regions' không chính xác về kỹ thuật, dù ý định (dùng Firewall Manager) vẫn là phương án tốt nhất.
- **Q101** [typo] `Q101:B`: "Development. Staging, or Production" – dấu chấm thay vì dấu phẩy sau Development.
- **Q101** [typo] `Q101:C`: "Development. Staging, and Production" – dấu chấm thay vì dấu phẩy sau Development.
- **Q104** [typo] `Q104:C`: Cụm 'retrieve the value or the SecureString parameter' có lẽ là lỗi đánh máy của 'value of the SecureString parameter'; không ảnh hưởng nghĩa.
- **Q109** [typo] `Q109:stem:0`: 'MySOL' là lỗi chính tả của 'MySQL'.
- **Q109** [ambiguous] `Q109:stem:5`: Câu hỏi nhắc 'these requirements' nhưng không nêu danh sách yêu cầu cụ thể; yêu cầu phải suy ra từ kiến trúc (ALB công khai, bastion cho admin từ mạng công ty).
- **Q111** [ambiguous] `Q111:A`: 'Organizations has applied an IAM policy to the AWS account' không phải loại policy thật của Organizations (SCP/RCP); wording lai giữa các khái niệm.
- **Q114** [typo] `Q114:stem:0`: 'Indicates' viết hoa giữa câu (lỗi chính tả nhỏ).
- **Q119** [typo] `Q119:C`: 'PostgreSOL' (chữ O) thay vì 'PostgreSQL' (chữ Q).
- **Q120** [typo] `Q120:B`: 'Verity' thay vì 'Verify' (cũng xuất hiện ở C và E).
- **Q121** [typo] `Q121:B`: 'cm-guard' là lỗi chính tả của lệnh 'cfn-guard'.
- **Q121** [typo] `Q121:D`: 'com feted' là lỗi chính tả của 'completed'.
- **Q122** [ambiguous] `Q122:stem:0`: Đề giả định gắn AWS WAF web ACL (rate-based rule) để bảo vệ NLB, nhưng AWS WAF không hỗ trợ associate web ACL với Network Load Balancer; câu hỏi chỉ còn ý nghĩa ở phần chọn action để tìm ngưỡng.
- **Q124** [ambiguous] `Q124:A`: Cụm 'in the AWS account that contains the resources' có thể bị hiểu là tạo identity policy trong account chứa resource (không thể gắn cho IAM user ở account khác); ý đúng là policy cho phép sts:AssumeRole vào role trong account đó.
- **Q125** [ambiguous] `Q125:B`: 'Create an IAM Roles Anywhere trust anchor in the role's trust policy' diễn đạt không chính xác: trust anchor là resource riêng trong Roles Anywhere; trust policy của role tin cậy rolesanywhere.amazonaws.com và có thể tham chiếu ARN trust anchor qua aws:SourceArn. Không làm đổi đáp án.
- **Q125** [typo] `Q125:D`: 'EC2 instance Connect' viết thường chữ 'instance' (tên đúng: EC2 Instance Connect).
- **Q132** [data] `Q132:stem:0`: Danh sách finding type GuardDuty hiện có SSHBruteForce, RDPBruteForce, WinRMBruteForce nhưng không có finding brute force riêng cho FTP; tình huống trong đề là giả định. Không ảnh hưởng đáp án vì cách xử lý false positive (suppression rule) giống nhau.
- **Q133** [typo] `Q133:D`: Tên tag viết sai 'ContainsSensltiveData' (chữ l thay cho i) so với 'ContainsSensitiveData' trong đề.
- **Q133** [ambiguous] `Q133:A`: A ghi 'Specify the tag name ... as parameters' trong khi rule s3-default-encryption-kms chỉ có tham số kmsKeyArns (lọc tag nằm ở scope) và không nêu giá trị True; đề lại không có tiêu chí least operational overhead nên A và B đều bảo vệ được.
- **Q136** [typo] `Q136:B`: Chuỗi policy có khoảng trắng thừa: "AWS " và "arn:aws :iam ::account-number:group/Dev" (ARN không hợp lệ về cú pháp).
- **Q137** [ambiguous] `Q137:A`: A và B mô tả bucket policy là 'cho account X ghi', trong khi tài liệu dùng service principal cloudtrail.amazonaws.com với aws:SourceArn là trail của management account; phân biệt A/B dựa vào chi tiết này.
- **Q142** [typo] `Q142:stem:0`: 'as the source, address' có dấu phẩy thừa (ý là 'source address').
- **Q142** [data] `Q142:A`: 'full header information' không chính xác: standard logging v2 chỉ có một số header cụ thể (Host, Referer, User-Agent, Cookie, x-host-header); field cs-headers (toàn bộ header) chỉ có ở real-time logs. Không làm đổi đáp án vì các option khác không đáp ứng.
- **Q143** [data] `Q143:stem:0`: Account ID 1111111111 và 2222222222 chỉ có 10 chữ số; AWS account ID thật có 12 chữ số (ví dụ minh hoạ, không ảnh hưởng đáp án).
- **Q143** [typo] `Q143:stem:0`: 'Company's B service' nên là 'Company B's service'.
- **Q143** [typo] `Q143:stem:3`: Trong ảnh policy thiếu dấu phẩy sau "Version": "2012-10-17" nên JSON không hợp lệ về cú pháp; không ảnh hưởng ý nghĩa câu hỏi.
- **Q005** [mapping note] Source typos retained: "exlemai" (external), "specifics" (specifies).
- **Q008** [mapping note] Rows 1 and 5 of the source image contain the identical strategy text but the answer image marks different scenarios for them (row 1 -> "Monitor network traffic...", row 5 -> "Correlate security findings...").
- **Q008** [mapping note] The stem text list contains the five scenarios followed by one strategy sentence ("Configure VPC Flow Logs ...") that is actually the row-1 label of the image; retained unchanged.
- **Q008** [mapping note] Layout is inverted relative to the instruction ("select the strategy for each scenario"): image rows are strategies, dropdowns list scenarios.
- **Q008** [mapping note] Typo in source: "Amazon EC2 distances" (instances).
- **Q082** [mapping note] Stem bullet "Configure service and application logging" has no final period; the dropdown in the source image shows "Configure service and application logging." Stem text is used as the response label.
- **Q082** [mapping note] Row 3 prompt text is taken from the export transcription "ports 0-65535" (ASCII hyphen); the source image shows an en dash.

## Pending (no final record yet)

None.
