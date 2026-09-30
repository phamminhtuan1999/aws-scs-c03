Q013 | blind=AE | source=AE | final=AE | verified | differs=false | IoT Core policy iot:Connect client/${iot:Connection.Thing.ThingName} + thing name as client ID; ${iot:ClientId} documented as unsafe for Connect
Q014 | blind=B | source=B | final=B | verified | differs=false | AWS Config periodic (daily) recording keeps only latest CI; A/C downgraded to does_not_meet (API calls do not show cumulative config)
Q015 | blind=D | source=D | final=D | verified | differs=false | KMS CloudHSM key store + CloudTrail audit; stem quirk: GenerateDataKeyPair cannot use custom key store keys (affects A/C/D equally)
Q016 | blind=C | source=C | final=C | verified | differs=false | CloudWatch agent -> CloudWatch Logs decouples logs from instance lifecycle; retention indefinite/>=365 days
Q017 | blind=A | source=A | final=A | verified | differs=false | Gateway endpoint policy with aws:PrincipalOrgID + aws:ResourceOrgID applies regardless of principal; SCP/role don't bind external creds
Q018 | blind=A | source=A | final=A | verified | differs=false | PITR to 3:14 PM within 14-day retention; snapshots are daily-granular, 14 days ago loses good data
Q007 | blind=B | source=B | final=B | verified | false | Chỉ B vừa Deny vừa đúng ARN principal sts federated-user/Bob; C là IAM user, D là role session.
Q008 | blind=null (P1->R5,P2->R4,P3->R3; P4->R2 likely) | source=P1->R5,P2->R4,P3->R3,P4->R1,P5->R2 (gradable=false) | final=null | ambiguous | false | Dòng 5 trùng dòng 1 nên không có ghép 1-1 hợp lệ; P4 có thể R1 hoặc R2, P5->R2 (VPC Flow Logs tương quan finding) không đúng kỹ thuật.
Q009 | blind=B | source=B | final=B | verified | false | Object Lock compliance chặn cả root, replication mang retention sang Region phụ; A governance mode vẫn cho admin xóa.
Q010 | blind=B | source=B | final=B | verified | false | mrk- = multi-Region key; primary không bị xóa khi còn replica, phải lên lịch xóa replica (7 ngày); đề có lỗi dữ liệu -> confidence medium.
Q011 | blind=B | source=B | final=B | verified | false | Session Manager: EC2 + on-premises, không inbound port/bastion/SSH key, tính theo session.
Q012 | blind=C | source=C | final=C | verified | false | GuardDuty EKS Protection (audit logs) + Runtime Monitoring (OS/mạng/file) -> EventBridge -> SNS email.
