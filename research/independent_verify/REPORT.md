# Đối chứng độc lập toàn bộ AWS SCS-C03 — r2

Hoàn tất: 2026-09-30T21:54:12.499271+00:00.

**143/143 câu và 628/628 lựa chọn, bước sắp xếp, hàng/đáp án ghép đã được xem xét.** Kết quả: **114 verified, 25 ambiguous, 4 unresolved**. Không có câu pending.

## Cách thực hiện và giới hạn độc lập

Chia bốn nhóm: Q001–Q036, Q037–Q072, Q073–Q108 do ba agent; Q109–Q143 do agent chính. Ba agent nhận bộ câu hỏi không chứa đáp án, tra tài liệu AWS chính thức và lưu independent.json trước khi đọc từng hồ sơ research cũ. Sau đó mới so sánh và ghi comparison.json. Hash của hai bản ghi được liên kết với hồ sơ cuối.

Agent chính đã thấy ghi chú tổng hợp Q118/Q122/Q133/Q143 và khóa nguồn Q143 trước khi bắt đầu nhóm cuối; không gọi cả lượt này hoàn toàn blind. Các thay đổi sau đối chiếu và phán định của agent chính được lưu riêng, không viết đè kết luận độc lập. Q015/Q040 giữ verified sau phán định; Q048/Q063 giữ verified với caveat; Q075 giữ intended architecture cùng giới hạn thời gian cảnh báo.

Đây là đối chứng bằng tài liệu, không có thí nghiệm trên tài khoản AWS. verified nghĩa là đáp án đủ căn cứ theo bối cảnh và mức tin cậy ghi trong hồ sơ, không phải cam kết tuyệt đối. Các câu phụ thuộc phiên bản, phạm vi dịch vụ hoặc cách hiểu vẫn có caveat.

213 URL nguồn chính được lưu/reuse snapshot; không có lỗi lưu nguồn. Khóa nguồn, HTML, export NotebookLM và ảnh gốc không thay đổi (89 file hash khớp).

## Những thay đổi đáng chú ý

