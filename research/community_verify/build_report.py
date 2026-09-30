import csv
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
TRAINER = BASE.parents[1]
WORKSPACE = TRAINER.parent
NOW = datetime.now(timezone.utc).isoformat()

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def normalize(value):
    return re.sub(r'\s+', ' ', value).strip().casefold()

questions = {q['id']: q for q in read(BASE / 'questions_no_keys.json')['questions']}
assert len(questions) == 143
old_baseline = read(TRAINER / 'research/independent_verify/baseline_hashes.json')['files']
frozen = {p: h for p, h in old_baseline.items() if p.startswith('output/') or p.endswith('.html')}
assert frozen and all(digest(WORKSPACE / p) == h for p, h in frozen.items()), 'Frozen baseline differs'
protected = dict(frozen)
protected_paths = list((TRAINER / 'research/reviews').glob('Q*.json'))
protected_paths += [TRAINER / 'research/question_reviews.json']
protected_paths += [p for directory in [TRAINER / 'data', TRAINER / 'app/src', TRAINER / 'app/public'] if directory.exists() for p in directory.rglob('*') if p.is_file()]
for p in protected_paths:
    protected[p.relative_to(WORKSPACE).as_posix()] = digest(p)
save(BASE / 'protected_hashes.json', {'captured_at': NOW, 'files': protected})

# Persist root discussion-only assessment before the new mechanical comparison.
# Root had prior r2 exposure; this subgroup is explicitly not blind.
root_data = read(BASE / 'root_prepared.json')
for row in root_data['rows']:
    q = questions[row['question_id']]
    row['question_content_hash'] = q['content_hash']
    row['checked_at'] = NOW
    observation = row.pop('stem_observation')
    phrase = None
    if row['mapping_confirmed']:
        for block in q['stem']:
            if block['type'] == 'text' and len(block['text'].split()) >= 15:
                words = block['text'].split()
                for start in range(len(words) - 11):
                    candidate = ' '.join(words[start:start + 12])
                    if normalize(candidate) in normalize(observation):
                        phrase = candidate
                        break
                if phrase:
                    break
        assert phrase, f"No local stem match for {q['id']}"
    row['mapping'] = {'confirmed': row['mapping_confirmed'], 'distinctive_stem_phrase': phrase, 'evidence': 'Exam code, question number, and local stem matched in indexed thread body.' if phrase else 'No matching thread body observed.'}
    row['substantive_comment_evidence'] = row['mapping_confirmed'] and row['assessment']['status'] != 'no_discussion_evidence'
    row['date_note'] = 'Relative date is retained as rendered; aliases of the same forum ID can have different cached ages. Visible upvotes from an alias are not total votes. Same-author aliases are counted once.'
root_data['saved_at'] = NOW
root_path = BASE / 'q073_q143/independent.json'
save(root_path, root_data)

inputs = [BASE / 'q001_q036/independent.json', BASE / 'q037_q072/independent.json', root_path]
input_hashes = {p.relative_to(BASE).as_posix(): digest(p) for p in inputs}
rows = []
for group, path in enumerate(inputs):
    for r in read(path)['rows']:
        qid = r['question_id']
        if group == 0:
            mapped = r['mapping_match']['status'] == 'matched_stem'
            comments = r['observed_comments']
            urls = [r['thread_url']] if r['thread_url'] else []
            forum = r['discussion_id']
            status = r['conclusion_status']
            answer = r['independent_self_assessment']['answer']
            reasoning = r['independent_self_assessment']['reasoning']
            mapping = r['mapping_match']
        elif group == 1:
            mapped = r['mapping']['confirmed']
            comments = r['comments']
            urls = [r['source_url']] if r['source_url'] else []
            forum = r['discussion_numeric_id']
            status = r['assessment']['status']
            answer = r['assessment']['canonical_ids']
            reasoning = r['assessment']['reasoning']
            mapping = r['mapping']
        else:
            mapped = r['mapping_confirmed']
            comments = r['comments']
            urls = r['source_urls']
            forum = r['discussion_id']
            status = r['assessment']['status']
            answer = r['assessment']['canonical_ids']
            reasoning = r['assessment']['reasoning_vi']
            mapping = r['mapping']
        substantive = mapped and bool(comments) and status != 'no_discussion_evidence'
        if mapped:
            assert urls and forum
            assert all('scs-c03-topic-1' in u and f'/view/{forum}-' in u for u in urls)
            for u in urls:
                m = re.search(r'-question-(\d+)-', u)
                if m:
                    assert int(m[1]) == int(qid[1:])
        if not substantive:
            assert answer is None
        rows.append({'question_id': qid, 'question_content_hash': questions[qid]['content_hash'], 'question_type': questions[qid]['type'], 'exam': 'SCS-C03', 'topic': 1, 'question_number': int(qid[1:]), 'discussion_id': forum, 'discussion_urls': urls, 'mapping_confirmed': mapped, 'mapping_evidence': mapping, 'source_access': 'indexed_partial/direct403', 'comments_coverage': 'partial' if comments else 'not_observed', 'comments': comments, 'substantive_comment_evidence': substantive, 'community_top_answer': None, 'whole_thread_vote_totals': None, 'suggested_answer': None, 'self_assessment_answer': answer, 'self_assessment_status': status, 'self_assessment_reasoning': reasoning, 'blind_before_comparison': group < 2, 'independent_record': path.relative_to(BASE).as_posix(), 'independent_sha256': input_hashes[path.relative_to(BASE).as_posix()]})

