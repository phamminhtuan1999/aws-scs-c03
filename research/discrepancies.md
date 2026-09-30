# Discrepancies & source issues (research_version r2-independent-verify)

Generated 2026-09-30T21:53:01+00:00 by `tools/make_discrepancies.py` from `research/reviews/`, `research/blind/` and `data/keys/source_keys.json`.
Source keys are never modified; this file only reports differences.

## Status counts

| status | questions |
|---|---|
| ambiguous | 25 |
| unresolved | 4 |
| verified | 114 |

## Source key vs research — every question that differs or cannot be compared

| Q | type | source key | blind verdict | final research | status | confidence | graded by research? | reason (short) |
|---|---|---|---|---|---|---|---|---|
| Q001 | multiple_choice | C | C | — | ambiguous | medium | no | C không sửa principal/SourceArn; không giữ verified khi điều kiện đủ quyền vẫn sai. |
| Q002 | ordering | S1 > S5 > S3 | S1 > S5 > S3 | — | ambiguous | medium | no | Phân biệt JWT token và temporary AWS credentials; user pool không tự phát AWS credentials. |
| Q005 | ordering | S6 > S1 > S3 | S6 > S1 > S3 | — | ambiguous | medium | no | Không ép source tutorial thành chuỗi duy nhất; cả metadata và SCIM là bước hợp lệ, scope không xác định. |
| Q007 | multiple_choice | B | B | — | ambiguous | medium | no | Bucket ARN không deny object APIs; principal đúng không đủ để verified whole policy. |
| Q008 | matching | P1→R5, P2→R4, P3→R3, P4→R1, P5→R2 (ungradable) | — | — | unresolved | medium | no | Không chấm full mapping; P1/P5 trùng; custom insights không tự chứng minh multi-stage correlation. |
| Q010 | multiple_choice | B | B | — | ambiguous | medium | no | State enabled/usable mâu thuẫn PendingReplicaDeletion, nên B chỉ là ý định sau sửa nguồn. |
| Q011 | multiple_choice | B | B | — | ambiguous | medium | no | Tách native shell khỏi SSH-over-SSM và ghi pricing chính thức có ngày hiệu lực hiện hành; không verified mọi literal yêu cầu. |
| Q013 | multiple_response | A,E | A,E | — | ambiguous | medium | no | E sai dấu đóng biến và shorthand ARN; AE chỉ sau sửa nguồn, không verified literal option. |
| Q019 | multiple_choice | D | D | — | ambiguous | medium | no | Disable Identity Center user không revoke active AWS role sessions; sửa kết luận immediate và phân biệt IAM user/IdC user. |
| Q023 | multiple_choice | A | A | — | ambiguous | medium | no | A chỉ Aurora MySQL; unspecified engine cần ambiguous thay vì verified mặc dù caveat đã có. |
| Q024 | multiple_choice | A | — | C | verified | high | yes | Đổi null/ambiguous thành C: ứng dụng được phép thay đổi nên có thể dùng shared rolling atomic counter; least effort chỉ so các đáp án đáp ứng. |
| Q026 | multiple_choice | D | D | — | ambiguous | medium | no | Không loại B chỉ vì inline policy: inline attach role là hợp lệ; task role không cô lập specific container; DBA plaintext vẫn cần hạn chế riêng. |
| Q041 | multiple_choice | B | B | — | ambiguous | medium | no | Không thể chứng minh 'sớm nhất' tuyệt đối; hourly poll không đồng nghĩa hourly dữ liệu, nhưng cũng không tự chứng minh B luôn đến trước A. |
| Q045 | multiple_choice | C | C | — | unresolved | medium | no | Sai nguyên văn IAM condition key và quá rộng: tag policy enforcement không áp dụng mọi tài nguyên; tài nguyên untagged không được tự buộc có tag. |
| Q047 | multiple_choice | A | A | — | ambiguous | medium | no | Current keywords tự thêm account/Region tương lai dù stem chỉ yêu cầu bucket tương lai; C cũng hợp lệ trong phạm vi hiện tại. |
| Q054 | multiple_response | A,D,F | A,D,F | — | ambiguous | medium | no | Current giải thích silently đổi F từ 'user assignments only in management account' thành 'users not groups'; cần flag sửa wording, recommendations không prerequisites. |
| Q056 | multiple_choice | C | A | — | ambiguous | medium | no | Current suy ra tracked session chuyển ngay sang untracked khi thêm allow-all; EC2 docs chỉ chắc cho originally untracked connections; runbook cho thêm evidence pattern nhưng không proof tương đương đổi rules SG. |
| Q062 | multiple_response | B,E | B,E | — | unresolved | medium | no | E hỏi last console login; credential report last-use không xác định attacker/all API activity; B/E không đáp ứng và CloudTrail thiếu. |
| Q070 | multiple_choice | A | A | — | ambiguous | medium | no | Current tự ghi runbook Creates new trail nhưng vẫn verified bật lại existing; cần kiểm chứng API/scope và periodic detector. |
| Q077 | multiple_choice | C | B | — | ambiguous | high | no | Giữ ambiguous và bỏ key duy nhất: preventive không đáp ứng; B là intended remediation. |
| Q084 | multiple_choice | A | A | — | unresolved | high | no | Không được bỏ hai bước selector sai rồi gọi toàn option verified; eventName trên event data store không tương đương trail, resources.ARN chỉ data events. |
| Q087 | multiple_response | B,E | B,E | — | ambiguous | high | no | BE và CE đều hợp lệ, Config delegated admin không tự là StackSets delegated admin; không ép chọn BE. |
| Q094 | multiple_choice | B | B | — | ambiguous | high | no | Managed policy hiện hành ghi không gỡ, làm theo Support case; review paraphrase 'giữ tới remediation rồi gỡ' không được nguồn hỗ trợ. |
| Q095 | multiple_choice | C | C | — | ambiguous | high | no | Option C dùng một policy scope all Regions không khả thi cho ALBs; caveat không cứu whole-option verified. |
| Q107 | multiple_choice | B | A | — | ambiguous | medium | no | Broad managed share chỉ là trần; identity policies phía nhận có thể loại reads và principals, nên A/B đều viable. |
| Q112 | multiple_choice | B | B | — | ambiguous | medium | no | Sau lượt độc lập, rà lại toàn bộ mệnh đề C: C dùng cùng KMS + scanning hợp lệ như B. Không thể loại C chỉ vì Inventory không phải CVE report; tiêu chí ít vận hành không có trong stem. |
| Q118 | multiple_choice | D | D | — | ambiguous | high | no | Không khẳng định ngày ra mắt nếu chưa đối chứng release note; tính năng hiện hành được xác nhận trực tiếp bằng ALB docs. |
| Q121 | multiple_choice | B | B | — | ambiguous | high | no | Typo thực thi cụ thể trong option B; không âm thầm sửa đề khi gọi đáp án verified. |
| Q122 | multiple_choice | A | A | — | ambiguous | high | no | Không thay NLB thành ALB trong đề để hợp thức hóa A. |
| Q142 | multiple_choice | A | A | — | ambiguous | high | no | Standard v2 có viewer-request/response-log-data bổ sung từ CloudFront Functions, nhưng cần code thêm và giới hạn 800 bytes; option A không nêu giải pháp này. Không chuyển cs-headers từ real-time sang standard bằng suy đoán. |

