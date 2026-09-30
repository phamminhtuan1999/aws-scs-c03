# Kế hoạch triển khai — Web luyện thi SCS-C03 + nghiên cứu độc lập 143 câu

Nguồn yêu cầu: `output/PROMPT_AGENT_WEB_AWS.md`. Ngày lập: 2026-09-30. Trạng thái: **chờ chốt các câu hỏi ở mục 11**.

---

## 0. Hiện trạng đã kiểm tra thực tế (không suy đoán)

| Hạng mục | Kết quả đọc được |
|---|---|
| Workspace | Không phải git repo; không có app/`package.json`/CLAUDE.md. Có sẵn các script Python export/verify cũ. |
| Runtime | Node v24.14.0, npm 11.9.0, Python 3.14.5 |
| `question_bank.json` top-level | `exam`, `answer_provenance`, `source_counts`, `questions` |
| Field mỗi câu | `id, number, topic, source_file, source_question_id, stem, choices, answer, explanation, votes, question_type`; 7 câu có `answer_image_transcription` + `answer_transcription_method`; 4 câu matching có `image_question_rows`; Q008 có `source_note` |
| Block | `{type:"text", text}` hoặc `{type:"image", file, label, width, height, sha256}` |
| Loại câu | 112 multiple_choice, 24 multiple_response, 3 ordering (Q002, Q005, Q073), 4 matching (Q008, Q079, Q081, Q082) — khớp baseline |
| Lựa chọn | 572 (112×4 + 20×5 + 4×6; 7 câu hotspot có `choices: []`) |
| Đáp án | 136 câu đáp án chữ dạng `"AE"`; 7 câu đáp án là ảnh viền xanh |
| `explanation` | Rỗng ở cả 143 câu |
| Choose N | 20 câu "Choose two." (khóa 2 chữ), 4 câu "Choose three." (khóa 3 chữ) — số chữ khớp N |
| Ảnh | 35 file (31 PNG, 4 JPG của Q001). Câu có ảnh: Q001–Q008, Q073, Q079, Q081, Q082, Q086, Q088, Q136, Q143. Q004/Q007/Q088: **lựa chọn là ảnh policy** |
| Ký tự `•` (U+2022) | Có thật trong stem Q073/Q079/Q081/Q082 (không phải lỗi mã hóa) |
| Lỗi nguồn thấy ngay | Q005 "exlemai", "specifics"; Q008 "EC2 distances", hàng 1 và 5 lặp chiến lược VPC Flow Logs, bố cục đảo (hàng = strategy, dropdown = scenario trong khi chỉ dẫn nói ngược lại); Q001 option C `"DOC-EXAMPLE- BUCKET/*''`; Q006 `(AWS KMS}`; Q136 option B `arn:aws :iam ::…` |
| Rủi ro công cụ | `verify_exports.py` **ghi đè** `output/verification_report.json` → không chạy tại chỗ; nếu cần chạy lại thì chạy trên bản copy |

**Hạn chế đã phát sinh:** trong lúc kiểm tra schema, agent chính đã thấy khóa nguồn của khoảng 40 câu (Q001–Q008, Q073, Q079, Q081, Q082, Q086, Q088, Q136, Q143 và 24 câu multiple response). Vì vậy agent chính **không** làm lượt mù; lượt mù giao cho subagent mới (không kế thừa context). Ghi điều này vào `research/progress.md`.

---

## 1. Cấu trúc thư mục mới (không chạm dữ liệu gốc)