rows.sort(key=lambda r: r['question_number'])
assert [r['question_id'] for r in rows] == list(questions)
assert len({r['discussion_id'] for r in rows if r['mapping_confirmed']}) == sum(r['mapping_confirmed'] for r in rows)

def validate_answer(q, answer):
    if answer is None:
        return
    interaction = q.get('interaction', {})
    if q['type'] == 'matching':
        assert isinstance(answer, dict)
        assert set(answer) == {p['id'] for p in interaction['prompts']}
        assert set(answer.values()) <= {p['id'] for p in interaction['responses']}
        if not interaction['reuse']:
            assert len(set(answer.values())) == len(answer)
    elif q['type'] == 'ordering':
        assert len(answer) == interaction['slots']
        assert set(answer) <= {p['id'] for p in interaction['steps']}
        assert len(set(answer)) == len(answer)
    else:
        assert set(answer) <= {c['id'] for c in q['choices']}
        assert len(set(answer)) == len(answer)
        assert len(answer) == (q.get('choose') or 1)

for row in rows:
    validate_answer(questions[row['question_id']], row['self_assessment_answer'])

# Existing subgroup comparisons are preserved; root compares only after persistence.
existing = {}
for sub in ['q001_q036', 'q037_q072']:
    existing.update({r['question_id']: r for r in read(BASE / sub / 'comparison.json')['rows']})
comparisons = []
for row in rows:
    qid = row['question_id']
    review_path = TRAINER / f'research/reviews/{qid}.json'
    review = read(review_path)
    assert review['question_content_hash'] == row['question_content_hash']
    a, b = row['self_assessment_answer'], review['researched_answer']
    validate_answer(questions[qid], b)
    if not row['substantive_comment_evidence']:
        category = 'no_community_discussion_evidence'
    elif a is None and b is None:
        category = 'both_withhold_answer'
    elif a is None:
        category = 'community_withholds_official_answered'
    elif b is None:
        category = 'community_proposes_official_withholds'
    elif a == b:
        category = 'same_answer'
    else:
        category = 'answer_disagreement'
    previous = existing.get(qid, {})
    note = previous.get('note') or previous.get('assessment')
    if not note:
        note = {'same_answer': 'Nhận định từ comment khớp research r2; chưa chứng minh majority hoặc tính đúng kỹ thuật bằng discussion.', 'both_withhold_answer': 'Cả hai lượt chưa chốt đáp án đầy đủ; comment không giải quyết hết điều kiện/chi tiết của đề.', 'community_withholds_official_answered': 'Comment quan sát được chưa đủ chứng minh toàn bộ đáp án mà research r2 chọn.', 'community_proposes_official_withholds': 'Lập luận comment nêu đáp án dự kiến; research r2 còn giữ vấn đề nguyên văn.', 'no_community_discussion_evidence': 'Chưa có lập luận discussion để so sánh; không xem đây là bất đồng.'}.get(category, 'Có khác biệt cần phân xử.')
    comparisons.append({'question_id': qid, 'community_self_assessment_answer': a, 'community_self_assessment_status': row['self_assessment_status'], 'official_researched_answer': b, 'official_status': review['status'], 'source_answer': review.get('source_answer'), 'comparison': category, 'note': note, 'official_note_vi': review.get('notes_vi'), 'official_review_sha256': digest(review_path), 'discussion_urls': row['discussion_urls']})
save(BASE / 'q073_q143/comparison.json', {'scope': 'Q073-Q143', 'compared_at': datetime.now(timezone.utc).isoformat(), 'independent_sha256': digest(root_path), 'root_previously_exposed_to_r2': True, 'rows': comparisons[72:]})