## Initial r1 blind → current final changes (historical bias check)

These preserved blind records are from r1. For the new independently persisted r2 passes and explicit root adjudications see independent_verify/REPORT.md and comparison_all.json. `AUDIT` below is the earlier r1 flag, not proof of an independent r2 consensus.

| Q | blind answer / status | final answer / status | source key | AUDIT flag |
|---|---|---|---|---|
| Q001 | C / verified | — / ambiguous | C |  |
| Q002 | S1 > S5 > S3 / verified | — / ambiguous | S1 > S5 > S3 |  |
| Q005 | S6 > S1 > S3 / ambiguous | — / ambiguous | S6 > S1 > S3 |  |
| Q007 | B / verified | — / ambiguous | B |  |
| Q008 | — / ambiguous | — / unresolved | P1→R5, P2→R4, P3→R3, P4→R1, P5→R2 |  |
| Q010 | B / verified | — / ambiguous | B |  |
| Q011 | B / verified | — / ambiguous | B |  |
| Q013 | A,E / verified | — / ambiguous | A,E |  |
| Q019 | D / verified | — / ambiguous | D |  |
| Q023 | A / verified | — / ambiguous | A |  |
| Q024 | — / ambiguous | C / verified | A |  |
| Q026 | D / verified | — / ambiguous | D |  |
| Q041 | B / verified | — / ambiguous | B |  |
| Q045 | C / verified | — / unresolved | C |  |
| Q047 | A / verified | — / ambiguous | A |  |
| Q054 | A,D,F / verified | — / ambiguous | A,D,F |  |
| Q056 | A / verified | — / ambiguous | C |  |
| Q062 | B,E / verified | — / unresolved | B,E |  |
| Q070 | A / verified | — / ambiguous | A |  |
| Q077 | B / verified | — / ambiguous | C |  |
| Q084 | A / verified | — / unresolved | A |  |
| Q087 | B,E / verified | — / ambiguous | B,E |  |
| Q094 | B / verified | — / ambiguous | B |  |
| Q095 | C / verified | — / ambiguous | C |  |
| Q107 | A / verified | — / ambiguous | B |  |
| Q112 | B / verified | — / ambiguous | B |  |
| Q118 | D / ambiguous | — / ambiguous | D |  |
| Q121 | B / verified | — / ambiguous | B |  |
| Q122 | A / ambiguous | — / ambiguous | A |  |
| Q133 | A / verified | B / verified | B |  |
| Q142 | A / verified | — / ambiguous | A |  |

## Medium/low confidence verified questions (graded, but with open issues)