```
aws/
├─ 01-10_...html, 11-15_...html, output/**     ← GỐC, chỉ đọc, hash trước/sau
└─ scs-c03-trainer/
   ├─ PLAN.md, README.md
   ├─ baseline/        hashes_before.json, hashes_after.json
   ├─ tools/           Python độc lập với app: hash, normalize, blind set, leak check,
   │                   fetch_doc, validate_research, coverage, verify_render
   ├─ data/
   │  ├─ original/     bản copy byte-identical question_bank.json + images/ (kiểm hash)
   │  ├─ normalized/bank.json            chỉ chuẩn hóa whitespace, có audit từng block đổi
   │  ├─ interactions/hotspot.json       mapping 7 câu ordering/matching + provenance
   │  ├─ keys/source_keys.json           khóa nguồn chuẩn hóa, BẤT BIẾN
   │  └─ taxonomy/tags.json              domain/service multi-tag + lý do
   ├─ research/
   │  ├─ blind_set/    questions.json + images/ (KHÔNG khóa) + LEAK_CHECK.md
   │  ├─ sources/      index.json + snapshots/*.txt (trang AWS đã đọc thật)
   │  ├─ blind/        Qxxx.json  — kết luận lượt 1, trước khi so khóa
   │  ├─ reviews/      Qxxx.json  — hồ sơ cuối, có history
   │  ├─ schema/       question_review.schema.json
   │  ├─ question_reviews.json    gộp + research_version
   │  ├─ coverage.csv / coverage.json, discrepancies.md, progress.md, exam_format.md
   ├─ app/             Vite + React + TypeScript
   └─ reports/         integrity_report.md, test_report.md, screenshots/
```

Local `git init` trong `scs-c03-trainer/` để checkpoint (không remote, không push).

---

## 2. Phase 0 — Baseline & bảo toàn

1. `tools/hash_tree.py`: SHA256 cho 2 HTML, 2 PDF ở gốc, toàn bộ `output/**` (JSON, MD, PDF, ZIP, 35 ảnh, report) → `baseline/hashes_before.json`.
2. Cuối dự án chạy lại → `hashes_after.json` + diff phải rỗng; đưa vào integrity report.
3. Tạo `research/progress.md` với checkpoint #0 và ghi hạn chế "agent chính đã thấy ~40 khóa".

## 3. Phase 1 — Lớp dữ liệu

### 3.1 Original
- Copy `question_bank.json` + `images/` vào `data/original/`, xác minh hash từng file bằng `sha256` trong JSON.

### 3.2 Normalized bank (`tools/normalize.py`)
- ID ổn định: câu `Q001`; lựa chọn `Q001:A`; block `Q001:stem:3`, `Q001:A:1`.
- Quy tắc chuẩn hóa duy nhất: trim đầu/cuối; gộp CR/LF/tab/chuỗi space thành 1 space. **Không** sửa chính tả, dấu, ký tự `•`, `'`, `''`, khoảng trắng bên trong token (vd `DOC-EXAMPLE- BUCKET` giữ nguyên vì chỉ có 1 space).
- Ghi `normalization_audit` liệt kê mọi block bị đổi (before/after repr) — kỳ vọng rất ít.
- Loại bỏ khỏi bundle đề: `answer`, `votes`, `explanation`, `answer_image_transcription`, `source_note` → chuyển sang `keys/` và `source_issues`.
- Ảnh: gắn `role`: `stem` | `choice` | `answer` (7 ảnh answer chỉ nằm trong keys, không nằm trong đề).

### 3.3 Interaction mappings cho 7 câu hotspot (`data/interactions/hotspot.json`)
Mỗi câu gồm:
- **Ordering** (Q002, Q005, Q073): `steps[]` = `{id:"Q002:S1", text, source:"stem block #3"}` theo thứ tự nguồn; `slots` = số ô Step trong ảnh đề (đếm bằng mắt, ghi lại); `reuse:false` với `rule_source_text: "Select each step one time or not at all."`.
- **Matching** (Q008, Q079, Q081, Q082): `prompts[]` = `{id:"Q079:P1", text, source:"image row 1 (image_question_rows[0])"}`; `responses[]` = `{id:"Q079:R1", text, source:"stem block #4"}`; `reuse` suy từ chỉ dẫn nguồn của **từng** câu (Q079 "one time or not at all" → không dùng lại, được bỏ; Q081/Q082 "one time" → không dùng lại; Q008 ghi riêng vì chỉ dẫn mâu thuẫn bố cục).
- `provenance`: người/agent lập, ngày, phương pháp "so bằng mắt với ảnh đề X", kết quả kiểm tra từng dòng; nhãn Step/Row/P/R ghi rõ là **nhãn UI bổ sung**.
- Nút "View original image" luôn có trong câu hotspot.

