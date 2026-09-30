import json, hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter

root=Path(__file__).resolve().parent
ind=root/'independent.json'
before=hashlib.sha256(ind.read_bytes()).hexdigest()
rows=json.loads(ind.read_text(encoding='utf-8'))['rows']
notes={
 'Q001':'Both withhold a complete answer; observed C support does not resolve execution-role/SourceArn defects.',
 'Q002':'Independent snippet reasoning proposed S1,S5,S3. Official review withholds because user-pool JWTs do not provide temporary AWS credentials. This literal distinction should take precedence for grading.',
 'Q005':'Both withhold; partial comments give inconsistent setup scope and sequences.',
 'Q008':'Both withhold full mapping because source prompts P1/P5 duplicate the traffic strategy. Four plausible partial pairs are not a complete answer.',
 'Q010':'Community reasoning proposes B for multi-Region replicas. Official review withholds because enabled/usable contradicts a deletion-pending primary state. B is intended after correcting the stem, not established literal correctness.',
 'Q011':'Community reasoning proposes Session Manager. Official review withholds because literal SSH, isolation, and billing constraints require distinctions absent from the comment.',
 'Q013':'Community reasoning proposes AE; official review withholds because E has malformed variable syntax/resource text. Policy intent needs source correction.',
 'Q019':'Community proposes intended D while already flagging IAM-user/Identity-Center conflation and existing session revocation. Official review correctly withholds literal immediate containment.',
 'Q024':'Independent assessment and official review both choose C. Observed A claims do not resolve the minimum-rate objection; one A claim is explicitly Claude-derived.',
 'Q026':'Community proposes D. Official review withholds: inline policies may attach to task roles, task roles do not isolate containers inside one task, and secret storage alone does not prevent authorized plaintext sharing. Those objections exceed observed comment coverage.',
 'Q035':'Independent community evidence was insufficient to establish the manual upload mechanism. Existing official review cites EC2 troubleshooting and eic_harvest_hostkeys, which supplies the missing mechanism and supports B. Independent file remains unchanged.'
}
comparison=[]
for r in rows:
    path=root.parents[1]/'reviews'/f"{r['question_id']}.json"
    official=json.loads(path.read_text(encoding='utf-8-sig'))
    ca=r['community_answer']; oa=official.get('researched_answer')
    if r['conclusion_status']=='mapping_unconfirmed': category='no_community_discussion_evidence'
    elif ca is None and oa is None: category='both_withhold_answer'
    elif ca is None: category='community_withholds_official_answered'
    elif oa is None: category='community_proposes_official_withholds'
    elif ca==oa: category='same_answer'
    else: category='answer_disagreement'
    comparison.append(dict(question_id=r['question_id'], independent_answer=ca, independent_conclusion_status=r['conclusion_status'], official_researched_answer=oa, official_status=official.get('status'), comparison=category, review_path=str(path.relative_to(root.parents[2])).replace('\\','/'), review_sha256=hashlib.sha256(path.read_bytes()).hexdigest(), note=notes.get(r['question_id'], 'No observed discussion mapping; no community conclusion to compare.' if category=='no_community_discussion_evidence' else 'Answer agrees; partial indexed discussion is supplementary evidence, not technical proof.')))
now=datetime.now(timezone.utc).isoformat()
counts=dict(Counter(c['comparison'] for c in comparison))
(root/'comparison.json').write_text(json.dumps(dict(scope='Q001-Q036', compared_at=now, independent_sha256=before, independent_saved_before_review_reads=True, counts=counts, rows=comparison),indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
assert hashlib.sha256(ind.read_bytes()).hexdigest()==before
lines=['# Community verification Q001–Q036','',f'Independent conclusions saved at {rows[0]["captured_at"]}; comparison completed at {now}.','',
'36 records; 31 stem-matched SCS-C03 threads; 5 mappings unconfirmed; 27 proposed answers; 25 supported conclusions and 6 disputed conclusions. All discussion coverage is partial indexed search content. Direct 403 was established in the parent session; no live discussion, total vote count, or site-wide majority is claimed. Suggested-answer panels were not observed. Search results incidentally included exam listings, which were excluded from this pass. Older SCS-C02 and unrelated exam threads were rejected.','',
'The independent file was saved before existing reviews were read and is preserved unchanged. Comparisons: '+', '.join(f'{v} {k.replace("_"," ")}' for k,v in counts.items())+'. No conflicting answer pair exists where both passes supplied concrete answers.','',
'## Material differences and evidence gaps','',
'Q002, Q010, Q011, Q013, Q019, and Q026 have community-proposed intent but an official review that withholds literal correctness. Their original stems/options and comments leave credential-type, key-state, SSH/billing, malformed-policy, active-session, or container-authorization requirements unresolved. Retain the official caution in grading.','',
'Q024 is the strongest substantive discussion dispute: some comments favor A, while the specific threshold objection supports C. A later reversal by the same user does not resolve that objection. A claim explicitly attributed to Claude is marked LLM-only and is not independent corroboration.','',
'Q035 illustrates a community evidence gap, not a demonstrated wrong official answer. The saved community pass withheld B because the snippet only offered generic stale-trust reasoning; the subsequent official review identifies the supported host-key harvesting mechanism.','',
'Q001 and Q008 retain source defects despite some confident community comments. Q005 has inconsistent ordering scope. Q006, Q007, Q015, Q018, and Q023 remain mapping-unconfirmed; no guessed numeric discussion ID or copied older-version consensus was used.','',
'## Per-question records','',
'| Question | Community self-assessment | Conclusion | Comparison | Observed thread |',
'|---|---|---|---|---|']
for r,c in zip(rows,comparison):
    answer=', '.join(r['community_answer']) if r['community_answer'] else 'Unknown'
    citation=f'[Topic 1 / {r["question_number"]} · {r["discussion_id"]}]({r["thread_url"]})' if r['thread_url'] else 'Not mapped'
    lines.append(f'| {r["question_id"]} | {answer} | {r["conclusion_status"]} | {c["comparison"]} | {citation} |')
lines += ['', 'Comment usernames, dates exactly as rendered, visible upvotes, selected choices, concise reasoning, and contradictions are recorded in independent.json. Relative comment dates are retained without inventing absolute dates; search crawls may show different relative labels. Observed votes are not a total count. No canonical review, grading, app data, original export, or answer image was modified.','']
(root/'REPORT.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(counts))
