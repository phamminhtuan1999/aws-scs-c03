"""Build the derived data layer from the frozen export (output/pdf/question_bank.json).

Outputs (all under scs-c03-trainer/data/):
  original/question_bank.json + original/images/*   byte-identical copies (hash-checked)
  normalized/bank.json                              question content only (no keys/votes), stable IDs, image roles
  normalized/normalization_audit.json               every text block whose string changed under the whitespace rule
  interactions/hotspot.json                         ordering/matching mappings (+ provenance of manual visual checks)
  keys/source_keys.json                             normalized, immutable source answer keys

Whitespace rule (the ONLY normalization): strip ends; collapse any run of whitespace (space, tab, CR, LF, NBSP excluded)
to one ASCII space. NBSP and every other character are preserved.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re, shutil, sys

TRAINER = Path(__file__).resolve().parents[1]
SRC = TRAINER.parent / 'output' / 'pdf'
DATA = TRAINER / 'data'
NOW = datetime.now(timezone.utc).isoformat()

WS = re.compile(r'[ \t\r\n\f\v]+')


def norm(t: str) -> str:
    return WS.sub(' ', t).strip()


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def canon_hash(obj) -> str:
    return sha(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8'))


# ---------------------------------------------------------------- hotspot mappings (manual, visually checked)
# Option lists are the stem text blocks (by index) that the source shows as dropdown entries.
# Slot count / row count read from the unanswered stem image. Keys read from green borders in the answer image.
HOTSPOT = {
    'Q002': {'kind': 'ordering', 'step_blocks': [3, 4, 5, 6, 7, 8], 'slots': 3,
             'rule_text': 'Select each step one time or not at all.', 'reuse': False,
             'key_indices': [1, 5, 3]},
    'Q005': {'kind': 'ordering', 'step_blocks': [3, 4, 5, 6, 7, 8], 'slots': 3,
             'rule_text': 'Select each step one time or not at all.', 'reuse': False,
             'key_indices': [6, 1, 3]},
    'Q073': {'kind': 'ordering', 'step_blocks': [4, 5, 6, 7, 8], 'slots': 3,
             'rule_text': 'Select each step one time or not at all. (Select and order THREE.)', 'reuse': False,
             'key_indices': [1, 3, 4]},
    'Q008': {'kind': 'matching', 'response_blocks': [3, 4, 5, 6, 7],
             'rule_text': 'Select each monitoring strategy one time.', 'reuse': False,
             'reuse_note': 'Instruction says each strategy is used once, but in the source image the rows are strategies and the dropdowns list scenarios; row 1 and row 5 carry the identical strategy text. Enforced in UI as: each scenario (response) selectable once.',
             'key_indices': [5, 4, 3, 1, 2]},
    'Q079': {'kind': 'matching', 'response_blocks': [4, 5, 6, 7, 8, 9],
             'rule_text': 'Select each resource one time or not at all.', 'reuse': False,
             'key_indices': [2, 6, 1]},
    'Q081': {'kind': 'matching', 'response_blocks': [4, 5, 6, 7, 8],
             'rule_text': 'Select each AWS Config based solution one time.', 'reuse': False,
             'key_indices': [2, 1, 4, 3, 5]},
    'Q082': {'kind': 'matching', 'response_blocks': [4, 5, 6, 7, 8],
             'rule_text': 'Select each security pillar design principle one time.', 'reuse': False,
             'key_indices': [3, 2, 4, 5, 1]},
}
HOTSPOT_NOTES = {
    'Q008': ['Rows 1 and 5 of the source image contain the identical strategy text but the answer image marks different scenarios for them (row 1 -> "Monitor network traffic...", row 5 -> "Correlate security findings...").',
             'The stem text list contains the five scenarios followed by one strategy sentence ("Configure VPC Flow Logs ...") that is actually the row-1 label of the image; retained unchanged.',
             'Layout is inverted relative to the instruction ("select the strategy for each scenario"): image rows are strategies, dropdowns list scenarios.',
             'Typo in source: "Amazon EC2 distances" (instances).'],
    'Q082': ['Stem bullet "Configure service and application logging" has no final period; the dropdown in the source image shows "Configure service and application logging." Stem text is used as the response label.',
             'Row 3 prompt text is taken from the export transcription "ports 0-65535" (ASCII hyphen); the source image shows an en dash.'],
    'Q005': ['Source typos retained: "exlemai" (external), "specifics" (specifies).'],
}


def main():
    bank_path = SRC / 'question_bank.json'
    bank_bytes = bank_path.read_bytes()
    bank = json.loads(bank_bytes)
    qs = bank['questions']
    assert [q['id'] for q in qs] == [f'Q{i:03d}' for i in range(1, 144)], 'IDs not Q001..Q143'

    # ---- original copy
    (DATA / 'original' / 'images').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(bank_path, DATA / 'original' / 'question_bank.json')
    assert sha((DATA / 'original' / 'question_bank.json').read_bytes()) == sha(bank_bytes)
    all_images = {}
    for q in qs:
        for role, blocks in [('stem', q['stem'])] + [(f'choice:{c["letter"]}', c['blocks']) for c in q['choices']] + [('answer', q['answer'])]:
            for b in blocks:
                if b['type'] == 'image':
                    data = (SRC / b['file']).read_bytes()
                    assert sha(data) == b['sha256'], b['file']
                    shutil.copyfile(SRC / b['file'], DATA / 'original' / b['file'])
                    all_images[b['file']] = {'question_id': q['id'], 'role': role.split(':')[0], 'sha256': b['sha256']}
    assert len(all_images) == 35

    audit = []

    def nblocks(qid, where, blocks, role):
        out = []
        for i, b in enumerate(blocks):
            bid = f'{qid}:{where}:{i}'
            if b['type'] == 'text':
                t = norm(b['text'])
                if t != b['text']:
                    audit.append({'block_id': bid, 'before': b['text'], 'after': t})
                out.append({'id': bid, 'type': 'text', 'text': t})
            else:
                out.append({'id': bid, 'type': 'image', 'file': b['file'], 'label': b['label'], 'width': b['width'],
                            'height': b['height'], 'sha256': b['sha256'], 'role': role})
        return out

    normalized, keys, hotspot = [], {}, {}
    for q in qs:
        qid = q['id']
        stem = nblocks(qid, 'stem', q['stem'], 'stem')
        choices = [{'id': f'{qid}:{c["letter"]}', 'letter': c['letter'], 'blocks': nblocks(qid, c['letter'], c['blocks'], 'choice')} for c in q['choices']]
        text = ' '.join(b['text'] for b in stem if b['type'] == 'text')
        m = re.search(r'\((?:Choose|Select)\s+(two|three|four|TWO|THREE|FOUR)\.?\)', text)
        choose = {'two': 2, 'three': 3, 'four': 4}[m[1].lower()] if m else None
        item = {'id': qid, 'number': q['number'], 'type': q['question_type'], 'topic': q['topic'],
                'source_file': q['source_file'], 'source_question_id': q['source_question_id'],
                'choose': choose, 'stem': stem, 'choices': choices}
        item['content_hash'] = canon_hash({'type': item['type'], 'stem': q['stem'], 'choices': q['choices'],
                                           'image_question_rows': q.get('image_question_rows')})
        normalized.append(item)

        # ---- source key
        if q['question_type'] in ('multiple_choice', 'multiple_response'):
            raw = ''.join(b['text'] for b in q['answer'] if b['type'] == 'text').strip()
            letters = list(raw)
            valid = [c['letter'] for c in q['choices']]
            assert all(l in valid for l in letters), (qid, raw)
            assert len(set(letters)) == len(letters)
            expected_n = 1 if q['question_type'] == 'multiple_choice' else choose
            assert len(letters) == expected_n, (qid, raw, expected_n)
            keys[qid] = {'type': q['question_type'], 'raw': raw, 'choice_ids': [f'{qid}:{l}' for l in sorted(letters)],
                         'gradable': True, 'derivation': 'Letters of the text answer block in question_bank.json.'}
        else:
            h = HOTSPOT[qid]
            answer_img = [b for b in q['answer'] if b['type'] == 'image']
            assert len(answer_img) == 1
            trans = q['answer_image_transcription']
            if h['kind'] == 'ordering':
                steps = []
                for n, bi in enumerate(h['step_blocks'], 1):
                    t = norm(q['stem'][bi]['text'])
                    label = t[2:] if t.startswith('• ') else t
                    steps.append({'id': f'{qid}:S{n}', 'text': label, 'source_block': f'{qid}:stem:{bi}',
                                  'bullet_stripped': t.startswith('• ')})
                key_ids = [f'{qid}:S{i}' for i in h['key_indices']]
                # cross-check against the exported transcription text ("Step k: <text>")
                for k, (sid, line) in enumerate(zip(key_ids, trans), 1):
                    step = next(s for s in steps if s['id'] == sid)
                    assert line == f'Step {k}: {step["text"]}', (qid, line, step['text'])
                hotspot[qid] = {'kind': 'ordering', 'slots': h['slots'], 'steps': steps, 'reuse': h['reuse'],
                                'rule_source_text': h['rule_text'], 'stem_image': f'{qid}:stem:{len(q["stem"]) - 1}'}
                keys[qid] = {'type': 'ordering', 'sequence': key_ids, 'gradable': True,
                             'derivation': 'Green-bordered selections in the answer image, read per Step slot; matched to step IDs by exact text of export transcription.',
                             'answer_image': answer_img[0]['file']}
            else:
                responses = []
                for n, bi in enumerate(h['response_blocks'], 1):
                    t = norm(q['stem'][bi]['text'])
                    label = t[2:] if t.startswith('• ') else t
                    responses.append({'id': f'{qid}:R{n}', 'text': label, 'source_block': f'{qid}:stem:{bi}',
                                      'bullet_stripped': t.startswith('• ')})
                prompts = [{'id': f'{qid}:P{n}', 'text': norm(t), 'source': f'source image row {n} (image_question_rows[{n - 1}])'}
                           for n, t in enumerate(q['image_question_rows'], 1)]
                assert len(prompts) == len(h['key_indices'])
                pairs = {p['id']: f'{qid}:R{ri}' for p, ri in zip(prompts, h['key_indices'])}
                for line, p in zip(trans, prompts):
                    resp = next(r for r in responses if r['id'] == pairs[p['id']])
                    body = line.split(': ', 1)[1] if line.startswith('Row ') else line
                    lhs, rhs = body.split(' -> ')
                    assert lhs == p['text'], (qid, lhs)
                    assert rhs.rstrip('.') == resp['text'].rstrip('.'), (qid, rhs, resp['text'])
                hotspot[qid] = {'kind': 'matching', 'prompts': prompts, 'responses': responses, 'reuse': h['reuse'],
                                'rule_source_text': h['rule_text'], 'stem_image': f'{qid}:stem:{len(q["stem"]) - 1}'}
                if 'reuse_note' in h:
                    hotspot[qid]['reuse_note'] = h['reuse_note']
                gradable = qid != 'Q008'
                keys[qid] = {'type': 'matching', 'pairs': pairs, 'gradable': gradable,
                             'derivation': 'Green-bordered selection in each row of the answer image; matched to prompt/response IDs by exact text of export transcription.',
                             'answer_image': answer_img[0]['file']}
                if not gradable:
                    keys[qid]['ungradable_reason'] = ('Rows P1 and P5 have identical prompt text but different source answers; a learner cannot '
                                                      'distinguish them, so the key is not answerable as shown. Displayed for study, never scored (decision 2026-09-30).')
            hotspot[qid]['source_notes'] = HOTSPOT_NOTES.get(qid, [])
            hotspot[qid]['ui_labels_note'] = 'Step/Row/P/R labels and IDs are UI additions; option text is the source stem text (bullet prefix "• " removed for display only, flag bullet_stripped).'

    provenance = {'built_at_utc': NOW, 'source': 'output/pdf/question_bank.json', 'source_sha256': sha(bank_bytes),
                  'builder': 'tools/build_data.py'}
    hotspot_prov = dict(provenance, method='Stem/answer images of Q002, Q005, Q008, Q073, Q079, Q081, Q082 viewed at original resolution by the agent on 2026-09-30; slot counts, option order in each dropdown (identical to stem list order), and each green-bordered selection checked by eye; also asserted equal to the exported transcription text.',
                        visual_check={'Q002': 'slots=3; key S1,S5,S3', 'Q005': 'slots=3; key S6,S1,S3', 'Q073': 'slots=3; key S1,S3,S4',
                                      'Q008': 'rows=5; key R5,R4,R3,R1,R2 (row1==row5 text)', 'Q079': 'rows=3; key R2,R6,R1',
                                      'Q081': 'rows=5; key R2,R1,R4,R3,R5', 'Q082': 'rows=5; key R3,R2,R4,R5,R1'})

    def write(rel, obj):
        p = DATA / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')
        return sha(p.read_bytes())

    h1 = write('normalized/bank.json', {'provenance': provenance, 'whitespace_rule': __doc__.split('Whitespace rule')[1].strip(),
                                        'exam': bank['exam'], 'questions': normalized,
                                        'images': all_images})
    write('normalized/normalization_audit.json', {'provenance': provenance, 'changed_blocks': audit})
    h2 = write('interactions/hotspot.json', {'provenance': hotspot_prov, 'questions': hotspot})
    h3 = write('keys/source_keys.json', {'provenance': dict(provenance, immutable=True,
                                                             note='Source answer keys copied from the supplied HTML, normalized to stable IDs. NOT technically verified. Never edited by research.'),
                                         'keys': keys})
    units = sum(len(q['choices']) for q in normalized) + sum(len(h['steps']) if h['kind'] == 'ordering' else len(h['prompts']) + len(h['responses']) for h in hotspot.values())
    print(json.dumps({'questions': len(normalized), 'choices': sum(len(q['choices']) for q in normalized),
                      'research_units': units, 'changed_blocks': len(audit), 'images': len(all_images),
                      'answer_images': sum(1 for v in all_images.values() if v['role'] == 'answer'),
                      'gradable_source_keys': sum(k['gradable'] for k in keys.values()),
                      'sha': {'bank': h1, 'hotspot': h2, 'keys': h3}}, indent=2))


if __name__ == '__main__':
    main()