### 3.4 Source keys (`data/keys/source_keys.json`) — bất biến
- MC/MR: `"AE"` → `["A","E"]`; kiểm chữ tồn tại và số đáp án = Choose N.
- Ordering: map từng dòng `answer_image_transcription` → step ID bằng so khớp chuỗi chính xác; **so lại bằng mắt với ảnh đáp án** (green box), ghi kết quả.
- Matching: `{P1: R2, …}` tương tự, so bằng mắt.
- Mỗi khóa có `normalization_status: ok | ungradable` + lý do. Q008: xem câu hỏi 11.3.
- File này được hash và khóa; research không bao giờ ghi vào đây.

### 3.5 Data integrity script (`tools/verify_data.py`, độc lập với code render)
- So normalized ↔ `output/pdf/question_bank.json` gốc: số câu, ID liên tục Q001–Q143, type, thứ tự choice, số block, text sau chuẩn hóa, 35 ảnh (hash, câu, vai trò).
- Đối chiếu thêm với HTML gốc bằng parser an toàn (`html.parser`, không chạy script) cho text lựa chọn — dùng lại logic của `verify_exports.py` nhưng ghi output vào `reports/`, không đụng `output/`.

## 4. Phase 2 — Tập nghiên cứu mù (blind set)

1. `tools/make_blind_set.py` → `research/blind_set/questions.json`: chỉ `id, question_type, stem, choices, image_question_rows` (prompts matching là nội dung đề), và mapping hotspot phần đề (steps/prompts/responses/slots). Không có `answer`, `votes`, `explanation`, transcription, `source_note`, ảnh answer.
2. Copy **chỉ** ảnh `role ∈ {stem, choice}` (28 ảnh) sang `blind_set/images/`.
3. Leak check tự động → `LEAK_CHECK.md`:
   - grep key names bị cấm trong file;
   - hash ảnh blind ∩ hash 7 ảnh answer = ∅;
   - dò pixel xanh lá thuần (viền đánh dấu) trên từng ảnh blind;
   - xem bằng mắt toàn bộ ảnh blind có policy/hotspot, ghi kết quả.

## 5. Phase 3 — Nghiên cứu (phần dài nhất)

### 5.1 Định dạng thi & tham chiếu UI → `research/exam_format.md`
- Mở và đọc: trang overview SCS và exam guide SCS-C03 (số câu, thời gian, 4 dạng câu, domain + tỷ trọng, cách chấm scaled score, câu không tính điểm).
- Tìm tutorial/demo chính thức Pearson VUE/AWS; ghi URL + phần nào đã quan sát thật. Nếu không có tham chiếu đầy đủ → ghi "bố cục tương tự, không sao chép" trong README.
- Ghi mọi khác biệt giữa overview và exam guide.

### 5.2 Hạ tầng bằng chứng
- `tools/fetch_doc.py URL`: tải trang AWS docs, trích nội dung chính, lưu `sources/snapshots/<id>.txt` + `sources/index.json` (url, final_url, title, fetched_at UTC, `page_last_updated` **chỉ khi trang có ghi**, sha256). Nếu trang không lấy được bằng script → đọc bằng WebFetch/browser và đánh dấu `read_via`.
- Mỗi reference trong hồ sơ có `quote` ngắn (≤ ~30 từ); `validate_research.py` **kiểm quote có thật trong snapshot** → bằng chứng tự động rằng trang đã được đọc, không chỉ là URL.
- WebSearch ở lượt mù giới hạn domain `docs.aws.amazon.com`, `aws.amazon.com` để tránh dính exam dump. Không mở ExamTopics/dump; diễn đàn chỉ để gợi ý vấn đề ở lượt 2 và không làm căn cứ.

### 5.3 Lượt 1 — mù (subagent mới, không kế thừa context)
- Chia 143 câu thành batch ~6 câu (≈24 batch). Mỗi subagent chỉ được đọc `research/blind_set/**`, `research/sources/**`, `tools/fetch_doc.py`; cấm `output/**`, HTML/PDF gốc, `data/original|keys`, `research/reviews/**`.
- Với từng câu, ghi `research/blind/Qxxx.json`:
  - `requirements`: ràng buộc + tiêu chí tối ưu (bảo mật, quyền, account/Region, chi phí, ít vận hành, độ trễ, loại API, điều kiện policy…);
  - `option_reviews` cho **mọi** unit (xem 5.6), verdict `meets | does_not_meet | meets_but_suboptimal | undetermined`, lý do riêng từng unit, requirement IDs, reference IDs, `evidence_kind: direct | inference`;
  - `independent_verdict`: đáp án / trạng thái / confidence / `recorded_at` — **trước khi so khóa**;
  - policy/code trong ảnh: bản chép kiểm tra riêng (Action/Resource/Principal/Condition/Effect), không sửa typo.
