# Independent verification Q001–Q036

Blind conclusions persisted: 2026-09-30T21:33:39.983997+00:00. Comparison completed: 2026-09-30T21:38:59.751999+00:00.

Reviewed all 36 questions and 157 choice/order/matching units from blind content and all relevant images before reading reviews. Primary AWS pages were opened live; no pre-existing answer snapshots or keys were used in independent solving.

Independent result: 24 verified, 11 ambiguous, 1 unresolved. Q008 must map to application ambiguous if unresolved is unsupported. Canonical baseline/app files were not modified.

Comparison schema per question: existing (answer/status/explanation/keywords/tip/issues); independent_answer/status; answer_differs/status_differs; change_classification; mandatory_changes/conditional_changes; proposed_researched_answer/status/application_status; intended_answer_requires_source_fix_or_scope_clarification; proposed_explanation_vi (why_correct/others); proposed_per_option_reasons; proposed_keywords; proposed_memory_tip_vi; source_issues; references; confidence.

All 36 replacements obey why_correct <=60 whitespace tokens, each other-option reason <=40, and one conditional memory tip <=35. Keywords are exact substrings of original stems, maximum three.

| ID | Existing | Proposed | Status | Change |
|---|---|---|---|---|
| Q001 | C (verified) | no full answer | ambiguous | mandatory |
| Q002 | S1 → S5 → S3 (verified) | S1 → S5 → S3 | ambiguous | conditional |
| Q003 | B (verified) | B | verified | mandatory |
| Q004 | C (verified) | C | verified | mandatory |
| Q005 | S6 → S1 → S3 (ambiguous) | no full answer | ambiguous | mandatory |
| Q006 | C (verified) | C | verified | none |
| Q007 | B (verified) | no full answer | ambiguous | mandatory |
| Q008 | no full answer (ambiguous) | no full answer | unresolved | mandatory |
| Q009 | B (verified) | B | verified | none |
| Q010 | B (verified) | B | ambiguous | mandatory |
| Q011 | B (verified) | B | ambiguous | mandatory |
| Q012 | C (verified) | C | verified | none |
| Q013 | A → E (verified) | A → E | ambiguous | mandatory |
| Q014 | B (verified) | B | verified | none |
| Q015 | D (verified) | D | ambiguous | mandatory |
| Q016 | C (verified) | C | verified | conditional |
| Q017 | A (verified) | A | verified | none |
| Q018 | A (verified) | A | verified | conditional |
| Q019 | D (verified) | no full answer | ambiguous | mandatory |
| Q020 | A (verified) | A | verified | none |
| Q021 | C (verified) | C | verified | conditional |
| Q022 | D (verified) | D | verified | mandatory |
| Q023 | A (verified) | A | ambiguous | mandatory |
| Q024 | no full answer (ambiguous) | C | verified | mandatory |
| Q025 | B (verified) | B | verified | none |
| Q026 | D (verified) | D | ambiguous | mandatory |
| Q027 | A → C (verified) | A → C | verified | conditional |
| Q028 | D (verified) | D | verified | conditional |
| Q029 | B (verified) | B | verified | mandatory |
| Q030 | A (verified) | A | verified | conditional |
| Q031 | B (verified) | B | verified | conditional |
| Q032 | B → C (verified) | B → C | verified | conditional |
| Q033 | C (verified) | C | verified | conditional |
| Q034 | A (verified) | A | verified | conditional |
| Q035 | B (verified) | B | verified | none |
| Q036 | C (verified) | C | verified | none |

## Q001

C không sửa principal/SourceArn; không giữ verified khi điều kiện đủ quyền vẫn sai.

Không lựa chọn nào sửa đủ policy: GetObject cần ARN object, còn Lambda dùng execution role. C chỉ sửa Resource; principal và SourceArn vẫn không cấp quyền cho mã trong function.