counts = dict(Counter(c['comparison'] for c in comparisons))
summary = {'created_at': NOW, 'questions_attempted': len(rows), 'matched_threads': sum(r['mapping_confirmed'] for r in rows), 'substantive_comment_evidence': sum(r['substantive_comment_evidence'] for r in rows), 'mapped_without_substantive_reasoning': [r['question_id'] for r in rows if r['mapping_confirmed'] and not r['substantive_comment_evidence']], 'mapping_gaps': [r['question_id'] for r in rows if not r['mapping_confirmed']], 'assessment_status_counts': dict(Counter(r['self_assessment_status'] for r in rows)), 'comparison_counts': counts, 'full_live_threads_read': 0, 'canonical_answers_changed': 0, 'blind_question_count': 72, 'root_prior_r2_exposure_question_count': 71, 'independent_input_hashes': input_hashes}
save(BASE / 'discussion_assessments.json', {'method_vi': 'Đánh giá riêng lập luận trong comment được search index hiển thị. Q001–Q072: hai agent mới không đọc key/research trước khi lưu kết luận; Q073–Q143: root đã biết r2 nên không phải blind. Không suy ra majority từ mẫu comment; không dùng comment AI làm đối chứng độc lập.', 'rows': rows})
save(BASE / 'comparison_all.json', {'created_at': NOW, 'counts': counts, 'rows': comparisons})
save(BASE / 'coverage.json', summary)
with (BASE / 'comparison_all.csv').open('w', encoding='utf-8-sig', newline='') as f:
    fields = ['question_id', 'community_self_assessment_answer', 'community_self_assessment_status', 'official_researched_answer', 'official_status', 'comparison', 'discussion_urls', 'official_note_vi']
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    for row in comparisons:
        writer.writerow({k: json.dumps(row[k], ensure_ascii=False) if isinstance(row[k], (list, dict)) else row[k] for k in fields})

labels = {'same_answer': 'khớp đáp án', 'community_proposes_official_withholds': 'discussion đề xuất đáp án, r2 chưa chốt', 'both_withhold_answer': 'cả hai chưa chốt', 'community_withholds_official_answered': 'discussion chưa đủ căn cứ, r2 đã chốt', 'no_community_discussion_evidence': 'chưa có lập luận discussion để đối chiếu', 'answer_disagreement': 'bất đồng đáp án cụ thể'}
lines = ['# Đối chứng discussion ExamTopics — SCS-C03', '', f'Ngày kiểm tra: {NOW}. Rà cả 143 câu bằng tìm kiếm công khai; chỉ đọc được phần thread/comment đã được lập chỉ mục.', '', f"**Map chắc chắn {summary['matched_threads']}/143 thread; {summary['substantive_comment_evidence']}/143 câu có comment mang lập luận.** Q095 map được nhưng comment chỉ hỏi cách giải; 69 câu còn thiếu mapping nội dung. Không có thread nào được đọc đầy đủ trực tiếp vì lỗi 403. Đây là kiểm tra từng phần, chưa phải xác minh discussion đầy đủ cho 143 câu.", '', '## Mức độc lập và giới hạn', '', 'Hai agent mới xử lý Q001–Q036 và Q037–Q072 bằng bộ đề không có key, lưu kết luận trước khi đọc research r2. Root xử lý Q073–Q143, đã biết r2 từ lượt trước; nhóm này tách nguồn discussion nhưng không phải blind hoàn toàn. Không nói toàn bộ lượt kiểm tra độc lập tuyệt đối.', '', 'Chấp nhận mapping khi khớp SCS-C03, topic 1, số câu và nội dung đề. ID question trong HTML khác ID forum: ví dụ Q001 có discussion ID 382889. Loại SCS-C02, SAA-C03, trang danh sách không có stem và kết quả khác đề. Hai HTML gốc không có liên kết discussion.', '', 'Chỉ lưu tóm tắt comment, tên người dùng, ngày tương đối như hiển thị và vote quan sát được. URL alias cùng forum ID không phải thêm người bỏ phiếu. Người đổi đáp án được xem là một tác giả; comment dẫn Claude/GPT không được tính là bằng chứng độc lập. Không biết tổng vote, majority hiện tại hay đáp án suggested ẩn.', '', '## So sánh với research AWS r2', '']
lines += [f'- {n} câu: {labels[k]}.' for k, n in counts.items()]
lines += ['', 'Không thấy cặp đáp án cụ thể khác nhau khi cả hai lượt đều chốt. Việc trùng lựa chọn không chứng minh tất cả comment đúng; một số comment bỏ qua điều kiện của đề. Đáp án gốc, nghiên cứu r2 và dữ liệu chấm điểm giữ nguyên.', '', '## Điểm cần chú ý', '', '- [Q001](https://www.examtopics.com/discussions/amazon/view/382889-exam-aws-certified-security-specialty-scs-c03-topic-1/): comment nghiêng C, nhưng có người nêu C chỉ sửa object ARN, chưa sửa principal. Không chốt C như lời giải hoàn chỉnh.', '- [Q024](https://www.examtopics.com/discussions/amazon/view/382941-exam-aws-certified-security-specialty-scs-c03-topic-1-question-24-discussion/): có tranh luận A/C. Lập luận về giới hạn tối thiểu 10 hỗ trợ C; việc cùng người đổi sang A và comment dẫn Claude chưa giải quyết phản biện này. Nhận định C khớp r2, khác key gốc A.', '- Q002, Q010, Q011, Q013, Q019, Q026, Q041, Q045, Q047, Q054, Q056, Q070: comment nêu đáp án dự kiến, nhưng r2 còn vấn đề nguyên văn/điều kiện. Giữ trạng thái chưa chốt để tránh chấm sai.', '- [Q076](https://www.examtopics.com/discussions/amazon/view/404547-exam-aws-certified-security-specialty-scs-c03-topic-1-question-76-discussion/): một comment chọn B nhưng giải thích chức năng ở D. Tự đối chiếu nội dung lựa chọn vẫn nghiêng D; không cộng B theo lập luận đó.', '- [Q077](https://www.examtopics.com/discussions/amazon/view/404548-exam-aws-certified-security-specialty-scs-c03-topic-1-question-77-discussion/): comment chọn B chưa giải quyết yêu cầu ngăn tạo rule; xóa sau finding là bước xảy ra sau tạo.', '- [Q084](https://www.examtopics.com/discussions/amazon/view/409754-exam-aws-certified-security-specialty-scs-c03-topic-1-question-84-discussion/): comment hỗ trợ kiến trúc A, chưa kiểm chứng chi tiết selector. Cả hai lượt không chốt nguyên văn.', '- Q035 và Q063: research r2 có đáp án, phần discussion quan sát được chưa đủ căn cứ. Đây là thiếu bằng chứng cộng đồng, không phải đã chứng minh r2 sai.', '', '## Tình trạng từng câu', '', '| Câu | Map thread | Comment có lập luận | Tự đánh giá discussion | Research r2 | Đối chiếu |', '|---|---|---|---|---|---|']
def answer_display(a):
    if a is None: return 'Chưa chốt'
    if isinstance(a, dict): return ', '.join(f'{k.split(":")[-1]}={v.split(":")[-1]}' for k, v in a.items())
    return ', '.join(s.split(':')[-1] for s in a)