- Validate schema stage `blind` sau mỗi batch; checkpoint `progress.md` với ID còn lại.

### 5.4 Lượt 2 — đối chiếu khóa (non-blind)
- Subagent đối chiếu đọc blind record + `source_keys` rồi:
  - khớp → kiểm lại lựa chọn cạnh tranh mạnh nhất (tìm cả bằng chứng bác bỏ);
  - khác → nghiên cứu bổ sung **cả hai phía**, ghi rõ vì sao; giữ nguyên blind verdict trong history.
- Ghi `research/reviews/Qxxx.json` bản cuối + `comparison: match | mismatch | not_comparable`.

### 5.5 Lượt 3 — audit bằng chứng
- Tự động: schema, ID, unit coverage, reference IDs tồn tại, quote có trong snapshot, keyword là chuỗi có thật trong đề, không có tip dạng "always serverless".
- Thủ công (agent khác lượt 2): đọc lại bằng chứng của mọi câu khác khóa, mọi câu IAM/KMS/network/policy/code, câu phụ thuộc thời điểm, và mẫu ngẫu nhiên câu verified.

### 5.6 Đơn vị coverage
- MC/MR: mỗi lựa chọn chữ = 1 unit (572).
- Ordering: mỗi step = 1 unit (có/không thuộc tập, vị trí) → Q002 6, Q005 6, Q073 5 = 17.
- Matching: mỗi prompt row = 1 unit (đánh giá qua mọi response ứng viên) + mỗi response = 1 unit → Q008 5+5, Q079 3+6, Q081 5+5, Q082 5+5 = 39.
- Tổng dự kiến **628 unit** (xác nhận lại bằng script khi dựng mapping).

### 5.7 Schema hồ sơ cuối (`research/schema/question_review.schema.json`)
```
question_id, question_content_hash (stem+choices+type, không gồm answer),
research_version, researched_at, last_reviewed_at,
blind_integrity { blind_pass: bool, performed_by, limitations[] },
requirements[ {id, text_vi, kind} ],
independent_verdict { answer, status, confidence, reference_ids, recorded_at },
option_reviews[ {unit_id, unit_type, verdict, reason_vi, requirement_ids, reference_ids, evidence_kind} ],
source_answer, researched_answer (tập ID | thứ tự ID | map cặp | null),
comparison, status, confidence { level: high|medium|low, reason_vi, open_issues[] },
references[ {id, url, title, section, accessed_at, page_last_updated|null, snapshot_id, quote, supports, kind: direct|inference} ],
explanation_vi { why_correct, others{unit_id: text} },
keywords[ ≤3 {phrase (có thật trong đề), meaning_vi} ], memory_tip_vi,
source_issues[ {type: typo|data|outdated|ambiguous|layout, location, detail} ],
tags { domains[], services[], reason_vi },
history[ {version, date, change, previous_answer} ]
```

### 5.8 Trạng thái & quy tắc chấm (đề xuất — xem câu hỏi 11.2)
| status | Nghĩa | Chế độ "Theo research" |
|---|---|---|
| `verified` | Đủ unit, bằng chứng trực tiếp hỗ trợ, `researched_answer` duy nhất, confidence high/medium. Có thể **khớp hoặc khác** khóa nguồn (khác → cờ `differs_from_source`) | Chấm |
| `disputed` | Research và khóa nguồn mâu thuẫn, bằng chứng chưa giải quyết dứt điểm | Không chấm |
| `ambiguous` | Đề lỗi/thiếu dữ kiện, số đáp án hợp lý ≠ Choose N, hoặc nhiều đáp án cùng hợp lệ | Không chấm |
| `outdated` | Đáp án đúng theo bối cảnh cũ nhưng hành vi dịch vụ hiện hành đã đổi | Không chấm (hiển thị giải thích 2 mốc thời gian) |
| `unresolved` | Đã nghiên cứu nhưng không đủ bằng chứng / confidence low | Không chấm |
| `pending` | Chưa nghiên cứu | Không chấm, không bao giờ gắn verified |