- **Q015** (medium): 
- **Q040** (medium): 
- **Q048** (medium): 
- **Q063** (medium): 
- **Q082** (medium): 
- **Q104** (medium): 
- **Q116** (medium): 
- **Q124** (medium): 
- **Q125** (medium): 
- **Q132** (medium): 
- **Q137** (medium): 
- **Q138** (medium): 
- **Q140** (medium): 
- **Q141** (medium): 

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
- **Q001** [ambiguous] `Q001`: SourceArn thiếu Region/account; C có khoảng trắng trong ARN ảnh; không có đáp án đầy đủ.
- **Q002** [layout] `Q002:stem:0`: Đề ghi 'HOTSPOT' nhưng thực chất là dạng chọn và sắp xếp 3 bước.
- **Q002** [ambiguous] `Q002`: Không xác định loại temporary credentials; Lambda authorizer hợp lệ nhưng native JWT authorizer có thể ít quản trị hơn.
- **Q003** [typo] `Q003:B`: Ghi '-token-code' (một gạch) thay vì '--token-code'.
- **Q003** [data] `Q003`: D tham chiếu NotAction không tồn tại; SAML/AssumeRole có thể là giải pháp khác nếu cấu hình đầy đủ.
- **Q004** [layout] `Q004:C`: Ảnh phương án C bị cắt, thiếu dấu ngoặc '}' đóng cuối policy.
- **Q004** [typo] `Q004:B`: Sid 'DenyNonDefaultRegions' dùng cho statement Allow ở B và D – chỉ là nhãn, gây nhầm.
- **Q005** [typo] `Q005:stem:1`: 'exlemai' là lỗi chính tả của 'external'.
- **Q005** [typo] `Q005:S2`: 'specifics' là lỗi chính tả của 'specifies'.
- **Q005** [ambiguous] `Q005`: Lỗi chữ exlemai/specifics; SAML metadata là bước hợp lệ còn SCIM không được yêu cầu rõ; thứ tự ba slot mơ hồ.
- **Q006** [typo] `Q006:stem:0`: '(AWS KMS}' dùng sai dấu ngoặc đóng '}'.
- **Q006** [data] `Q006`: SES và WorkMail đều có trong danh sách ViaService hiện hành.
- **Q007** [layout] `Q007:D`: Ký tự Action trong ảnh D bị mờ ('s3:*' đọc không rõ).
- **Q007** [ambiguous] `Q007`: Tất cả ảnh chỉ có bucket ARN, không đáp án đầy đủ cho object access.
- **Q008** [typo] `Q008:R1`: 'Amazon EC2 distances' — đúng ra là 'Amazon EC2 instances'.
- **Q008** [layout] `Q008:P4`: Trong đề, danh sách response nằm ở stem còn prompt là các dòng trong ảnh; vai trò 'strategy' và 'scenario' bị đảo so với câu hướng dẫn.
- **Q008** [ambiguous] `Q008`: Đã xem ảnh và xác nhận hàng 1/hàng 5 trùng; distances là typo instances; không ép một full mapping.
- **Q010** [typo] `Q010:stem:2`: ARN ghi 'arn:aws;kms' (dấu ';' thay ':'); key ID 'mrk-0bb0212cd9864fdea0dcamzo26efb5670' chứa ký tự không phải hex.
- **Q010** [typo] `Q010:C`: 'lo allow' — đúng ra là 'to allow'.
- **Q010** [ambiguous] `Q010`: ARN chứa dấu ;, account ID và key ID có lỗi; enabled/usable mâu thuẫn state; không thể xóa ngay.
- **Q011** [ambiguous] `Q011`: Pricing chính thức: bỏ Advanced Instances Tier 2026-06-30; $0.05/hybrid session từ 2026-09-30, không hourly; hoàn toàn isolated còn cần outbound/private service path.
- **Q012** [typo] `Q012:C`: 'Enable Amazon GuardDuty Enable EKS Protection' thiếu dấu chấm giữa hai câu.
- **Q012** [typo] `Q012:A`: 'mailiing' — đúng ra là 'mailing'.
- **Q012** [typo] `Q012:D`: 'lo collect' và 'when now audit logs' — đúng ra là 'to collect', 'when new audit logs'.
- **Q012** [data] `Q012`: Runtime Monitoring không hỗ trợ EKS Fargate; không cần bật CloudWatch audit stream riêng cho GuardDuty.
- **Q013** [typo] `Q013:stem:0`: 'lo subscribe la specific' là lỗi gõ của 'to subscribe to specific'.
- **Q013** [typo] `Q013:A`: 'conned' là lỗi gõ của 'connect'.
- **Q013** [typo] `Q013:E`: Biến policy viết '${iot:Connection.Thing.ThingName)' dùng ')' thay '}'; nếu hiểu theo nghĩa đen thì biến không hợp lệ.
- **Q013** [ambiguous] `Q013`: E đóng biến bằng ) thay }; shorthand client/... thiếu ARN; literal policy không hợp lệ.
- **Q014** [data] `Q014`: Không có cơ sở hiện hành cho khẳng định mọi thay đổi nhanh tự động bị gộp bởi Continuous recorder.
- **Q015** [data] `Q015`: Không lựa chọn nào thỏa nếu mọi data keys bắt buộc sinh bằng custom-store key; phân biệt key type và API capability.
- **Q018** [typo] `Q018:A`: 'Regional duster ARN' là lỗi gõ của 'Regional cluster ARN'.
- **Q018** [typo] `Q018:stem:0`: Thiếu dấu chấm sau 'eradicated the attack' và '3:15 PM'.
- **Q019** [typo] `Q019:stem:0`: 'IAM Identify Center' phải là 'IAM Identity Center'.
- **Q019** [typo] `Q019:C`: 'arc assigned' -> 'are assigned'; 'performed m the' -> 'performed in the'.
- **Q019** [ambiguous] `Q019`: Không option đáp ứng literal IAM user + mọi AWS account + immediate; cần phân biệt credentials/IdC user/role session.
- **Q021** [data] `Q021`: Full scan chỉ các object đủ điều kiện và định dạng/storage class được hỗ trợ, không mọi object/version tuyệt đối.
- **Q022** [typo] `Q022:stem:0`: 'sands' phải là 'sends'.
- **Q022** [typo] `Q022:A`: 'Key Management Sen/ice' phải là 'Key Management Service'.
- **Q023** [ambiguous] `Q023`: Engine không được chỉ định; API/parameter khác giữa hai Aurora engines.
- **Q024** [data] `Q024`: Không dùng số minimum WAF 100 đã lỗi thời; stateless fleet không được dùng counter local per instance.
- **Q026** [typo] `Q026:stem:0`: 'wore stored' nên là 'were stored'.
- **Q026** [ambiguous] `Q026`: B mô tả inline policy chưa xác định nơi attach; D không đảm bảo isolation giữa containers; rotation phải cấu hình, không mặc định.
- **Q027** [typo] `Q027:stem:0`: 'slates' nên là 'states'.
- **Q028** [data] `Q028`: Revoke có thể ảnh hưởng ứng dụng; không ngăn attacker lấy credentials mới nếu instance vẫn bị kiểm soát.
- **Q030** [data] `Q030`: Publication sensitive findings opt-in; delegated administrator không tự thay publication settings mọi member account.
- **Q031** [typo] `Q031:stem:2`: Lỗi ngữ pháp 'Why was the finding was not created' (thừa 'was').
- **Q031** [data] `Q031`: example.com tự thân không chứng minh malicious domain; cần biết test/threat-list đã cấu hình.
- **Q032** [data] `Q032`: Cognito vốn có minimum length >=6; no required minimum là premise không chính xác nếu hiểu theo nghĩa không có bất kỳ minimum nào.
- **Q033** [typo] `Q033:A`: Thiếu dấu chấm giữa hai câu ('user agent string Add').
- **Q033** [typo] `Q033:C`: Thiếu dấu chấm giữa hai câu ('for the ALB Create').
- **Q033** [data] `Q033`: User-Agent spoofable; không nên diễn giải đây là biện pháp chặn mọi credential stuffing.
- **Q034** [data] `Q034`: WAF giảm thiểu theo rule; cần staging/rule validation với mẫu attack và traffic hợp lệ.
- **Q035** [typo] `Q035:stem:1`: 'do lo resolve' là lỗi đánh máy của 'to resolve'.
- **Q037** [typo] `Q037:stem:0`: 'ousting APIs' là lỗi OCR của 'existing APIs'.
- **Q037** [data] `Q037`: WAF bảo vệ API Gateway REST API stage; stem chỉ nói APIs và có lỗi 'ousting'.
- **Q038** [typo] `Q038:C`: 'application VPAttach' bị dính chữ, đúng là 'application VPC. Attach'.
- **Q038** [typo] `Q038:stem:0`: Thiếu dấu chấm sau 'for database access'.
- **Q039** [typo] `Q039:D`: 'rote' là lỗi của 'role'.
- **Q039** [typo] `Q039:A`: Thiếu dấu chấm sau 'production account'.
- **Q040** [typo] `Q040:stem:0`: Lỗi OCR: 'stares mare' = 'stores more', '(Pit)' = '(PII)'.
- **Q040** [typo] `Q040:stem:3`: 'moot' là lỗi của 'meet'.
- **Q040** [typo] `Q040:C`: 'Amazon Made' là lỗi của 'Amazon Macie'.
- **Q040** [data] `Q040`: Policy authorization chặn request mới; không chứng minh terminate download stream đã được authorize trước đó.
- **Q041** [ambiguous] `Q041`: Không có SLA tài liệu chứng minh thứ tự cảnh báo tuyệt đối giữa mọi lựa chọn.
- **Q044** [typo] `Q044:stem:0`: "security learn" nên là "security team".
- **Q044** [typo] `Q044:D`: "on promises" nên là "on premises".
- **Q045** [typo] `Q045:A`: "CloudFormatlon" nên là "CloudFormation"; "aws:RequestTagCostCenter" thiếu dấu "/" (aws:RequestTag/CostCenter).
- **Q045** [typo] `Q045:C`: "aws:RequestTag.CostCenter" nên là "aws:RequestTag/CostCenter".
- **Q045** [ambiguous] `Q045`: Lỗi IAM condition key trong A/C.
- **Q045** [ambiguous] `Q045`: Tag policy không tự buộc tài nguyên untagged có tag.
- **Q045** [ambiguous] `Q045`: Cần kiểm tra hỗ trợ tài nguyên/API và kiểm soát untag/delete.
- **Q046** [typo] `Q046:stem:0`: "has learns" nên là "has teams".
- **Q046** [typo] `Q046:D`: "now dedicated account" nên là "new dedicated account".
- **Q047** [ambiguous] `Q047`: A và C khác phạm vi tăng trưởng account/Region không được stem nêu rõ.
- **Q047** [ambiguous] `Q047`: Không được mô tả aggregator như cơ chế tự remediation.
- **Q048** [data] `Q048`: Choose three hợp lý A/C/F với giả định credentials nguồn chung; E không tuyệt đối sai theo wording.
- **Q049** [data] `Q049`: Không nên khẳng định FIS không xuất báo cáo hoặc thử nghiệm development vô giá trị.
- **Q051** [typo] `Q051:A`: 's3-default-encryplion-kms' (đúng: s3-default-encryption-kms), 'identity' (đúng: identify), 'AWS. Config' thừa dấu chấm.
- **Q051** [typo] `Q051:B`: 'server-since encryption' (đúng: server-side encryption), 'AWS. Config' thừa dấu chấm.
- **Q051** [data] `Q051`: Từ 'unencrypted' cần hiểu yêu cầu KMS vì S3 hiện mặc định SSE-S3.
- **Q051** [data] `Q051`: Header-based guardrail có thể từ chối request bỏ header dù bucket default KMS.
- **Q052** [typo] `Q052:B`: 'CryptoCurroncy:EC2/*' (đúng: CryptoCurrency).
- **Q052** [data] `Q052`: Không nên hứa quarantine SG dừng mọi outbound connection hiện hữu.
- **Q053** [data] `Q053`: AWS Backup start window mặc định có thể dài; hourly schedule không phải bảo đảm cứng.
- **Q053** [data] `Q053`: Cần bảo vệ bản sao khỏi ransomware để DR thực tế hiệu quả.
- **Q054** [ambiguous] `Q054`: F mơ hồ/lệch nghĩa khuyến nghị gốc AWS.
- **Q054** [ambiguous] `Q054`: Các mục là recommendations, không phải prerequisites bắt buộc tuyệt đối.
- **Q055** [data] `Q055`: Whitepaper English cũ đã redirect; PDF security-ir live đổi nội dung/version, cần dẫn trang artifact còn hiện hữu.
- **Q056** [ambiguous] `Q056`: A thiếu bằng chứng về thay đổi tracked/untracked tức thời.
- **Q056** [ambiguous] `Q056`: C/D vi phạm yêu cầu cho phép forensic cổng 22; cần sửa đề/lựa chọn.
- **Q056** [ambiguous] `Q056`: Re:Post article linked by runbook returned403; không dùng nó làm bằng chứng đã mở.
- **Q056** [ambiguous] `Q056`: Runbook thay groups trên ENI; optionA sửa rules của SG hiện có nên chỉ có evidence tương tự, chưa proof hành vi tracking.
- **Q057** [data] `Q057`: A nói same permissions nhưng bỏ path; giải thích phải bổ sung path và phân biệt khuyến nghị nội dung.
- **Q058** [data] `Q058`: D là possible cause; direct key policy/grant khác có thể vẫn cho phép.
- **Q059** [data] `Q059`: AWS managed key do AWS tạo/quản lý, không phải người dùng tự tạo.
- **Q060** [typo] `Q060:B`: Thiếu dấu chấm: 'Specify the IAM role Run an assessment report.'
- **Q061** [data] `Q061`: Chỉ địa chỉ IPv4 public routable trong trusted IP list; DNS/Runtime findings có ngoại lệ.
- **Q061** [data] `Q061`: Không nói TXT là định dạng duy nhất; còn CSV/STIXXML/OASIS.
- **Q062** [typo] `Q062:stem:1`: Câu thiếu dấu chấm cuối; 'user's IAM account' ở B nên là IAM user.
- **Q062** [ambiguous] `Q062`: Choose two không có cặp đáp án hoàn chỉnh; chỉ B được xác minh.
- **Q062** [ambiguous] `Q062`: Thời điểm console login không chứng minh việc dùng API access key.
- **Q063** [typo] `Q063:A`: Viết 'S3:Get*', 'S3:List*' thay vì tiền tố action chuẩn 's3:'.
- **Q063** [data] `Q063`: Stem đã dùng temporary instance-role credentials nên 'additional step' không bắt buộc chỉ để temporary.
- **Q063** [data] `Q063`: Client-only object access dựa phân phối URL, không phải identity validation bởi presigning.
- **Q064** [typo] `Q064:stem:0`: 'Amazon Made' là lỗi gõ của 'Amazon Macie'; dấu chấm sau 'Firewall Manager.' nên là dấu phẩy.
- **Q064** [data] `Q064`: Stem 'Amazon Made' là lỗi OCR của Macie.
- **Q064** [data] `Q064`: Search snippet metric có thể trộn các trường; actual opened Shield metrics page là căn cứ.
- **Q065** [data] `Q065`: DRS recovery launch không đồng nghĩa mặc định tự phát hiện và failover khi on-prem hỏng.
- **Q066** [typo] `Q066:A`: 'Associate the Amazon Cognito function' nên là 'Associate the Lambda function'.
- **Q066** [data] `Q066`: Lambda pre-sign-up không tự nhận IP caller đầy đủ; giao nhiệm vụ geo cho WAF.
- **Q067** [typo] `Q067:C`: Lựa chọn C thiếu dấu chấm cuối câu.
- **Q070** [ambiguous] `Q070`: API/scope mismatch: AWS-EnableCloudTrail description 'Creates a new AWS CloudTrail trail'.
- **Q070** [ambiguous] `Q070`: Config cloudtrail-enabled periodic không phải immediate event-driven detection.
- **Q072** [data] `Q072`: CLI có thể refresh credential mới khi phiên SSO hợp lệ; expiration60min không có nghĩa cấm mọi refresh.
- **Q073** [data] `Q073`: Custom action không trực tiếp chứa Lambda; Lambda là EventBridge target.
- **Q073** [data] `Q073`: Xóa quy tắc của security group dùng chung có thể tác động nhiều instance; câu hỏi cố định thiết kế này.
- **Q074** [typo] `Q074:B`: Thiếu dấu chấm: 'Amazon S3 bucket Configure...' và cuối câu thiếu dấu chấm.
- **Q075** [data] `Q075`: AWS docs nói near real-time, không cam kết SLA email ≤5 phút; không nhầm với cập nhật lặp lại 15 phút/1 giờ/6 giờ.
- **Q075** [data] `Q075`: 2018 primary blog hỗ trợ timing event trong năm phút; không tương đương bảo đảm email đã nhận. Nếu hiểu câu hỏi là architectural target, giữ A với caveat là hợp lý; nếu deadline cứng, ambiguous.
- **Q076** [typo] `Q076:C`: 'in the VPCreate security policies' — thiếu dấu chấm và khoảng trắng giữa 'VPC' và 'Create'.
- **Q076** [data] `Q076`: Tài liệu hiện hành ghi Anti-DDoS Managed Rule Group thay L7AM từ 2026-03-26; khách hàng Shield mới cần Support để dùng legacy.
- **Q076** [data] `Q076`: Baseline 24 giờ–30 ngày và mitigation có độ trễ; không bảo đảm tức thời tuyệt đối.
- **Q076** [data] `Q076`: Current option D khả thi theo legacy availability; khách hàng mới có thể cần Support để enable, vì Anti-DDoS AMR hiện thay legacy. Không khẳng định enable luôn có sẵn cho mọi deployment mới.
- **Q077** [ambiguous] `Q077`: Literal requirement prevent creation không được đáp ứng.
- **Q077** [ambiguous] `Q077`: Không được sáng tạo ec2:CidrIp, ec2:FromPort hoặc ec2:IpProtocol IAM condition.
- **Q078** [typo] `Q078:C`: Thiếu dấu chấm cuối câu.
- **Q078** [data] `Q078`: Rate limiting không bảo đảm zero false positives; all incoming requests không đồng nghĩa aggregate CountAll.
- **Q080** [typo] `Q080:stem:0`: "Production. Development, and Testing" dùng dấu chấm thay vì dấu phẩy sau Production; không ảnh hưởng nghĩa.
- **Q080** [data] `Q080`: FIRST là trình tự troubleshooting hợp lý, không phải mọi lỗi đều do SCP.
- **Q081** [typo] `Q081:stem:2`: "when any AWS resources does not comply" sai ngữ pháp số ít/số nhiều; không ảnh hưởng nghĩa.
- **Q081** [data] `Q081`: User Notifications cần notification configuration/event filter; không tự thông báo tất cả Config events.
- **Q082** [layout] `Q082:R1`: Danh sách text ghi 'Configure service and application logging' (không dấu chấm) còn dropdown trong ảnh có dấu chấm; ảnh dùng '0–65535' (en-dash) còn prompt dùng '-'. Không ảnh hưởng nghĩa.
- **Q082** [data] `Q082`: Đề gọi design principles nhưng các tên là best practices.
- **Q082** [data] `Q082`: Blind ambiguity được giải quyết bằng current primary doc sau comparison, giữ nguyên independent.json lịch sử.
- **Q084** [typo] `Q084:B`: Thiếu dấu chấm: 'Configure an automated export of the log group Send the export to the auditors.'
- **Q084** [ambiguous] `Q084`: No fully valid option as written; intended A must be labeled implementation correction.
- **Q084** [ambiguous] `Q084`: Log file validation detects tampering, không tự chống xóa.
- **Q084** [ambiguous] `Q084`: CloudTrail evidence records API origin metadata, không tự chứng thực external entropy provenance.
- **Q086** [typo] `Q086:stem:1`: Trong ảnh, dấu nháy đóng sau 'arn:aws:iam::111122223333:root' là nháy cong (”) thay vì nháy thẳng (") như các chuỗi khác; về cú pháp JSON là không hợp lệ nhưng không đổi ý nghĩa câu hỏi.
- **Q086** [data] `Q086`: D diễn đạt IAM principals; root user cũng được full access qua account principal, không cần attached IAM policy.
- **Q087** [ambiguous] `Q087`: Không đủ bằng chứng để loại C chỉ vì đã có Config delegated administrator.
- **Q087** [ambiguous] `Q087`: API error paragraph nói all APIs management-only mâu thuẫn phần đầu API; phần đầu và user guide xác nhận delegated support.
- **Q087** [ambiguous] `Q087`: Nếu tổ chức gồm management account, organization conformance pack/StackSets không tự bao phủ management như mọi member.
- **Q088** [typo] `Q088:C`: Sid 'AllowSSLRequestsOnly' được dùng cho cả policy C và D dù nội dung là điều kiện SSE (không liên quan SSL); không ảnh hưởng tính hợp lệ nhưng gây nhầm.
- **Q088** [data] `Q088`: Dòng Sid AllowSSLRequestsOnly không đổi ý nghĩa Effect:Deny.
- **Q088** [data] `Q088`: Khi áp dụng thực tế cần cân nhắc ngoại lệ AWS service principals cho redacted network context.
- **Q089** [typo] `Q089:stem:1`: Cụm 'increasing their permissions to creation of these new resources' có vẻ thiếu/sai từ (ý là 'through creation of'); ý nghĩa vẫn hiểu được.
- **Q089** [data] `Q089`: Chỉ CreateRole condition là chưa đủ nếu developer có quyền gỡ/sửa boundary; cần deny boundary tampering/pass-role escalation.
- **Q090** [data] `Q090`: A thiếu explicit Organizations sharing step trong wording; bổ sung trong giải thích.
- **Q091** [data] `Q091`: Current KMS hỗ trợ imported symmetric on-demand rotation; không nói tuyệt đối key không thể có material mới, mà material mới không phục hồi ciphertext cũ.
- **Q092** [typo] `Q092:E`: Điều kiện ở E thiếu dấu ':' giữa "aws:MultiFactorAuthPresent" và false (JSON không hợp lệ). Có thể do lỗi chép đề; kể cả khi sửa, Bool false vẫn không chặn long-term access keys.
- **Q092** [data] `Q092`: E có lỗi JSON nhưng ngay cả khi sửa cú pháp vẫn không đầy đủ.
- **Q094** [typo] `Q094:D`: "IAM abbess keys" là lỗi chính tả của "IAM access keys".
- **Q094** [ambiguous] `Q094`: No fully supported option as written; intended B is conditional.
- **Q094** [ambiguous] `Q094`: Current managed policy edited 2026-03-16 16:27 UTC per actual page; không suy đoán từ crawler.
- **Q095** [ambiguous] `Q095`: C wording all accounts and Regions sai phạm vi: cần policy per Region.
- **Q095** [ambiguous] `Q095`: Member accounts cần Marketplace subscription/license hợp lệ.
- **Q095** [ambiguous] `Q095`: Không coi Security Hub tự sinh custom missing-third-party-rule finding nếu không có control.
- **Q096** [data] `Q096`: Native KMS CMK Deletion event chỉ sau xóa; phải dùng API Call via CloudTrail event.
- **Q096** [data] `Q096`: Lambda không bắt buộc nếu EventBridge target SNS trực tiếp, nhưng hợp lệ.
- **Q099** [data] `Q099`: Bucket versioning bật thì Expiration chỉ tạo delete marker; để xóa mọi dữ liệu cần NoncurrentVersionExpiration.
- **Q099** [data] `Q099`: Standard retrieval là typical, không SLA mọi object; rất lớn có thể lâu hơn.
- **Q100** [data] `Q100`: SCP không áp management account, service-linked roles hoặc external principals; literal any bucket/user toàn tổ chức cần phạm vi chính xác.
- **Q101** [typo] `Q101:B`: "Development. Staging, or Production" – dấu chấm thay vì dấu phẩy sau Development.
- **Q101** [typo] `Q101:C`: "Development. Staging, and Production" – dấu chấm thay vì dấu phẩy sau Development.
- **Q101** [data] `Q101`: Tag policy phải có enforced_for EC2 instances, không chỉ định allowed values mà không enforce.
- **Q101** [data] `Q101`: Current tag policy có report_required_tag_for và IaC fail/warn integration; không nhầm reporting với native RunInstances deny.
- **Q102** [data] `Q102`: OAC là cấu hình distribution, bucket policy dùng CloudFront service principal/SourceArn, không ARN OAC làm Principal.
- **Q104** [typo] `Q104:C`: Cụm 'retrieve the value or the SecureString parameter' có lẽ là lỗi đánh máy của 'value of the SecureString parameter'; không ảnh hưởng nghĩa.
- **Q104** [data] `Q104`: Không khẳng định environment variables không mã hóa: Lambda luôn encrypt at rest.
- **Q104** [data] `Q104`: MOST cost-effective phụ thuộc caching, request volume, key dùng chung; C là intended default static-token solution.
- **Q106** [data] `Q106`: Theo topo đề không có đường egress khác; nếu có IPv6/TGW/proxy cần cắt thêm.
- **Q107** [ambiguous] `Q107`: Không được nói mọi aws:PrincipalTag không được AWS RAM hỗ trợ.
- **Q107** [ambiguous] `Q107`: Customer managed permission condition chỉ single non-negating operators; bảo vệ tagging để tránh tự gắn allowed tag.
- **Q107** [ambiguous] `Q107`: A write-only có thể đáp ứng allocation nhưng thiếu read nếu operations yêu cầu khác; stem không xác định actions.
- **Q107** [ambiguous] `Q107`: C cũng có thể implement bổ sung đúng policies; không unique nếu diễn giải rộng.
- **Q109** [typo] `Q109:stem:0`: 'MySOL' là lỗi chính tả của 'MySQL'.
- **Q112** [ambiguous] `Q112`: Sau lượt độc lập, rà lại toàn bộ mệnh đề C: C dùng cùng KMS + scanning hợp lệ như B. Không thể loại C chỉ vì Inventory không phải CVE report; tiêu chí ít vận hành không có trong stem.
- **Q113** [data] `Q113`: A cần HTTPS target group; chỉ cài certificate chưa tự bật TLS. ALB không validate chứng chỉ target, nên self-signed có thể dùng cho hop này.
- **Q114** [typo] `Q114:stem:0`: 'Indicates' viết hoa giữa câu (lỗi chính tả nhỏ).
- **Q114** [data] `Q114`: Process details phụ thuộc finding/data source; nếu finding không có process, lấy telemetry host bổ sung, không khẳng định mọi GuardDuty finding đều có.
- **Q116** [data] `Q116`: Không khẳng định chỉ kms:Encrypt/kms:Decrypt luôn đủ. EBS còn cần CreateGrant, DescribeKey, GenerateDataKeyWithoutPlaintext, ReEncrypt theo ngữ cảnh; đề không nêu quyền sẵn có.
- **Q117** [data] `Q117`: Managed rule này kiểm tra DB instances; nếu hiểu all RDS resources gồm public snapshots thì cần thêm rules. Không quảng cáo một rule phủ mọi loại tài nguyên RDS.
- **Q118** [ambiguous] `Q118`: Không khẳng định ngày ra mắt nếu chưa đối chứng release note; tính năng hiện hành được xác nhận trực tiếp bằng ALB docs.
- **Q119** [typo] `Q119:C`: 'PostgreSOL' (chữ O) thay vì 'PostgreSQL' (chữ Q).
- **Q120** [typo] `Q120:B`: 'Verity' thay vì 'Verify' (cũng xuất hiện ở C và E).
- **Q121** [typo] `Q121:B`: 'cm-guard' là lỗi chính tả của lệnh 'cfn-guard'.
- **Q121** [typo] `Q121:D`: 'com feted' là lỗi chính tả của 'completed'.
- **Q121** [ambiguous] `Q121`: Typo thực thi cụ thể trong option B; không âm thầm sửa đề khi gọi đáp án verified.
- **Q122** [ambiguous] `Q122`: Không thay NLB thành ALB trong đề để hợp thức hóa A.
- **Q124** [data] `Q124`: A có cách viết dễ hiểu nhầm vị trí tạo policy. Không thể gắn policy target account vào IAM user caller như một managed-policy ARN cross-account.
- **Q125** [typo] `Q125:D`: 'EC2 instance Connect' viết thường chữ 'instance' (tên đúng: EC2 Instance Connect).
- **Q125** [data] `Q125`: Trust anchor là resource riêng; trust policy tham chiếu ARN/CA constraints, không tạo trust anchor bên trong JSON policy.
- **Q126** [data] `Q126`: Response headers policy hiện là giải pháp không cần code tốt cho nhiều trường hợp, nhưng không có trong options; không tự đổi khóa sang lựa chọn mới.
- **Q132** [data] `Q132`: Suppressed findings không gửi EventBridge/Security Hub và không dùng trong attack-sequence correlation. GuardDuty docs không có finding FTP brute-force tương ứng tiền đề; không khẳng định visibility hoàn toàn không đổi.
- **Q133** [typo] `Q133:D`: Tên tag viết sai 'ContainsSensltiveData' (chữ l thay cho i) so với 'ContainsSensitiveData' trong đề.
- **Q133** [data] `Q133`: Không nói managed rule không hỗ trợ tag filtering nói chung: Config scope hỗ trợ tag. B phải kiểm tra customer managed/key ARN, không chỉ SSE-KMS bật.
- **Q135** [data] `Q135`: D nói hai HSM nhưng không chỉ rõ khác AZ; triển khai phải thêm điều kiện này, không khẳng định hai HSM cùng AZ là HA.
- **Q136** [typo] `Q136:B`: Chuỗi policy có khoảng trắng thừa: "AWS " và "arn:aws :iam ::account-number:group/Dev" (ARN không hợp lệ về cú pháp).
- **Q137** [data] `Q137`: Bucket policy thực tế phải cho cloudtrail.amazonaws.com với SourceArn management/delegated trail, không chỉ cho IAM principal management account. CloudTrail không log mọi data event mặc định; cần chọn event coverage theo yêu cầu.
- **Q138** [data] `Q138`: C cần cấu hình thực thi runbook tự động; association runbook vào OpsItem đơn thuần chưa tự execute. A có thể được mở rộng để đáp ứng nhưng không mô tả progress updates.
- **Q140** [data] `Q140`: B chỉ phát hiện bất thường của metric được trích xuất. Nếu mục tiêu là log-pattern anomaly tùy ý, cần CloudWatch Logs anomaly detector; A cũng khả thi nếu bổ sung cấu hình signal, nên không nói Container Insights không thu app logs.
- **Q141** [data] `Q141`: Option B không viết stop condition; đây là cấu hình cần thêm khi triển khai, không tự có vì chỉ schedule experiment.
- **Q142** [typo] `Q142:stem:0`: 'as the source, address' có dấu phẩy thừa (ý là 'source address').
- **Q142** [ambiguous] `Q142`: Standard v2 có viewer-request/response-log-data bổ sung từ CloudFront Functions, nhưng cần code thêm và giới hạn 800 bytes; option A không nêu giải pháp này. Không chuyển cs-headers từ real-time sang standard bằng suy đoán.
- **Q143** [typo] `Q143:stem:0`: 'Company's B service' nên là 'Company B's service'.
- **Q143** [typo] `Q143:stem:3`: Trong ảnh policy thiếu dấu phẩy sau "Version": "2012-10-17" nên JSON không hợp lệ về cú pháp; không ảnh hưởng ý nghĩa câu hỏi.
- **Q143** [data] `Q143`: Source dùng account IDs 10 digits như placeholders; account ID/ARN thật phải hợp lệ. Không sửa nguyên văn nguồn.
- **Q005** [mapping note] Source typos retained: "exlemai" (external), "specifics" (specifies).
- **Q008** [mapping note] Rows 1 and 5 of the source image contain the identical strategy text but the answer image marks different scenarios for them (row 1 -> "Monitor network traffic...", row 5 -> "Correlate security findings...").
- **Q008** [mapping note] The stem text list contains the five scenarios followed by one strategy sentence ("Configure VPC Flow Logs ...") that is actually the row-1 label of the image; retained unchanged.
- **Q008** [mapping note] Layout is inverted relative to the instruction ("select the strategy for each scenario"): image rows are strategies, dropdowns list scenarios.
- **Q008** [mapping note] Typo in source: "Amazon EC2 distances" (instances).
- **Q082** [mapping note] Stem bullet "Configure service and application logging" has no final period; the dropdown in the source image shows "Configure service and application logging." Stem text is used as the response label.
- **Q082** [mapping note] Row 3 prompt text is taken from the export transcription "ports 0-65535" (ASCII hyphen); the source image shows an en dash.

## Pending (no final record yet)

None.
