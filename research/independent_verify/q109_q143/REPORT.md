# Đối chứng Q109–Q143

35/35 câu; 150/150 lựa chọn. Đã lưu kết luận độc lập trước khi đọc từng hồ sơ research r1. Root từng thấy ghi chú tổng hợp Q118/Q122/Q133/Q143 và khóa nguồn Q143, nên không gọi nhóm này hoàn toàn blinded.

Lời giải được viết lại ngắn, giữ caveats trong hồ sơ chi tiết. Q112 đổi kết luận sau khi đọc lại mọi mệnh đề option C, không do khóa nguồn.

| Câu | Research trước | Đề xuất sau đối chứng | Lý do |
|---|---|---|---|
| Q112 | verified / ['Q112:B'] | ambiguous / None | Sau lượt độc lập, rà lại toàn bộ mệnh đề C: C dùng cùng KMS + scanning hợp lệ như B. Không thể loại C chỉ vì Inventory không phải CVE report; tiêu chí ít vận hành không có trong stem. |
| Q121 | verified / ['Q121:B'] | ambiguous / None | Typo thực thi cụ thể trong option B; không âm thầm sửa đề khi gọi đáp án verified. |
| Q122 | ambiguous / ['Q122:A'] | ambiguous / None | Không thay NLB thành ALB trong đề để hợp thức hóa A. |
| Q133 | ambiguous / None | verified / ['Q133:B'] | Không nói managed rule không hỗ trợ tag filtering nói chung: Config scope hỗ trợ tag. B phải kiểm tra customer managed/key ARN, không chỉ SSE-KMS bật. |
| Q142 | verified / ['Q142:A'] | ambiguous / None | Standard v2 có viewer-request/response-log-data bổ sung từ CloudFront Functions, nhưng cần code thêm và giới hạn 800 bytes; option A không nêu giải pháp này. Không chuyển cs-headers từ real-time sang standard bằng suy đoán. |

Các câu còn lại giữ khóa/status, chỉnh lời giải và caveat; xem comparison.json cho đủ từng option.