Không có phần trăm tin cậy giả; báo cáo đếm riêng từng trạng thái, không gộp thành "143 đáp án đúng".

### 5.9 Lời giải & tag
- `explanation_vi` ngắn theo mẫu: Đáp án/Bạn chọn · Vì sao đúng (1–2 câu) · mỗi lựa chọn còn lại 1 câu cụ thể · Keyword ≤3 · Mẹo nhớ có điều kiện · Nguồn AWS.
- Domain theo exam guide SCS-C03 (đọc ở 5.1), multi-tag, có lý do; không suy tỷ lệ domain của ngân hàng thành tỷ lệ chính thức.

## 6. Phase 4 — Web app

### 6.1 Stack
Vite + React 18 + TypeScript, `zod` (schema runtime), Vitest + jsdom + Testing Library (unit/DOM), Playwright dùng **Edge đã cài sẵn** (`channel: "msedge"`, không tải Chromium) cho e2e. Hash router → chạy được trên mọi static server. Không backend, không LLM, không login.

### 6.2 Module
```
src/data/       loader + zod schema (bank, hotspot mappings, source keys, research)
src/grading/    pure functions: normalizeResponse, gradeMC/MR/Ordering/Matching, gradability(basis, qid)
src/session/    exam & study state machine, seeded PRNG (mulberry32), key snapshot, persistence + migration
src/time/       Clock interface (real / fake), deadline-based remaining time
src/storage/    localStorage versioned store, export/import (zod-validated)
src/ui/exam/    ExamShell (Header/Footer), QuestionView, BlockRenderer, controls MC/MR/Ordering/Matching,
                ReviewScreen, EndExamDialog, Results, ResultReview
src/ui/study/   StudyPicker, StudyQuestion, CheckAnswer, ExplanationPanel, ResearchDetails (collapsible)
src/ui/bank/    Bank search/filter, ResearchCoverage, QuestionResearch, History/Stats, SavedTips, Settings
```

### 6.3 UI thi (English controls)
- Header: "AWS Certified Security – Specialty (SCS-C03) · Practice", `Question i of n`, đồng hồ, `Flag for review`, `Help`.
- Main: stem nguyên văn, block chữ/ảnh đúng thứ tự; ảnh có nút zoom (dialog phóng to/pan, Esc đóng); radio cho single, checkbox cho multi (hiển thị "Choose TWO" đúng như đề, không chặn chọn thừa trừ khi nguồn nói).
- Ordering: danh sách "Available steps" ↔ "Your answer (N slots)" với nút Add/Remove/Move up/Move down, dùng được hoàn toàn bằng bàn phím; drag-and-drop chỉ là tiện ích phụ.
- Matching: mỗi prompt một hàng + `<select>` response; reuse theo `reuse` của từng câu (response đã dùng bị disable khi `reuse:false`).
- Footer cố định: Previous · Next · Review · End exam; nội dung có padding đáy để footer không che.
- Review screen: lưới answered/unanswered/flagged, lọc, click nhảy câu.
- End exam dialog: số câu trống / flagged, "Return to exam" hoặc "End exam". Hết giờ: tự nộp **một lần**.
- Accessibility: font size A−/A+, focus ring rõ, contrast AA, responsive (điện thoại cho review).
- Màn hình bắt đầu có 1 dòng: "Independent practice tool — not affiliated with AWS or Pearson VUE." Không dùng logo AWS.

### 6.4 Chế độ Học
- Chọn phạm vi: tất cả / theo ID / domain-service / sai / flagged-bookmarked / chưa làm; thứ tự gốc hoặc shuffle câu (option giữ nguyên).
- Trước `Check answer`: không render đáp án, lời giải, keyword, tip, màu. Panel lời giải chỉ **mount** sau khi chấm.
- Sau chấm: cơ sở chấm đang dùng + nguồn gốc đáp án. Câu không `verified` → "Chưa có kết luận chắc chắn", hiển thị riêng khóa nguồn và kết luận research, không báo sai tuyệt đối.
- Research chi tiết (từng option, bằng chứng, ngày, confidence, source issues) trong phần mở rộng.
- Next, Bookmark, Save tip.