for row, comp in zip(rows, comparisons):
    link = f"[Đúng đề]({row['discussion_urls'][0]})" if row['mapping_confirmed'] else 'Chưa map'
    lines.append(f"| {row['question_id']} | {link} | {'Có' if row['substantive_comment_evidence'] else 'Chưa có'} | {answer_display(row['self_assessment_answer'])} | {answer_display(comp['official_researched_answer'])} | {labels[comp['comparison']]} |")
lines += ['', '## Dữ liệu và kiểm tra', '', '- `discussion_assessments.json`: 143 bản ghi, mapping, comment và nhận định riêng.', '- `comparison_all.json` / `comparison_all.csv`: đối chiếu 143 câu với r2.', '- `coverage.json`: phạm vi thực đọc và các câu thiếu bằng chứng.', '- `q001_q036/independent.json`, `q037_q072/independent.json`, `q073_q143/independent.json`: giữ kết luận từng nhóm; hash đã lưu để kiểm tra thứ tự và việc không sửa lại theo r2.', '- `validation.json`: xác nhận đủ ID, đáp án thuộc đúng lựa chọn/hàng, content hash khớp r2, không trùng forum và các file được bảo vệ không thay đổi.', '', 'Chưa cập nhật giải thích hoặc chấm điểm của app theo comment thiếu căn cứ. Discussion này bổ sung ý kiến và phản biện cho giải thích r2; lời giải trong app vẫn dựa trên lượt research AWS đã kiểm tra riêng.', '']
(BASE / 'REPORT.md').write_text('\n'.join(lines), encoding='utf-8')
assert all(digest(BASE / p) == h for p, h in input_hashes.items()), 'Independent conclusions were modified'
changed = [p for p, h in protected.items() if digest(WORKSPACE / p) != h]
assert not changed, changed
validation = {'checked_at': datetime.now(timezone.utc).isoformat(), 'passed': True, 'question_rows': 143, 'comparison_rows': len(comparisons), 'all_question_ids_present_once': True, 'content_hashes_match_official_r2': True, 'answers_use_valid_canonical_ids': True, 'confirmed_thread_exam_topic_and_number_valid': True, 'no_duplicate_forum_ids_across_questions': True, 'independent_files_unchanged_during_comparison': True, 'protected_files_checked': len(protected), 'frozen_baseline_files_checked': len(frozen), 'changed_protected_files': changed, 'limitations': ['Indexed excerpts only; no full/live discussion', 'Root subgroup had prior r2 exposure', 'Mapping evidence for agent groups is their persisted attestation, not a fresh live fetch']}
save(BASE / 'validation.json', validation)
print(json.dumps(summary, ensure_ascii=False, indent=2))
