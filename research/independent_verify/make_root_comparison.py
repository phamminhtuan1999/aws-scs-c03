import json,datetime,copy
from pathlib import Path
HERE=Path(__file__).resolve().parent
oldroot=HERE/'before/reviews'
path=HERE/'q109_q143/independent.json'
new=json.loads(path.read_text(encoding='utf-8'))['questions']
out=[]
for x in new:
 qid=x['question_id']; old=json.loads((oldroot/(qid+'.json')).read_text(encoding='utf-8'))
 proposed=copy.deepcopy(x)
 if qid=='Q112':
  proposed['status']='ambiguous';proposed['independent_answer']=None
  proposed['candidate_answers']=[['B'],['C']]
  proposed['correct_explanation_vi']='B và C đều tạo repository với KMS và bật ECR scanning. C thêm SSM Inventory nhưng không làm mất khả năng quét CVE đã bật; đề không nêu tiêu chí loại phần việc thừa nên chưa có đáp án duy nhất.'
  proposed['option_reviews'][2]['reason_vi']='C đã bật ECR scanning nên cũng có CVE analysis; Inventory report chỉ là phần bổ sung, không phải scan report.'
  proposed['source_issues']='Sau lượt độc lập, rà lại toàn bộ mệnh đề C: C dùng cùng KMS + scanning hợp lệ như B. Không thể loại C chỉ vì Inventory không phải CVE report; tiêu chí ít vận hành không có trong stem.'
 answer=[f'{qid}:{a}' for a in proposed['independent_answer']] if proposed['independent_answer'] is not None else None
 selected=set(answer or [])
 replacements={o['unit_id']:o['reason_vi'] for o in proposed['option_reviews'] if o['unit_id'] not in selected}
 change='status_or_answer_change' if (answer!=old['researched_answer'] or proposed['status']!=old['status']) else 'explanation_refinement'
 why=proposed['correct_explanation_vi']
 if proposed['status']!='verified' and not why.startswith('Chưa có đáp án chắc chắn:'):
  why='Chưa có đáp án chắc chắn: '+why
 out.append({'question_id':qid,'previous_status':old['status'],'previous_answer':old['researched_answer'],
  'proposed_status':proposed['status'],'proposed_answer':answer,'confidence':proposed['confidence'],
  'change_type':change,'mandatory':change=='status_or_answer_change','reason_vi':proposed['source_issues'] or proposed['correct_explanation_vi'],
  'explanation_vi':{'why_correct':why,'others':replacements},'option_reviews':proposed['option_reviews'],
  'memory_tip_vi':proposed['memory_tip_vi'],'source_issues':proposed['source_issues'],
  'references':proposed['references'],'independent_record_path':str(path.relative_to(HERE)).replace('\\','/'),
  'independent_record_answer':x['independent_answer'],'post_comparison_change':qid=='Q112'})
(HERE/'q109_q143/comparison.json').write_text(json.dumps({'compared_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'questions':out},ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Đối chứng Q109–Q143','',
'35/35 câu; 150/150 lựa chọn. Đã lưu kết luận độc lập trước khi đọc từng hồ sơ research r1. Root từng thấy ghi chú tổng hợp Q118/Q122/Q133/Q143 và khóa nguồn Q143, nên không gọi nhóm này hoàn toàn blinded.','',
'Lời giải được viết lại ngắn, giữ caveats trong hồ sơ chi tiết. Q112 đổi kết luận sau khi đọc lại mọi mệnh đề option C, không do khóa nguồn.','',
'| Câu | Research trước | Đề xuất sau đối chứng | Lý do |','|---|---|---|---|']
for x in out:
 if x['change_type']=='status_or_answer_change':
  lines.append(f"| {x['question_id']} | {x['previous_status']} / {x['previous_answer']} | {x['proposed_status']} / {x['proposed_answer']} | {x['reason_vi']} |")
lines+=['','Các câu còn lại giữ khóa/status, chỉnh lời giải và caveat; xem comparison.json cho đủ từng option.','']
(HERE/'q109_q143/REPORT.md').write_text('\n'.join(lines),encoding='utf-8')
print('Root comparison:',len(out),'questions; changes:',[(x['question_id'],x['proposed_status']) for x in out if x['change_type']=='status_or_answer_change'])