- Q001:A: Sai: ARN function không phải IAM principal hợp lệ.
- Q001:B: Sai: thêm action không sửa Resource object và principal.
- Q001:C: Chưa đủ: /* sửa ARN object nhưng principal/điều kiện vẫn không cấp quyền cho execution role.
- Q001:D: Sai: đảo principal và resource không cấp quyền đọc S3.

Keywords: MyLambdaFunction, read the objects, bucket policy

Tip: Nếu Lambda gọi S3 bằng mã ứng dụng, kiểm tra execution role và ARN object cùng các điều kiện policy.

Source issues: SourceArn thiếu Region/account; C có khoảng trắng trong ARN ảnh; không có đáp án đầy đủ.

Primary sources (accessed 2026-09-30):

- [lambda](https://docs.aws.amazon.com/lambda/latest/dg/permissions-source-function-arn.html): Lambda runtime calls use execution-role credentials; lambda:SourceFunctionArn is a different context key from aws:SourceArn.
- [s3resource](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html): Object operations such as GetObject require object ARNs; bucket ARN alone covers bucket operations.
- [principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html): IAM user, assumed-role session, and STS federated-user are distinct principals; Lambda function ARN is not an IAM principal.

## Q002

Phân biệt JWT token và temporary AWS credentials; user pool không tự phát AWS credentials.

User pool → app client → HTTP API Lambda authorizer là luồng xác thực bằng token phù hợp cho người dùng ngoài. Nếu temporary credentials nghĩa là thông tin xác thực AWS STS, đề còn thiếu identity pool.

- Q002:S1: Chọn trước: user pool quản lý danh tính và phát token.
- Q002:S2: Không cần cho xác thực người dùng: role cấp quyền AWS cho backend.
- Q002:S3: Chọn sau app client: authorizer kiểm tra token trước backend.
- Q002:S4: Sai: tự lưu mật khẩu theo microservice tăng quản trị.
- Q002:S5: Chọn sau user pool: app client định cấu hình ứng dụng dùng token.
- Q002:S6: Không phù hợp nhất: Identity Center phục vụ workforce, không thay user pool ứng dụng khách.

Keywords: external users, temporary credentials, user databases

Tip: Nếu cần temporary AWS credentials, thêm identity pool; nếu chỉ JWT, dùng user pool/app client/authorizer.

Source issues: Không xác định loại temporary credentials; Lambda authorizer hợp lệ nhưng native JWT authorizer có thể ít quản trị hơn.

Primary sources (accessed 2026-09-30):

- [cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-integrating-user-pools-with-identity-pools.html): User pools issue JWT tokens; identity pools exchange identities for temporary AWS credentials.
- [authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html): HTTP API Lambda authorizers can evaluate authentication tokens before forwarding authorized requests.

## Q003

Giữ B; ghi rõ D nhắc NotAction không tồn tại, và BoolIfExists=true vẫn deny khi key vắng.

Dùng GetSessionToken kèm serial MFA và mã OTP, rồi dùng bộ thông tin xác thực tạm thời trả về cho CLI. Đổi điều kiện deny sang true sẽ đảo mục tiêu bảo vệ.

- Q003:A: Sai: true deny phiên MFA; BoolIfExists cũng deny khi key vắng, nên vẫn chặn access key dài hạn.
- Q003:B: Đúng: token tạm thời xác thực MFA đáp ứng policy.
- Q003:C: Có thể thiết kế MFA qua SAML nhưng cần federation/role mới, không phải sửa trực tiếp ít thay đổi nhất.
- Q003:D: Không chọn: phương án nhắc NotAction không có trong policy ảnh và thêm role không cần thiết.

Keywords: multi-factor authentication, AWS CLI, Amazon EC2 commands

Tip: Nếu CLI bị deny bởi aws:MultiFactorAuthPresent, lấy và dùng thông tin xác thực tạm thời có MFA.

Source issues: D tham chiếu NotAction không tồn tại; SAML/AssumeRole có thể là giải pháp khác nếu cấu hình đầy đủ.

Primary sources (accessed 2026-09-30):

- [sts](https://docs.aws.amazon.com/cli/latest/reference/sts/get-session-token.html): GetSessionToken with serial number and token code produces MFA-authenticated temporary credentials.

## Q004

Giữ C; sửa D: StringEquals nhắm eu-west-1 chứ không phải Region khác; Allow không hạn chế default SCP.

Deny với NotAction loại trừ các global service và StringNotEquals eu-west-1 chặn API ngoài Region cho OU. Explicit deny vẫn có hiệu lực khi SCP mặc định FullAWSAccess tồn tại.

- Q004:A: Sai: StringEquals deny ngay Region được phép.
- Q004:B: Sai: allow không hạn chế quyền đang được FullAWSAccess cho phép.
- Q004:C: Đúng: deny ngoài eu-west-1, trừ global services đã liệt kê.
- Q004:D: Sai: StringEquals nhắm eu-west-1; thêm Allow không hạn chế default FullAWSAccess.

Keywords: default SCP, eu-west-1, global services

Tip: Nếu OU đang có FullAWSAccess, dùng explicit deny ngoài Region với ngoại lệ global phù hợp.

Primary sources (accessed 2026-09-30):

- [scp](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html): Deny with NotAction and StringNotEquals RequestedRegion restricts regions while exempting named global APIs; default FullAWSAccess permits unless denied.

## Q005

Không ép source tutorial thành chuỗi duy nhất; cả metadata và SCIM là bước hợp lệ, scope không xác định.

Nếu S1 bao gồm toàn bộ trao đổi SAML, cấu hình identity source → bật SCIM ở Identity Center → bật SCIM ở IdP là một chuỗi hợp lệ. Đề chỉ yêu cầu external IdP nên không chứng minh SCIM bắt buộc và không có một chuỗi ba bước duy nhất.

- Q005:S1: Hợp lệ: cấu hình external identity source, bao gồm kết nối SAML.
- Q005:S2: Sai: API endpoint của IdP không phải principal SAML trong trust policy.
- Q005:S3: Hợp lệ nếu dùng SCIM: lấy endpoint/token trước cấu hình IdP.
- Q005:S4: Hợp lệ nếu dùng SCIM: dùng endpoint/token từ Identity Center.
- Q005:S5: Hợp lệ và cần cho trao đổi SAML, không thể coi là distractor sai.
- Q005:S6: Hợp lệ và cần cho trao đổi SAML, không thể coi là distractor sai.

Keywords: identity provider, identity source, SAML metadata

Tip: Nếu cần tự động provision người dùng, cấu hình SAML trước rồi bật SCIM ở AWS trước IdP.

Source issues: Lỗi chữ exlemai/specifics; SAML metadata là bước hợp lệ còn SCIM không được yêu cầu rõ; thứ tự ba slot mơ hồ.

Primary sources (accessed 2026-09-30):

- [idp](https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-connect-idp.html): External IdP connection exchanges IAM Identity Center and IdP SAML metadata; identity source configuration includes connection settings.
- [scim](https://docs.aws.amazon.com/singlesignon/latest/userguide/how-to-with-scim.html): Enable Identity Center automatic provisioning and obtain endpoint/token before configuring SCIM at external IdP; SCIM is distinct from SAML authentication.

## Q006

Kết luận C và giới hạn ViaService đúng; rút gọn.

Policy chỉ cho ExampleRole dùng key gắn policy qua WorkMail hoặc SES ở us-west-2. Resource * trong key policy chỉ key này, không phải mọi key trong account.

- Q006:A: Sai: role là principal được cấp quyền, không phải service nhận quyền do role cấp.
- Q006:B: Sai: không quy định nội dung email hay owner mà giới hạn luồng gọi dịch vụ.
- Q006:C: Đúng: role và ViaService/Region phải khớp.
- Q006:D: Sai: * không mở rộng sang mọi customer managed key.

Keywords: key policy, customer managed key

Tip: Nếu Resource * xuất hiện trong KMS key policy, đọc nó là key đang gắn policy.

Source issues: SES và WorkMail đều có trong danh sách ViaService hiện hành.

Primary sources (accessed 2026-09-30):

- [via](https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html): kms:ViaService restricts forward-access requests; SES and WorkMail are supported; Resource * in a key policy means the attached key.

## Q007

Bucket ARN không deny object APIs; principal đúng không đủ để verified whole policy.

B xác định đúng STS federated-user/Bob và dùng explicit deny, nhưng bucket ARN không bao phủ GetObject/DeleteObject. Cần cả bucket ARN và bucket/* để chặn toàn bộ truy cập dữ liệu như đề yêu cầu.

- Q007:A: Sai: Allow không deny Bob.
- Q007:B: Chưa đủ: đúng federated principal nhưng thiếu ARN object /*.
- Q007:C: Sai: IAM user/Bob khác STS federated-user/Bob.
- Q007:D: Sai: assumed-role session là loại principal khác.

Keywords: federated user, Bob, bucket policy

Tip: Nếu deny cả bucket và dữ liệu S3, liệt kê cả ARN bucket và ARN bucket/*.

Source issues: Tất cả ảnh chỉ có bucket ARN, không đáp án đầy đủ cho object access.

Primary sources (accessed 2026-09-30):

- [principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html): IAM user, assumed-role session, and STS federated-user are distinct principals; Lambda function ARN is not an IAM principal.
- [s3resource](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html): Object operations such as GetObject require object ARNs; bucket ARN alone covers bucket operations.

## Q008

Không chấm full mapping; P1/P5 trùng; custom insights không tự chứng minh multi-stage correlation.

Không có full mapping hợp lệ vì P1/P5 trùng nhau nhưng mỗi response chỉ được dùng một lần. P2→R4, P3→R3 và P4→R1 hợp lý; P1/P5 đều phù hợp R5.

- Q008:P1: P1: phù hợp R5 vì bytes/destination/time, nhưng bị trùng P5.
- Q008:P2: P2: R4; metric filters đếm lỗi theo source IP trong một giờ.
- Q008:P3: P3: R3 gần nhất; Insights phát hiện tốc độ API bất thường, cần lọc CloudTrail để xác định privileged user/delete.
- Q008:P4: P4: R1; EventBridge/Lambda có thể cách ly instance theo finding.
- Q008:P5: P5: phù hợp R5 giống P1, không thể gán khác để hoàn thành one-use.
- Q008:R1: R1: cần tự động remediation, phù hợp P4.
- Q008:R2: R2: custom insights nhóm findings không tự chứng minh tương quan chuỗi tấn công; thiếu prompt riêng.
- Q008:R3: R3: P3 là gần nhất nhưng cần scope API và user bổ sung.
- Q008:R4: R4: P2 đếm xác thực thất bại theo IP.
- Q008:R5: R5: đồng thời P1 và P5, gây lỗi đề.

Keywords: one time, multi-stage attacks, office hours

Tip: Nếu hai prompt trùng nhau mà đáp án chỉ dùng một lần, giữ trạng thái unresolved và sửa nguồn trước khi chấm.

Source issues: Đã xem ảnh và xác nhận hàng 1/hàng 5 trùng; distances là typo instances; không ép một full mapping.

Primary sources (accessed 2026-09-30):

- [flow](https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-cwl.html): VPC Flow Logs in CloudWatch describe traffic with address, time, and bytes fields for queries.
- [metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html): Metric filters extract log events and dimensions for counters and alarms.
- [ctinsight](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-insights-events-with-cloudtrail.html): CloudTrail Insights detects unusual API write-call rates against a baseline; user attribution requires investigation of underlying events.
- [hubinsight](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-custom-insights.html): Custom insights group/filter findings; this is not itself sequential multi-stage attack correlation.
- [hubevent](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-all-findings.html): Security Hub finding events can trigger EventBridge and Lambda remediation.

## Q009

Giữ B; compliance retention và Object Lock đích là điều kiện cần đã nêu.

Dùng Object Lock compliance và replication sang bucket đích đã bật Object Lock để sao chép retention. Trong thời hạn retention, ngay cả administrator/root cũng không xóa vĩnh viễn version được bảo vệ.

- Q009:A: Sai: admin có quyền có thể gỡ governance vault lock rồi xóa recovery point; active lock vẫn chặn xóa trước retention.
- Q009:B: Đúng khi bucket đích bật Object Lock và replication retention.
- Q009:C: Sai: ReplicateDelete không chặn admin trực tiếp xóa version.
- Q009:D: Sai: versioning vẫn cho phép người có quyền xóa version.

Keywords: administrator access, secondary Region, permanently delete

Tip: Nếu phải chống cả administrator trong thời hạn lưu giữ, dùng compliance retention và bảo đảm bucket replica cũng bật Object Lock.

Primary sources (accessed 2026-09-30):

- [lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html): Compliance retention cannot be bypassed by administrators/root during retention; governance can be bypassed with permission.
- [replica](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html): Object Lock replication requires enabled destination Object Lock and replicates retention metadata.
- [vaultlock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html): An active Backup Vault Lock denies early deletion in either mode; authorized administrators can remove a governance lock, then delete recovery points. Compliance is immutable after grace time.

## Q010

State enabled/usable mâu thuẫn PendingReplicaDeletion, nên B chỉ là ý định sau sửa nguồn.

mrk- gợi ý multi-Region key: phải xóa mọi replica trước khi primary bắt đầu thời gian chờ tối thiểu 7 ngày. Tuy nhiên key đã scheduled deletion không thể vẫn enabled/usable như đề mô tả.

- Q010:A: Sai: root không bỏ qua thời gian chờ hoặc dependency replica.
- Q010:B: Phù hợp ý định: tìm và schedule các replica cùng key ID với 7 ngày.
- Q010:C: Sai: thêm quyền kms:* không xử lý dependency replica.
- Q010:D: Sai: 30 ngày làm chậm hơn và không xử lý replica.

Keywords: multiple AWS Regions, enabled and usable, as quickly as possible

Tip: Nếu primary ở PendingReplicaDeletion, xóa replicas trước rồi tính thời gian chờ primary.

Source issues: ARN chứa dấu ;, account ID và key ID có lỗi; enabled/usable mâu thuẫn state; không thể xóa ngay.

Primary sources (accessed 2026-09-30):

- [delete](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html): Multi-Region primary deletion waits for all replicas to be deleted; 7–30-day primary waiting period begins after replicas disappear.
- [keystate](https://docs.aws.amazon.com/kms/latest/developerguide/key-state.html): PendingReplicaDeletion and PendingDeletion keys cannot perform cryptographic operations.

## Q011

Tách native shell khỏi SSH-over-SSM và ghi pricing chính thức có ngày hiệu lực hiện hành; không verified mọi literal yêu cầu.

Session Manager shell đáp ứng truy cập bảo trì không cần SSH key và không mở inbound port. SSH thực sự qua Session Manager vẫn cần key; tính phí theo machine-hours của đề không khớp pricing hiện hành.

- Q011:A: Sai: bastion cần đường mạng và quản trị SSH keys.
- Q011:B: Gần nhất: Session Manager shell, nhưng không thỏa literal SSH không key và machine-hours.
- Q011:C: Sai: CloudShell không tự cung cấp truy cập riêng tới máy EC2/on-premises.
- Q011:D: Sai: interface endpoint chỉ là đường kết nối dịch vụ, không thay quản lý phiên/xác thực.

Keywords: on-premises servers, SSH keys, machine hours

Tip: Nếu không muốn SSH keys, dùng native Session Manager shell và kiểm tra phí hybrid hiện hành theo phiên.

Source issues: Pricing chính thức: bỏ Advanced Instances Tier 2026-06-30; $0.05/hybrid session từ 2026-09-30, không hourly; hoàn toàn isolated còn cần outbound/private service path.

Primary sources (accessed 2026-09-30):

- [ssm](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html): Session Manager provides managed shell sessions without inbound SSH ports or SSH keys, including hybrid nodes.
- [ssmssh](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-enable-ssh-connections.html): Actual SSH over Session Manager requires a public key/PEM already associated with the managed node.
- [ssmprice](https://aws.amazon.com/systems-manager/pricing/): Pricing page explicitly records Advanced Instances Tier removal June 30, 2026, and hybrid Session Manager $0.05/session effective September 30, 2026; EC2 Session Manager has no additional charge.

## Q012

Giữ C; hai GuardDuty features và runtime-node support được xác nhận.

GuardDuty EKS Protection phân tích audit logs; Runtime Monitoring bổ sung sự kiện OS, mạng và file. EventBridge chuyển finding tới SNS email, với runtime agent và loại node được hỗ trợ.

- Q012:A: Sai: Security Hub tổng hợp posture/findings, không tự thu mọi runtime event.
- Q012:B: Sai: Inspector/Detective không thay EKS audit và runtime threat detection này.
- Q012:C: Đúng: bật cả EKS Protection và Runtime Monitoring, route findings qua EventBridge tới SNS.
- Q012:D: Sai: cảnh báo mọi audit log không tương đương phát hiện nguy cơ runtime.

Keywords: audit logs, file events, email alerts

Tip: Nếu cần audit lẫn OS/network/file, bật hai tính năng GuardDuty và xác nhận node hỗ trợ runtime agent.

Source issues: Runtime Monitoring không hỗ trợ EKS Fargate; không cần bật CloudWatch audit stream riêng cho GuardDuty.

Primary sources (accessed 2026-09-30):

- [eks](https://docs.aws.amazon.com/guardduty/latest/ug/kubernetes-protection.html): EKS Protection analyzes EKS audit logs through an independent data stream.
- [runtime](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring.html): Runtime Monitoring analyzes OS, network, and file events using agent support; EKS Fargate is not supported.
- [gdevent](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html): GuardDuty findings can trigger EventBridge targets, including SNS notifications.

## Q013

E sai dấu đóng biến và shorthand ARN; AE chỉ sau sửa nguồn, không verified literal option.

Dùng thing name làm client ID và policy server-side ràng buộc iot:Connect với ThingName của danh tính đã gắn thing. A/E là ý định đúng nhưng chuỗi biến của E phải sửa dấu đóng và dùng đầy đủ resource ARN.

- Q013:A: Đúng khi policy xác thực cũng buộc client ID khớp thing.
- Q013:B: Sai: Trojan có thể bỏ qua kiểm tra phía client.
- Q013:C: Sai: AWSIoTWirelessDataAccess/principal client không phải iot:Connect resource policy phù hợp.
- Q013:D: Sai: ClientId tự tham chiếu vẫn cho client tự chọn resource.
- Q013:E: Đúng về ý định nếu sửa ${iot:Connection.Thing.ThingName} và ARN, với principal đã gắn thing.

Keywords: client ID, special characters, privilege scope

Tip: Nếu ClientId do client kiểm soát, bind Connect vào authenticated ThingName ở policy server-side.

Source issues: E đóng biến bằng ) thay }; shorthand client/... thiếu ARN; literal policy không hợp lệ.

Primary sources (accessed 2026-09-30):

- [iotclient](https://docs.aws.amazon.com/iot/latest/developerguide/basic-policy-variables.html): Untrusted ClientId substitutions can broaden policy resources; ClientId self-reference does not bind a client to a trusted thing.
- [iotthing](https://docs.aws.amazon.com/iot/latest/developerguide/thing-policy-variables.html): ThingName policy variable requires associated authenticated principal and matching thing-name client ID.

## Q014

Giữ B; giải thích Daily recording rõ thay vì coi mọi thay đổi nhanh tự gộp.

AWS Config configuration item là bản ghi trạng thái cấu hình phù hợp để đánh giá tác động tích lũy. Nếu chỉ muốn trạng thái cuối theo khoảng thời gian, cấu hình Daily recording; Continuous mặc định không bảo đảm chỉ một bản ghi cuối.

- Q014:A: Sai: CloudTrail ghi API activity, không snapshot cấu hình tích lũy.
- Q014:B: Đúng: xem CI mới nhất của AWS Config, chọn recording frequency phù hợp.
- Q014:C: Sai: CloudWatch không thay resource configuration item.
- Q014:D: Sai: Cloud Map phục vụ service discovery, không ghi trạng thái compliance.

Keywords: configuration changes, latest configuration, cumulative impact

Tip: Nếu muốn chỉ trạng thái cấu hình mới nhất trong 24 giờ, đặt AWS Config Daily recording.

Source issues: Không có cơ sở hiện hành cho khẳng định mọi thay đổi nhanh tự động bị gộp bởi Continuous recorder.

Primary sources (accessed 2026-09-30):

- [config](https://docs.aws.amazon.com/config/latest/developerguide/how-does-config-work.html): AWS Config configuration items describe resource configuration state and change history.
- [daily](https://docs.aws.amazon.com/config/latest/APIReference/API_RecordingMode.html): Daily recording captures latest configuration change over 24 hours; continuous recording records changes as they occur.

## Q015

Không giữ verified nếu custom key store phải tạo cả asymmetric data-key pair; cần key store chuẩn riêng.

KMS custom CloudHSM store đáp ứng symmetric master key và CloudTrail audit. GenerateDataKeyPair không hỗ trợ custom key store, nên cần một KMS key thông thường riêng nếu còn phải tạo asymmetric data key pairs.

- Q015:A: Chưa đủ: Athena truy vấn log nhưng không thay CloudTrail recorder; custom-store limitation vẫn còn.
- Q015:B: Sai: S3 không cung cấp KMS data-key generation.
- Q015:C: Sai: GuardDuty là threat detection, không audit mọi KMS operation.
- Q015:D: Gần nhất: KMS/CloudHSM và CloudTrail, nhưng asymmetric pair cần key ngoài custom store.

Keywords: custom key store, asymmetric data key pairs, audit

Tip: Nếu cần GenerateDataKeyPair, dùng symmetric KMS key thông thường để bảo vệ pair, không dùng key trong custom store.

Source issues: Không lựa chọn nào thỏa nếu mọi data keys bắt buộc sinh bằng custom-store key; phân biệt key type và API capability.

Primary sources (accessed 2026-09-30):

- [hsm](https://docs.aws.amazon.com/kms/latest/developerguide/keystore-cloudhsm.html): CloudHSM custom stores create symmetric AES-256 KMS key material in HSM and perform supported cryptographic operations there.
- [pair](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyPair.html): GenerateDataKeyPair cannot use a KMS key in a custom key store.
- [kmsaudit](https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html): CloudTrail logs AWS KMS API operations for auditing.

## Q016

Giữ C; không suy mặc định never-expire áp dụng log group hiện có; đặt/kiểm tra >=365 ngày.

Đưa CloudWatch agent vào AMI để các instance mới stream log ra CloudWatch Logs trước scale-in. Đặt retention ít nhất 365 ngày và kiểm tra retention của log group hiện có.

- Q016:A: Sai: EBS riêng không tự bảo đảm không bị xóa/khả dụng sau termination.
- Q016:B: Sai: copy mỗi ngày có thể mất log giữa hai lần copy trước scale-in.
- Q016:C: Đúng: stream log tập trung và retention >=365 ngày.
- Q016:D: Sai: review thủ công không cung cấp lưu trữ bền một năm.

Keywords: Auto Scaling group, scale-in event, 1 year

Tip: Nếu log chỉ nằm trên instance Auto Scaling, stream ra dịch vụ log tập trung và đặt retention trước khi scale-in.

Primary sources (accessed 2026-09-30):

- [cwagent](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html): CloudWatch agent streams configured local logs and supports retention_in_days including 365; new groups default never-expire, existing retention must be checked.

## Q017

Giữ A; endpoint policy chặn cả external credentials, SCP không làm được.

Giới hạn S3 gateway endpoint theo cả PrincipalOrgID và ResourceOrgID để chặn principal/bucket ngoài organization trên đường ra duy nhất. Chỉ sửa instance role hoặc SCP không ngăn kẻ tấn công dùng thông tin xác thực ngoài organization qua endpoint mặc định.

- Q017:A: Đúng: ràng buộc principal và tài nguyên trong org trên mọi request qua endpoint.
- Q017:B: Sai: instance role vốn hạn chế bucket; attacker có thể dùng credentials khác.
- Q017:C: Sai: chặn 443 làm job S3 ngừng hoạt động.
- Q017:D: Chưa đủ: SCP không kiểm soát principal ngoài organization và Allow riêng không thay deny.

Keywords: default access policy, outside, exfiltrating data

Tip: Nếu attacker có thể dùng credentials khác trên máy bị xâm nhập, đặt resource perimeter ở endpoint thay vì chỉ sửa instance role.

Primary sources (accessed 2026-09-30):

- [perimeter](https://docs.aws.amazon.com/whitepapers/latest/building-a-data-perimeter-on-aws/perimeter-implementation.html): Endpoint policies constrain all traversing principals; SCPs constrain organization principals; resource and principal organization keys implement data perimeters.

## Q018

Giữ A; PITR tạo cluster mới và timestamp cần timezone/earliest-latest restorable range.

Khôi phục đúng cluster bằng PITR tới 3:14 PM của ngày cách đây 5 ngày, trước thời điểm tấn công và trong retention 14 ngày. PITR tạo cluster mới; cần quy đổi timezone đúng khi nhập timestamp.

- Q018:A: Đúng: thời điểm gần nhất được nêu trước cuộc tấn công.
- Q018:B: Sai: snapshot gần nhất có thể sau tấn công hoặc mất dữ liệu hơn PITR.
- Q018:C: Sai: khôi phục database khác không phục hồi cluster bị ảnh hưởng.
- Q018:D: Sai: 14 ngày gây mất dữ liệu không cần thiết.

Keywords: last known good version, 14 days, 3:15 PM

Tip: Nếu thời điểm bắt đầu tấn công đã biết và nằm trong retention, PITR tới ngay trước thời điểm đó.

Primary sources (accessed 2026-09-30):

- [pit](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_RestoreDBClusterToPointInTime.html): PITR restores a new database cluster at a requested time within available retention.

## Q019

Disable Identity Center user không revoke active AWS role sessions; sửa kết luận immediate và phân biệt IAM user/IdC user.

CloudTrail Lake truy vấn được lịch sử tổ chức, nhưng IAM user khác Identity Center user. Disable người dùng Identity Center không thu hồi AWS role sessions đã phát hành, nên D không chặn ngay mọi account.

- Q019:A: Chưa đủ: IAM user chỉ thuộc một account; disable ở management account không thu hồi mọi assumed-role session.
- Q019:B: Sai: xóa policy không giải quyết đầy đủ active role sessions, Security Hub không truy vấn mọi API log.
- Q019:C: Sai: xóa assignments không tự thu hồi active role sessions; Logs Insights không trực tiếp query S3 trail.
- Q019:D: Gần nhất về truy vấn: Lake đúng, nhưng identity sai phạm vi và disable đơn lẻ không revoke active sessions.

Keywords: compromised IAM user, immediately, previous 7 days

Tip: Nếu dùng Identity Center, revoke cả assignment/session và chặn role sessions; dùng CloudTrail Lake để truy vấn lịch sử.

Source issues: Không option đáp ứng literal IAM user + mọi AWS account + immediate; cần phân biệt credentials/IdC user/role session.

Primary sources (accessed 2026-09-30):

- [revokeidc](https://docs.aws.amazon.com/singlesignon/latest/userguide/revoke-user-permissions.html): Complete revocation includes deny/SCP, assignment removal and sessions; disabling a user alone does not invalidate already-issued role sessions.
- [lake](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-event-data-store.html): CloudTrail Lake SQL queries organizational event data stores for event history.
- [principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html): IAM user, assumed-role session, and STS federated-user are distinct principals; Lambda function ARN is not an IAM principal.

## Q020

Giữ A; Inspector phát hiện và Patch Manager khắc phục.

Inspector phát hiện lỗ hổng phần mềm trên EC2; Systems Manager Patch Manager triển khai bản vá và kiểm tra compliance. Hai dịch vụ bổ sung cho nhau để phát hiện và khắc phục.

- Q020:A: Đúng: Inspector để phát hiện, Patch Manager để vá.
- Q020:B: Sai: firewall/antivirus không thay CVE scanning và patching.
- Q020:C: Sai: log/metric monitoring không cung cấp vulnerability scanning/remediation.
- Q020:D: Sai: Malware Protection tìm malware, không thay package vulnerability assessment.

Keywords: detect and mitigate, software vulnerabilities, EC2 instances

Tip: Nếu yêu cầu cả phát hiện CVE và khắc phục, kết hợp vulnerability scanner với Patch Manager.

Primary sources (accessed 2026-09-30):

- [inspector](https://docs.aws.amazon.com/inspector/latest/user/scanning-ec2.html): Inspector detects EC2 package vulnerabilities and network exposure; it does not patch them.
- [patch](https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html): Patch Manager automates patch installation and patch compliance.

## Q021

Giữ C; lấy mẫu hằng ngày, full job chỉ object/format đủ điều kiện; không hứa mọi object.

Macie automated discovery lấy mẫu đại diện hằng ngày để xác định bucket có dữ liệu nhạy cảm, rồi chạy discovery jobs toàn bộ phạm vi object được hỗ trợ trong bucket đó. Đây là luồng ít quản trị nhất trong các lựa chọn.

- Q021:A: Sai: replicate để scan thêm chi phí và vận hành.
- Q021:B: Sai: tự Lambda/on-upload tăng triển khai và vẫn cần discovery job phù hợp.
- Q021:C: Đúng: automated sampling trước, full job trên bucket liên quan sau.
- Q021:D: Sai: thêm DynamoDB/custom inventory không cần cho Macie native results.

Keywords: many S3 buckets, additional scanning, LEAST administrative overhead

Tip: Nếu phải ưu tiên scan sâu trong nhiều bucket, dùng automated discovery để chọn bucket rồi chạy targeted jobs.

Source issues: Full scan chỉ các object đủ điều kiện và định dạng/storage class được hỗ trợ, không mọi object/version tuyệt đối.

Primary sources (accessed 2026-09-30):

- [maciedaily](https://docs.aws.amazon.com/macie/latest/user/discovery-asdd-how-it-works.html): Automated discovery evaluates representative supported S3 object samples daily; discovery jobs can inspect selected buckets more thoroughly.

## Q022

Giữ D; không nói import key nói chung bất khả thi, mà key mới không giải mã snapshot cũ; cross-account cần hai phía.

Mã hóa snapshot bằng customer managed KMS key và cấp quyền snapshot/key cho hai account nhận. Bên nhận cần key policy cùng IAM permission để copy/restore theo cơ chế RDS hỗ trợ.

- Q022:A: Sai: không thể export AWS managed KMS key material.
- Q022:B: Sai: import cùng material vào key mới không giúp giải mã snapshot mã hóa bởi key cũ; phải share key gốc.
- Q022:C: Sai: default AWS managed RDS key không hỗ trợ chia sẻ encrypted snapshot.
- Q022:D: Đúng: customer key có cross-account key access và snapshot sharing.

Keywords: two accounts, encrypted, decrypt the snapshots

Tip: Nếu chia sẻ encrypted RDS snapshot khác account, dùng customer managed key và cấp quyền cả snapshot lẫn key.

Primary sources (accessed 2026-09-30):

- [snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html): Encrypted snapshot sharing requires customer managed key access for recipient accounts; default AWS managed RDS key snapshots cannot be shared.

## Q023

A chỉ Aurora MySQL; unspecified engine cần ambiguous thay vì verified mặc dù caveat đã có.

require_secure_transport=ON bắt buộc TLS cho Aurora MySQL. Aurora PostgreSQL dùng rds.force_ssl, nên A chỉ đúng khi bổ sung engine MySQL mà đề hiện không nêu.

- Q023:A: Đúng có điều kiện: require_secure_transport thuộc Aurora MySQL.
- Q023:B: Sai: Kerberos xác thực không tự bắt buộc TLS cho mọi kết nối.
- Q023:C: Sai: ACM certificate không phải cơ chế attach/enforce TLS của Aurora.
- Q023:D: Chưa đủ: thêm proxy không tự chặn đường kết nối trực tiếp hoặc bắt buộc TLS nếu chưa cấu hình.

Keywords: Aurora cluster, all connections, in transit

Tip: Nếu Aurora MySQL, bật require_secure_transport; nếu PostgreSQL, bật rds.force_ssl.

Source issues: Engine không được chỉ định; API/parameter khác giữa hai Aurora engines.

Primary sources (accessed 2026-09-30):

- [mysql](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Security.html): require_secure_transport=ON enforces TLS for Aurora MySQL.
- [postgres](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Security.html): Aurora PostgreSQL TLS enforcement uses rds.force_ssl, not require_secure_transport.

## Q024

Đổi null/ambiguous thành C: ứng dụng được phép thay đổi nên có thể dùng shared rolling atomic counter; least effort chỉ so các đáp án đáp ứng.

Thực thi bộ đếm theo IP trong ứng dụng bằng state dùng chung và cập nhật atomic để áp mức 3 lần trong cửa sổ trượt 5 phút. WAF rate-based rule hiện có minimum 10 và chỉ xấp xỉ, nên không thể cấu hình chính xác 3.

- Q024:A: Sai: WAF Limit nhỏ nhất hiện là 10, không phải 3.
- Q024:B: Sai: alert/Lambda không phải synchronous read quota enforcement.
- Q024:C: Đúng có điều kiện: counter phải chia sẻ across EC2 và enforce cửa sổ trượt/atomic.
- Q024:D: Sai: TTL xóa bất đồng bộ và provisioned capacity không tạo quota per IP.

Keywords: stateless application, 3 times, 5-minute period

Tip: Nếu hạn mức nhỏ hơn WAF minimum hoặc cần chính xác, enforce bằng application counter dùng chung.

Source issues: Không dùng số minimum WAF 100 đã lỗi thời; stateless fleet không được dùng counter local per instance.

Primary sources (accessed 2026-09-30):

- [wafrate](https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html): Current WAF rate-based Limit minimum is 10; evaluation windows include 300 seconds; rate limiting is approximate.
- [atomic](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/example_dynamodb_Scenario_AtomicCounterOperations_section.html): DynamoDB supports atomic counters and optimistic locking to implement shared application state; exact rolling quota still needs correctly designed time-window state.
- [ttl](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html): DynamoDB TTL expiry deletion is asynchronous, typically within days; it is not a synchronous five-minute request limiter.

## Q025

Giữ B; stateless return/ephemeral và thứ tự rule đúng.

B deny inbound 3306 trước allow inbound ephemeral 1024–65535, đồng thời allow outbound 443. Thứ tự này vừa chặn MySQL vừa cho phép response TLS trong NACL stateless.

- Q025:A: Sai: inbound 443 không cho return traffic tới ephemeral port của client.
- Q025:B: Đúng: deny 3306 số nhỏ hơn rule allow ephemeral; outbound 443.
- Q025:C: Sai: allow 1024–65535 trước deny 3306 sẽ match 3306 và bỏ qua deny sau.
- Q025:D: Sai: không mở inbound ephemeral nên response TLS bị chặn.

Keywords: custom network ACL, port 443, port 3306

Tip: Nếu dùng NACL cho outbound HTTPS, mở inbound ephemeral và đặt deny đặc biệt trước range allow.

Primary sources (accessed 2026-09-30):

- [nacl](https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html): NACLs are stateless, evaluate lowest rule first, and TLS outbound return traffic requires inbound ephemeral ports.

## Q026

Không loại B chỉ vì inline policy: inline attach role là hợp lệ; task role không cô lập specific container; DBA plaintext vẫn cần hạn chế riêng.

Secrets Manager có rotation cùng task IAM role là thiết kế gần nhất. Inline policy trên task role cũng hợp lệ; role không cô lập từng container và không ngăn DBA chia sẻ mật khẩu họ đã biết.

- Q026:A: Sai: Parameter Store không cung cấp RDS rotation native; EC2 instance profile không thay task role.
- Q026:B: Có thể đúng nếu inline policy gắn task role và rotation bật; không thể loại chỉ vì inline policy.
- Q026:C: Sai: Parameter Store mã hóa không tự cung cấp rotation yêu cầu.
- Q026:D: Tốt nhất: Secrets Manager rotation và task IAM role, với giới hạn task/container và DBA access.

Keywords: rotated periodically, application only, plaintext

Tip: Nếu nhiều container cần quyền khác nhau, tách task và role; chỉ cấp GetSecretValue cho role ứng dụng, không DBA.

Source issues: B mô tả inline policy chưa xác định nơi attach; D không đảm bảo isolation giữa containers; rotation phải cấu hình, không mặc định.

Primary sources (accessed 2026-09-30):

- [taskrole](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html): Task IAM role provides AWS permissions to containers in a task; containers within the task are not a credential isolation boundary.
- [rotate](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html): Secrets Manager supports configured automated secret rotation, including RDS integration.
- [inline](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html): Inline policies can be embedded in IAM roles; policy form alone is not a reason to reject a valid task role.

## Q027

Giữ AC; conditional Allow đơn lẻ không buộc tất cả requests dùng VPCE nếu còn Allow khác.

KMS interface endpoint với private DNS đưa kết nối vào private endpoint; key policy ràng buộc SourceVpce buộc request qua endpoint đó. Để cưỡng chế thật sự, dùng deny ngoài endpoint hoặc loại bỏ mọi đường allow thay thế.

- Q027:A: Đúng: SourceVpce kiểm tra endpoint ID, với policy enforce đầy đủ.
- Q027:B: Sai: thêm virtual private gateway không tự cung cấp KMS private endpoint.
- Q027:C: Đúng: endpoint và private DNS cho đường gọi private.
- Q027:D: Sai: import key material không thay đường network của KMS API.
- Q027:E: Sai: SourceIp 10.0.0.0/16 không nhận diện request qua interface endpoint.

Keywords: within the AWS network, public service endpoints

Tip: Nếu phải bắt buộc VPCE, deny requests không có SourceVpce phù hợp; xét ngoại lệ service integrations cần thiết.

Primary sources (accessed 2026-09-30):

- [vpce](https://docs.aws.amazon.com/kms/latest/developerguide/vpce-policy-condition.html): KMS policy aws:SourceVpce identifies endpoint; SourceIp is not usable to identify requests through interface endpoints.
- [dns](https://docs.aws.amazon.com/kms/latest/developerguide/vpce-connect.html): KMS interface endpoints with private DNS resolve normal KMS endpoint names to private endpoint addresses.

## Q028

Giữ D; revoke issued sessions trước cutoff, không ngăn phát hành credentials mới nếu instance còn bị kiểm soát.

Thu hồi các session của IAM role gắn instance profile để credentials bị đánh cắp không còn gọi AWS API. Thay inbound security group không chặn API call thực hiện từ bên ngoài bằng credentials đó.

- Q028:A: Sai: inbound network rule không vô hiệu hóa AWS credentials bị đánh cắp.
- Q028:B: Sai: inventory không ngăn attacker dùng token.
- Q028:C: Sai: vulnerability scan không thu hồi token.
- Q028:D: Đúng: revoke active role sessions issued trước thời điểm thu hồi.

Keywords: InstanceCredentialExfiltration, API access keys, first step

Tip: Nếu instance credentials bị dùng ngoài AWS, revoke role sessions trước rồi tiếp tục xử lý nguồn xâm nhập.

Source issues: Revoke có thể ảnh hưởng ứng dụng; không ngăn attacker lấy credentials mới nếu instance vẫn bị kiểm soát.

Primary sources (accessed 2026-09-30):

- [revokerole](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html): Role-session revocation attaches a deny for temporary credentials issued before the revocation time.

## Q029

Giữ B; sửa D tránh khẳng định KMS không bao giờ trả plaintext keys; SSE-C không chịu KMS decrypt authorization như SSE-KMS.

SSE-KMS với customer managed key chia quyền S3 cho operations và quyền decrypt cho security. Đọc plaintext cần đồng thời quyền GetObject và kms:Decrypt, nên một bên cấu hình sai không tự đủ quyền.

- Q029:A: Sai: SSE-S3 không có customer KMS policy riêng để chia hai tầng quyền.
- Q029:B: Đúng: enforce customer-key SSE-KMS và tách S3/key policy administration.
- Q029:C: Sai: SSE-S3 do S3 quản lý key không đáp ứng tách quyền decrypt này.
- Q029:D: Sai: SSE-C dùng key khách hàng cung cấp và không buộc kms:Decrypt như SSE-KMS, nên không tạo hai tầng quyền theo mô tả.

Keywords: separate the duties, plaintext data, encryption keys

Tip: Nếu cần hai nhóm cùng cho phép mới đọc được plaintext, dùng customer-key SSE-KMS và tách quyền S3/KMS.

Primary sources (accessed 2026-09-30):

- [ssekms](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html): Reading SSE-KMS objects requires S3 access and KMS decrypt authorization; customer managed keys allow separate key policy control.
- [ssec](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html): SSE-C requires customer-supplied encryption keys with requests; it does not provide SSE-KMS dual S3/KMS authorization.

## Q030

Giữ A; sensitive publication opt-in từng account/Region, delegated admin không thay settings member tự động.

Chọn security account làm delegated administrator cho Macie và Security Hub để quản lý discovery xuyên organization và tổng hợp findings. Bật publication sensitive-data findings theo account/Region cần thiết, vì Macie không gửi loại này mặc định.

- Q030:A: Đúng: Macie phát hiện S3 sensitive data và Security Hub tổng hợp findings.
- Q030:B: Sai: Inspector không phân loại dữ liệu nhạy cảm trong S3.
- Q030:C: Sai: Inspector vẫn không tạo sensitive-data inventory.
- Q030:D: Sai: Trusted Advisor không là đích tích hợp Macie sensitive findings thay Security Hub.

Keywords: across the organization, single location, sensitive data

Tip: Nếu muốn Macie sensitive findings trong Security Hub, bật publication loại này và kiểm tra từng account/Region.

Source issues: Publication sensitive findings opt-in; delegated administrator không tự thay publication settings mọi member account.

Primary sources (accessed 2026-09-30):

- [macieorg](https://docs.aws.amazon.com/macie/latest/user/accounts-mgmt-ao.html): Organizations Macie delegated administrator centrally manages discovery and findings in member accounts.
- [maciepublish](https://docs.aws.amazon.com/macie/latest/user/findings-publish-frequency.html): Publishing sensitive-data findings to Security Hub is opt-in, configured per account and Region; default publication concerns policy findings.

## Q031

Giữ B; test domain phải thực sự trong threat/test context; example.com không tự sinh finding.

GuardDuty không thấy DNS requests dùng custom resolver như OpenDNS, nên không sinh DNS finding tương ứng để gửi Security Hub. GuardDuty tự thu nguồn log nền tảng; không cần tự bật VPC Flow Logs cho nó.

- Q031:A: Sai: GuardDuty thu nguồn log độc lập, không cần khách tự tạo Flow Logs.
- Q031:B: Đúng: custom DNS không được foundational DNS monitoring hỗ trợ.
- Q031:C: Sai: tích hợp GuardDuty/Security Hub tự có khi hai dịch vụ đã bật; không cần forward custom.
- Q031:D: Sai: hệ thống chỉ một Region, không có vấn đề cross-Region như phương án.

Keywords: DNS requests, test domain, single AWS Region

Tip: Nếu test DNS finding, dùng AWS resolver và domain/test threat-list phù hợp loại finding.

Source issues: example.com tự thân không chứng minh malicious domain; cần biết test/threat-list đã cấu hình.

Primary sources (accessed 2026-09-30):

- [gdsource](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html): GuardDuty collects its foundational sources independently; DNS monitoring requires AWS resolver rather than a custom DNS resolver.
- [gdhub](https://docs.aws.amazon.com/guardduty/latest/ug/securityhub-integration.html): GuardDuty automatically sends findings when Security Hub integration is enabled by both services.

## Q032

Giữ BC; Cognito đã có minimum length nên premise không có bất kỳ minimum là sai literal.

Đặt độ dài mật khẩu ở Cognito user pool cho người dùng local và ở Active Directory cho danh tính federation. IAM password policy không áp lên password của external IdP.

- Q032:A: Sai: IAM policy chỉ áp mật khẩu IAM users, không AD-federated users.
- Q032:B: Đúng: Cognito password policy cho local user database.
- Q032:C: Đúng: AD kiểm soát password của người dùng được AD xác thực.
- Q032:D: Sai: SCP giới hạn AWS permissions, không validate password login của AD/Cognito.
- Q032:E: Sai: IAM condition không cung cấp minimum-password-length login chung này.

Keywords: Active Directory, user database, required minimum length

Tip: Nếu danh tính federation, sửa password policy tại IdP thực sự xác thực người dùng.

Source issues: Cognito vốn có minimum length >=6; no required minimum là premise không chính xác nếu hiểu theo nghĩa không có bất kỳ minimum nào.

Primary sources (accessed 2026-09-30):

- [cognitopwd](https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users-passwords.html): User-pool password policy controls Cognito local users and already has a minimum-length constraint.
- [iampwd](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_passwords_account-policy.html): IAM account password policies govern IAM users, not federated users authenticated by an external IdP.

## Q033

Giữ C; User-Agent có thể giả mạo, block marker không bảo đảm chặn mọi credential stuffing.

WAF rule match User-Agent của emulator và block request tới ALB, với default allow cho request khác. Dấu hiệu này xử lý nguồn IP phân tán nhưng attacker có thể đổi User-Agent nên đây là giảm thiểu theo marker đã cho.

- Q033:A: Sai: thông báo số lần login không trực tiếp block attack.
- Q033:B: Sai: security group không có deny hoặc kiểm tra User-Agent.
- Q033:C: Đúng: WAF header string match với Block chặn marker được nêu.
- Q033:D: Sai: allow các User-Agent đã biết không tự block marker này và dễ chặn login hợp lệ.

Keywords: many IP addresses, user agent string, legitimate logins

Tip: Nếu attack có marker HTTP header ổn định, dùng WAF block marker và kiểm tra false positives.

Source issues: User-Agent spoofable; không nên diễn giải đây là biện pháp chặn mọi credential stuffing.

Primary sources (accessed 2026-09-30):

- [string](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-string-match.html): WAF string match rules can match HTTP header values including User-Agent.
- [sg](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html): Security group rules allow traffic and cannot express deny rules or inspect HTTP headers.

## Q034

Giữ A; gắn WAF trước cả hai instance và restrict direct path để tránh bypass.

Đặt hai EC2 sau ALB, gắn WAF SQL injection rule rồi chuyển DNS khi sẵn sàng; hạn chế EC2 chỉ nhận web traffic từ ALB để tránh bypass. Cách này giữ hai backend đang hoạt động và không cần sửa legacy code trong 24 giờ.

- Q034:A: Đúng: ALB/WAF trước hai backend và chuyển DNS có kiểm soát.
- Q034:B: Chưa đủ: CloudFront một EC2 làm giảm HA và direct EC2 path cần chặn riêng.
- Q034:C: Sai: tự vá legacy source khó đạt yêu cầu ít công sức trong 24 giờ.
- Q034:D: Sai: WAF không gắn trực tiếp EC2; đóng DB port không ngăn SQLi qua ứng dụng.

Keywords: 24 hours, least amount of effort, normal operations

Tip: Nếu cần giảm SQLi nhanh cho legacy app, WAF ở ALB và chặn mọi direct-backend bypass.

Source issues: WAF giảm thiểu theo rule; cần staging/rule validation với mẫu attack và traffic hợp lệ.

Primary sources (accessed 2026-09-30):

- [sqli](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-sqli-match.html): WAF SQL injection statements inspect request components for SQL injection patterns.
- [wafresources](https://docs.aws.amazon.com/waf/latest/developerguide/how-aws-waf-works-resources.html): WAF associates with supported resources including ALB and CloudFront, not a bare EC2 instance.

## Q035

Giữ B; AWS docs trực tiếp chỉ eic_harvest_hostkeys sau rotation.

Chạy eic_harvest_hostkeys để cập nhật host keys mới vào trusted host-key database của EC2 Instance Connect. Đây là host key của server, khác key pair đăng nhập của client.

- Q035:A: Sai: KMS key không quản lý SSH host-key trust của Instance Connect.
- Q035:B: Đúng: cập nhật host-key database bằng eic_harvest_hostkeys.
- Q035:C: Sai: SSM policy không cập nhật EC2 Instance Connect host-key trust.
- Q035:D: Sai: tạo login key pair mới không sửa server host key bị stale.

Keywords: rotated the host keys, failed host key validation

Tip: Nếu EC2 Instance Connect lỗi sau host-key rotation, harvest host keys mới trên instance.

Primary sources (accessed 2026-09-30):

- [host](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/TroubleshootingInstancesConnecting.html): After host key rotation, manually run eic_harvest_hostkeys to update the EC2 Instance Connect trusted host-key database.

## Q036

Giữ C; Macie/EventBridge/SNS là tích hợp native phù hợp.

Dùng Macie managed data identifiers để phát hiện dữ liệu nhạy cảm trong S3 và EventBridge chuyển findings tới SNS topic hiện có. Đây là tích hợp native ít triển khai hơn tự viết scanner.

- Q036:A: Sai: Config đánh giá cấu hình resource, không phân loại nội dung S3.
- Q036:B: Sai: custom Lambda scanner cần tự xây logic và vận hành.
- Q036:C: Đúng: Macie findings → EventBridge → SNS.
- Q036:D: Sai: GuardDuty phát hiện threat, không discovery nội dung sensitive data.

Keywords: sensitive data, existing, SNS

Tip: Nếu đã có SNS topic, route Macie sensitive-data findings bằng EventBridge và kiểm tra topic policy/subscription.

Primary sources (accessed 2026-09-30):

- [macie](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html): Macie discovers sensitive S3 data with managed identifiers; findings integrate with EventBridge for SNS notification.