### 6.5 Chế độ Thi thử
- Mặc định 65 câu khác nhau / 170 phút; custom số câu/thời gian được gắn nhãn "Practice configuration".
- Seed → danh sách ID; tại lúc Start lưu snapshot: `basis`, `research_version`, `keys` của đúng các ID, danh sách ungradable → cập nhật research giữa phiên không đổi kết quả phiên.
- Không pause mặc định; custom cho pause thì hiện nhãn.
- `deadline = startedAt + duration`; `remaining = deadline − clock.now()` → refresh/đổi tab/mở lại không reset. Lưu answers, current index, flags, deadline, status. Load phiên đã quá hạn → chấm một lần, khóa sửa.
- Trong phiên thi: ẩn nav sang Bank/Study/Coverage; vào bằng URL thì gặp màn "Exam in progress". Không lộ ID nguồn/source notes/tranh chấp trước khi nộp.
- Chấm all-or-nothing; bỏ trống = sai nếu câu có khóa hợp lệ; không chấm khi chuyển câu; cho skip.
- Results: raw correct/scored, %, thời gian, danh sách sai/trống/flagged, ungradable tách khỏi mẫu số. Không scaled score, không dự đoán đỗ.

### 6.6 Cơ sở chấm
- **Theo research** (mặc định): pool = câu gradable theo 5.8. Nếu pool < số câu yêu cầu → hiện số có sẵn, cho chọn bài ngắn hơn hoặc chủ động chuyển sang **Theo khóa nguồn — chưa bảo đảm đúng kỹ thuật**. Không trộn cơ sở.
- **Theo khóa nguồn**: toàn bộ ngân hàng; câu `ungradable` trong source keys không tính điểm; nhãn rõ ở màn hình bắt đầu và kết quả.
- Custom có câu chưa xác định: công bố trước khi Start rằng chúng không tính điểm.
- Sau chấm: xem được khóa nguồn vs research + tài liệu.

### 6.7 Quản lý & thống kê
- Bank: tìm `Qxxx`/nội dung, lọc domain/service, sai/chưa làm, status research (bị khóa khi đang thi).
- Research coverage: 143 câu × unit, status, confidence, khác khóa; pending không bao giờ hiển thị như verified.
- History/stats tách theo `basis` + `research_version`; không gộp % khác cơ sở.
- Export/import JSON `{format, version, exported_at, data:{sessions, study, bookmarks, tips}}`: zod validate, từ chối version lạ, bỏ field lạ, giới hạn kích thước, không chứa/không thể thay nội dung câu; mọi chuỗi render dạng text (không `dangerouslySetInnerHTML`).

### 6.8 Build & chạy
- `tools/build_data` copy normalized bank, mappings, keys, `question_reviews.json`, ảnh vào `app/public/data/` kèm manifest hash + version.
- `npm run build` → `app/dist/`; `npm run serve` (static server Node không phụ thuộc thêm). README Windows: cài, chạy dev, build, serve. Không hứa double-click HTML.

## 7. Phase 5 — Kiểm thử

**Data integrity:** `verify_data.py` (mục 3.5) + DOM check: route `#/audit` render stem/choices (không khóa) cho 143 câu với `data-block-id`; Vitest/jsdom và Playwright trích DOM text, so với JSON **gốc** (không qua loader của app), chỉ chuẩn hóa whitespace theo quy tắc 3.2. Ảnh: hash, câu, vai trò; ảnh answer không xuất hiện trong DOM trước chấm. Xem bằng mắt câu policy/code + 7 câu đáp án ảnh.

**Grading unit tests:** set đúng/thiếu/thừa, thứ tự đúng/sai/thiếu step, matching sai 1 cặp, bỏ trống, đổi đáp án, mapping sau shuffle câu, ungradable, negative cases (vd đáp án "EA" ≠ bug thứ tự).

**Session/timer:** fake clock; refresh giữa chừng; đổi tab; hết hạn khi đóng app rồi mở lại; nộp hai lần (idempotent); hai tab cùng phiên; cập nhật research giữa phiên không đổi snapshot; storage hỏng/version lạ; import file xấu (HTML/script, field lạ, version sai).