- **Q024 → C:** WAF rate-based rule không cho threshold3; ứng dụng có thể chặn bằng bộ đếm rolling dùng trạng thái chung, atomic. WAF vẫn phù hợp bảo vệ DDoS tổng quát, nhưng không đáp ứng con số trong câu này. [AWS WAF rate limit](https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html).
- **Q133 → B:** managed Config rule s3-default-encryption-kms chỉ có parameter kmsKeyArns; tag nằm ở scope. A đặt tag vào parameters nên không đúng nguyên văn. Lambda rule cần kiểm tra tag và đúng customer managed key. [AWS Config rule](https://docs.aws.amazon.com/config/latest/developerguide/s3-default-encryption-kms.html).
- **Q062 chưa chốt:** deactivate key đúng; credential report/last login không chứng minh key đã bị dùng trái phép. Cần điều tra CloudTrail nhưng đề không có lựa chọn đầy đủ. [IAM credential report](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_getting-report.html).
- **Q094 chưa chốt:** lựa chọn B yêu cầu gỡ AWSCompromisedKeyQuarantineV3; tài liệu policy hiện nói không tự gỡ và làm theo Support case. [AWS policy reference](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSCompromisedKeyQuarantineV3.html).
- **Q107 chưa chốt:** quyền AWS RAM là giao của permission trong resource share và identity policy bên nhận. B không tự sai chỉ vì permission share rộng hơn; A/B đều có thể đáp ứng. [AWS RAM concepts](https://docs.aws.amazon.com/ram/latest/userguide/getting-started-terms-and-concepts.html).
- **Q142 chưa chốt:** CloudFront standard logging v2 không mặc nhiên ghi mọi HTTP header; không gọi A verified khi lựa chọn yêu cầu full header information. [Standard logging v2](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logging.html).

23 câu trước đây verified đã hạ trạng thái; 2 câu được xác nhận lại: Q024, Q133. 30 câu đổi đáp án hoặc trạng thái. Mọi câu đều được chỉnh giải thích/tips.

## Độ ngắn của phần học

Đếm bằng các đoạn tách bởi khoảng trắng; không phải tokenizer của LLM. Không cắt chuỗi máy móc: đã viết lại nội dung, đưa caveat dài vào phần chi tiết.

| Chỉ số | Trước r1 | Sau r2 |
|---|---:|---:|
| Giải thích chính: trung vị / tối đa | 48 / 88 | 29 / 53 |
| Giải thích chính vượt60 | 23 | 0 |
| Lý do lựa chọn vượt40 | 3 | 0 |
| Tips: trung vị / tối đa | 41 / 54 | 17 / 27 |
| Tips vượt35 | 121 | 0 |

## Đối chiếu thay đổi với research trước

| Câu | r1 | r2 | Lý do |
|---|---|---|---|
| Q001 | C (verified) | chưa chốt (ambiguous) | C không sửa principal/SourceArn; không giữ verified khi điều kiện đủ quyền vẫn sai. |
| Q002 | S1,S5,S3 (verified) | chưa chốt (ambiguous) | Phân biệt JWT token và temporary AWS credentials; user pool không tự phát AWS credentials. |
| Q005 | S6,S1,S3 (ambiguous) | chưa chốt (ambiguous) | Không ép source tutorial thành chuỗi duy nhất; cả metadata và SCIM là bước hợp lệ, scope không xác định. |
| Q007 | B (verified) | chưa chốt (ambiguous) | Bucket ARN không deny object APIs; principal đúng không đủ để verified whole policy. |
| Q008 | chưa chốt (ambiguous) | chưa chốt (unresolved) | Không chấm full mapping; P1/P5 trùng; custom insights không tự chứng minh multi-stage correlation. |
| Q010 | B (verified) | chưa chốt (ambiguous) | State enabled/usable mâu thuẫn PendingReplicaDeletion, nên B chỉ là ý định sau sửa nguồn. |
| Q011 | B (verified) | chưa chốt (ambiguous) | Tách native shell khỏi SSH-over-SSM và ghi pricing chính thức có ngày hiệu lực hiện hành; không verified mọi literal yêu cầu. |
| Q013 | A,E (verified) | chưa chốt (ambiguous) | E sai dấu đóng biến và shorthand ARN; AE chỉ sau sửa nguồn, không verified literal option. |
| Q019 | D (verified) | chưa chốt (ambiguous) | Disable Identity Center user không revoke active AWS role sessions; sửa kết luận immediate và phân biệt IAM user/IdC user. |
| Q023 | A (verified) | chưa chốt (ambiguous) | A chỉ Aurora MySQL; unspecified engine cần ambiguous thay vì verified mặc dù caveat đã có. |
| Q024 | chưa chốt (ambiguous) | C (verified) | Đổi null/ambiguous thành C: ứng dụng được phép thay đổi nên có thể dùng shared rolling atomic counter; least effort chỉ so các đáp án đáp ứng. |
| Q026 | D (verified) | chưa chốt (ambiguous) | Không loại B chỉ vì inline policy: inline attach role là hợp lệ; task role không cô lập specific container; DBA plaintext vẫn cần hạn chế riêng. |
| Q041 | B (verified) | chưa chốt (ambiguous) | Không thể chứng minh 'sớm nhất' tuyệt đối; hourly poll không đồng nghĩa hourly dữ liệu, nhưng cũng không tự chứng minh B luôn đến trước A. |
| Q045 | C (verified) | chưa chốt (unresolved) | Sai nguyên văn IAM condition key và quá rộng: tag policy enforcement không áp dụng mọi tài nguyên; tài nguyên untagged không được tự buộc có tag. |
| Q047 | A (verified) | chưa chốt (ambiguous) | Current keywords tự thêm account/Region tương lai dù stem chỉ yêu cầu bucket tương lai; C cũng hợp lệ trong phạm vi hiện tại. |
| Q054 | A,D,F (verified) | chưa chốt (ambiguous) | Current giải thích silently đổi F từ 'user assignments only in management account' thành 'users not groups'; cần flag sửa wording, recommendations không prerequisites. |
| Q056 | A (verified) | chưa chốt (ambiguous) | Current suy ra tracked session chuyển ngay sang untracked khi thêm allow-all; EC2 docs chỉ chắc cho originally untracked connections; runbook cho thêm evidence pattern nhưng không proof tương đương đổi rules SG. |
| Q062 | B,E (verified) | chưa chốt (unresolved) | E hỏi last console login; credential report last-use không xác định attacker/all API activity; B/E không đáp ứng và CloudTrail thiếu. |
| Q070 | A (verified) | chưa chốt (ambiguous) | Current tự ghi runbook Creates new trail nhưng vẫn verified bật lại existing; cần kiểm chứng API/scope và periodic detector. |
| Q077 | B (ambiguous) | chưa chốt (ambiguous) | Giữ ambiguous và bỏ key duy nhất: preventive không đáp ứng; B là intended remediation. |
| Q084 | A (verified) | chưa chốt (unresolved) | Không được bỏ hai bước selector sai rồi gọi toàn option verified; eventName trên event data store không tương đương trail, resources.ARN chỉ data events. |
| Q087 | B,E (ambiguous) | chưa chốt (ambiguous) | BE và CE đều hợp lệ, Config delegated admin không tự là StackSets delegated admin; không ép chọn BE. |
| Q094 | B (verified) | chưa chốt (ambiguous) | Managed policy hiện hành ghi không gỡ, làm theo Support case; review paraphrase 'giữ tới remediation rồi gỡ' không được nguồn hỗ trợ. |
| Q095 | C (verified) | chưa chốt (ambiguous) | Option C dùng một policy scope all Regions không khả thi cho ALBs; caveat không cứu whole-option verified. |
| Q107 | A (verified) | chưa chốt (ambiguous) | Broad managed share chỉ là trần; identity policies phía nhận có thể loại reads và principals, nên A/B đều viable. |
| Q112 | B (verified) | chưa chốt (ambiguous) | Sau lượt độc lập, rà lại toàn bộ mệnh đề C: C dùng cùng KMS + scanning hợp lệ như B. Không thể loại C chỉ vì Inventory không phải CVE report; tiêu chí ít vận hành không có trong stem. |
| Q121 | B (verified) | chưa chốt (ambiguous) | Typo thực thi cụ thể trong option B; không âm thầm sửa đề khi gọi đáp án verified. |
| Q122 | A (ambiguous) | chưa chốt (ambiguous) | Không thay NLB thành ALB trong đề để hợp thức hóa A. |
| Q133 | chưa chốt (ambiguous) | B (verified) | Không nói managed rule không hỗ trợ tag filtering nói chung: Config scope hỗ trợ tag. B phải kiểm tra customer managed/key ARN, không chỉ SSE-KMS bật. |
| Q142 | A (verified) | chưa chốt (ambiguous) | Standard v2 có viewer-request/response-log-data bổ sung từ CloudFront Functions, nhưng cần code thêm và giới hạn 800 bytes; option A không nêu giải pháp này. Không chuyển cs-headers từ real-time sang standard bằng suy đoán. |

## Câu chưa đủ căn cứ chấm theo research

**Ambiguous:** Q001, Q002, Q005, Q007, Q010, Q011, Q013, Q019, Q023, Q026, Q041, Q047, Q054, Q056, Q070, Q077, Q087, Q094, Q095, Q107, Q112, Q118, Q121, Q122, Q142.

**Unresolved:** Q008, Q045, Q062, Q084.

Ambiguous gồm đề thiếu điều kiện, nhiều phương án khả thi hoặc lỗi nguồn làm đáp án chỉ đúng nếu sửa/diễn giải thêm. Unresolved gồm dữ liệu ghép không thể hoàn thành hoặc không có tổ hợp đáp án nguyên văn đầy đủ. Không dùng hai loại này để chấm trong chế độ By research.

## Kiểm tra dữ liệu và web

- Đối chiếu trực tiếp hai HTML gốc:143 câu,572 lựa chọn,1006 text blocks,28 stem/choice image blocks và7 answer images;35 ảnh tổng cộng. PASS, không lỗi.
- Cả143 final records hợp lệ;628 units có lý do và đường dẫn bằng chứng. Source key/content hash/initial blind records được giữ nguyên.
-125 unit tests qua;21 browser tests qua, gồm thi thử, timer/refresh, giấu đáp án trước Check, policy images, matching/ordering, coverage hiện đúng114/25/4, và màn hình nhỏ.
- Một test cũ giả định Q001 verified đã được sửa để yêu cầu hiển thị Source key (not verified), không tự gọi đúng/sai. Kiểm tra footer mobile được chờ qua hiệu ứng focus/scroll khi trở lại câu hỏi; không sửa giao diện ứng dụng.
- Dữ liệu JSON trong research, app/public và bản build app/dist có cùng hash. Build/typecheck qua.

## Dùng kết quả

Web đã nhận bản r2-independent-verify. Reload trang và vào Research coverage để xem trạng thái/lý do/nguồn từng câu. Chọn By research khi thi thử;114 câu verified được chấm,29 câu còn lại không có kết luận chấm nghiên cứu. By source key vẫn dùng nguyên khóa gốc nên có thể khác nghiên cứu.

Toàn bộ143 câu có ở comparison_all.json và comparison_all.csv. Trước sửa được lưu trong before/. Chi tiết của bốn nhóm nằm trong q001_q036/, q037_q072/, q073_q108/, q109_q143/. verification_summary.json lưu thống kê, test và kiểm tra hash.