**E2E Playwright (Edge):** Start exam → trả lời MC, MR, ordering, matching, câu ảnh policy → flag/unflag → review jump → End exam dialog → Results → review từng câu. Study: check answer, lộ lời giải chỉ sau check. Không console error nghiêm trọng, không ảnh broken.

**Leak tests:** trước submit, DOM không chứa text lời giải/keyword/tip/khóa, kể cả qua route/modal khác.

**Visual:** screenshot desktop + mobile các màn chính, zoom ảnh, footer không che, text dài không cắt, focus bàn phím → `reports/screenshots/`.

## 8. Phase 6 — Bàn giao
Đủ 9 hạng mục mục 11 của prompt: source + build + URL local đang chạy; dữ liệu gốc nguyên vẹn (hash before/after); mappings + keys có provenance; blind set + hồ sơ lượt 1; `question_reviews.json`; `coverage.csv`; `discrepancies.md`; `progress.md`; integrity/test report + screenshots; README (cơ sở chấm, mức mô phỏng UI, giới hạn raw score). Báo cáo cuối đếm riêng researched / verified / disputed / ambiguous / outdated / unresolved / pending.

## 9. Thứ tự thực hiện & song song
1. Phase 0 → 1 → 2 (nhanh, tuần tự; là điều kiện cho research).
2. 5.1 định dạng thi (cần cho UI và domain).
3. Lượt mù chạy **nền** theo batch; song song agent chính dựng app (Phase 4) với dữ liệu research tạm = `pending`.
4. Lượt đối chiếu chạy khi mỗi batch mù xong; audit sau cùng.
5. Tích hợp research vào app → test đầy đủ → báo cáo.
Checkpoint `progress.md` sau mỗi batch (ID xong / còn lại / blocker). Web xong không có nghĩa research xong.

## 10. Hạn chế biết trước (sẽ ghi trung thực trong báo cáo)
- Lượt mù được bảo đảm bằng chỉ dẫn + cấu trúc thư mục, **không phải sandbox cứng**; subagent về kỹ thuật vẫn có quyền đọc file.
- Model có thể đã gặp các câu dump công khai trong dữ liệu huấn luyện → không tuyên bố "không bias".
- Không chạy tài nguyên AWS thật; kết luận dựa trên tài liệu + suy luận, đánh dấu `evidence_kind`.
- Khối lượng research lớn (143 câu, ~628 unit, đọc trang thật) → tốn nhiều token/thời gian, có thể cần nhiều phiên.

## 11. Quyết định đã chốt (2026-09-30, người dùng: "theo khuyến nghị")
1. Research chạy bằng subagent nền theo batch ~6 câu, 3–4 batch song song. Research/đánh giá dùng **Opus 5.5, effort high** (`.claude/agents/scs-blind-researcher.md`, `scs-reconciler.md`); web dùng **Sonnet 5.5, effort xhigh** (`scs-web-builder.md`).
2. `verified` = kết luận có bằng chứng trực tiếp, confidence high/medium; có thể khác khóa nguồn (cờ `differs_from_source`) và **được chấm** ở chế độ "Theo research". `disputed` = mâu thuẫn chưa giải quyết → không chấm.
3. Q008: **không chấm** ở cả hai cơ sở (`gradable:false` trong `source_keys.json`); vẫn hiển thị để học kèm ghi chú.
4. Mặc định: snapshot tài liệu AWS cục bộ + kiểm quote; Playwright dùng Edge sẵn có; git local không push; UI tiếng Anh, lời giải tiếng Việt.
5. Bổ sung theo yêu cầu người dùng: chế độ **Practice in order Q001→Q143** (lưu vị trí, resume) và **Exam simulation 65 câu / 170 phút** là chế độ thi mặc định. Chi tiết: `docs/APP_SPEC.md`.
6. Exam guide SCS-C03 (đã đọc 2026-09-30, snapshot `02261bae5e51`): 4 dạng câu; 50 câu tính điểm + 15 câu không tính điểm (= 65); 6 domain: Detection 16%, Incident Response 14%, Infrastructure Security 18%, IAM 20%, Data Protection 18%, Security Foundations and Governance 14%.
