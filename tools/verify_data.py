"""Independent data-integrity check of the trainer's data layer against the ORIGINAL sources.

Reads (read-only): the two source HTML files (decoded with lxml, scripts never executed),
output/pdf/question_bank.json + images, and scs-c03-trainer/data/*. Does not import build_data.py or app code.
Checks:
  1. 143 questions Q001..Q143, types and counts (112/24/3/4), 572 choices, choice letter order per question.
  2. Every stem/choice text block of data/normalized/bank.json == HTML text (whitespace-collapsed only), in order.
  3. Every image: bytes in data/original/images == HTML data-URI bytes (sha256), same question, same role, same position.
  4. Source keys: MC/MR letters == HTML .correct-answer text; hotspot keys equal the export transcription.
  5. Blind set contains no answer images/fields (re-check).
Writes reports/data_integrity.json and prints a summary; exit 1 on any issue.
"""
from pathlib import Path
from datetime import datetime, timezone
import base64, hashlib, json, re, sys
from collections import Counter
from lxml import html as LH

TRAINER = Path(__file__).resolve().parents[1]
WS = TRAINER.parent
sha = lambda b: hashlib.sha256(b).hexdigest()
collapse = lambda s: re.sub(r'\s+', ' ', s).strip()


def cls(c):
    return f"contains(concat(' ',normalize-space(@class),' '),' {c} ')"


def tokens(node, drop_letter=False):
    out, buf = [], []

    def flush():
        t = collapse(''.join(buf)); buf.clear()
        if t: out.append(('text', t))

    def walk(el):
        if not isinstance(el.tag, str) or el.tag in ('script', 'style'): return
        if drop_letter and 'multi-choice-letter' in (el.get('class') or '').split(): return
        if el.tag == 'img':
            flush(); out.append(('image', sha(base64.b64decode(el.attrib['src'].split(',', 1)[1])))); return
        if el.tag == 'br':
            flush(); return
        if el.text: buf.append(el.text)
        for ch in el:
            walk(ch)
            if ch.tail: buf.append(ch.tail)
    walk(node); flush()
    return out


def parse_html():
    qs = {}
    for p in sorted(WS.glob('*.html')):
        raw = p.read_text(encoding='utf-8')
        payload = re.search(r'var\s+b2\s*=\s*"([^"]+)"', raw)[1]
        key = re.search(r'var\s+key\s*=\s*"([^"]+)"', raw)[1].encode()
        first = base64.b64decode(payload)
        doc = LH.fromstring(base64.b64decode(bytes(v ^ key[i % len(key)] for i, v in enumerate(first))).decode('utf-8'))
        for card in doc.xpath('//*[' + cls('exam-question-card') + ']'):
            n = int(re.search(r'Question\s*#(\d+)', ''.join(card.xpath('.//*[' + cls('card-header') + ']')[0].itertext()))[1])
            body = card.xpath('.//*[' + cls('question-body') + ']')[0]
            stem = body.xpath('./p[' + cls('card-text') + ' and not(' + cls('question-answer') + ')]')[0]
            choices = [(c.xpath('.//*[' + cls('multi-choice-letter') + ']')[0].get('data-choice-letter'), tokens(c, True))
                       for c in card.xpath('.//*[' + cls('multi-choice-item') + ']')]
            answer = tokens(card.xpath('.//*[' + cls('correct-answer') + ']')[0])
            qs[f'Q{n:03d}'] = {'stem': tokens(stem), 'choices': choices, 'answer': answer}
    return qs


def main():
    issues, checked = [], Counter()
    src = parse_html()
    bank = json.loads((TRAINER / 'data/normalized/bank.json').read_text(encoding='utf-8'))
    keys = json.loads((TRAINER / 'data/keys/source_keys.json').read_text(encoding='utf-8'))['keys']
    hot = json.loads((TRAINER / 'data/interactions/hotspot.json').read_text(encoding='utf-8'))['questions']
    export = {q['id']: q for q in json.loads((WS / 'output/pdf/question_bank.json').read_text(encoding='utf-8'))['questions']}
    ids = [q['id'] for q in bank['questions']]
    if ids != [f'Q{i:03d}' for i in range(1, 144)] or sorted(src) != ids:
        issues.append('question id set/order mismatch')
    types = Counter(q['type'] for q in bank['questions'])
    if types != Counter({'multiple_choice': 112, 'multiple_response': 24, 'ordering': 3, 'matching': 4}):
        issues.append(f'type counts {dict(types)}')
    nchoices = sum(len(q['choices']) for q in bank['questions'])
    if nchoices != 572: issues.append(f'choices {nchoices}')

    def compare(qid, role, blocks, expected):
        if len(blocks) != len(expected):
            issues.append(f'{qid} {role}: block count {len(blocks)} vs HTML {len(expected)}'); return
        for b, (t, v) in zip(blocks, expected):
            if b['type'] != t:
                issues.append(f'{qid} {role} {b["id"]}: type'); continue
            if t == 'text':
                checked['text_blocks'] += 1
                if collapse(b['text']) != v: issues.append(f'{qid} {b["id"]}: text differs from HTML')
            else:
                checked['image_blocks'] += 1
                data = (TRAINER / 'data/original' / b['file']).read_bytes()
                if sha(data) != v or b['sha256'] != v: issues.append(f'{qid} {b["id"]}: image bytes differ from HTML')
                if bank['images'][b['file']]['question_id'] != qid: issues.append(f'{qid} {b["file"]}: image assigned to wrong question')
    answer_imgs = 0
    for q in bank['questions']:
        qid, s = q['id'], src[q['id']]
        compare(qid, 'stem', q['stem'], s['stem'])
        if [c['letter'] for c in q['choices']] != [l for l, _ in s['choices']]:
            issues.append(f'{qid}: choice letters/order differ')
        for c, (_, exp) in zip(q['choices'], s['choices']):
            compare(qid, 'choice ' + c['letter'], c['blocks'], exp)
            checked['choices'] += 1
        k = keys[qid]
        if q['type'] in ('multiple_choice', 'multiple_response'):
            letters = ''.join(v for t, v in s['answer'] if t == 'text')
            if sorted(k['choice_ids']) != sorted(f'{qid}:{l}' for l in letters): issues.append(f'{qid}: source key differs from HTML answer')
            checked['text_keys'] += 1
        else:
            imgs = [v for t, v in s['answer'] if t == 'image']
            if len(imgs) != 1 or sha((TRAINER / 'data/original' / k['answer_image']).read_bytes()) != imgs[0]:
                issues.append(f'{qid}: answer image mismatch')
            answer_imgs += 1
            h = hot[qid]
            trans = export[qid]['answer_image_transcription']
            if h['kind'] == 'ordering':
                txt = {st['id']: st['text'] for st in h['steps']}
                got = [f'Step {i}: {txt[sid]}' for i, sid in enumerate(k['sequence'], 1)]
                if got != trans: issues.append(f'{qid}: ordering key != transcription')
            else:
                rt = {r['id']: r['text'] for r in h['responses']}
                for line, p in zip(trans, h['prompts']):
                    rhs = line.split(' -> ')[1]
                    if rhs.rstrip('.') != rt[k['pairs'][p['id']]].rstrip('.'): issues.append(f'{qid} {p["id"]}: matching key != transcription')
            checked['hotspot_keys'] += 1
    if len(bank['images']) != 35 or answer_imgs != 7: issues.append('image totals')
    blind = (TRAINER / 'research/blind_set/questions.json').read_text(encoding='utf-8')
    for ai in [v['sha256'] for v in bank['images'].values() if v['role'] == 'answer']:
        if ai in blind: issues.append('answer image hash found in blind set')
    for f in (TRAINER / 'research/blind_set/images').iterdir():
        if bank['images']['images/' + f.name]['role'] == 'answer': issues.append(f'answer image in blind set: {f.name}')
    res = {'checked_at_utc': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'status': 'PASS' if not issues else 'FAIL',
           'questions': len(ids), 'types': dict(types), 'choices': nchoices, 'checked': dict(checked),
           'images_total': len(bank['images']), 'answer_images': answer_imgs,
           'whitespace_rule': 'text compared after collapsing runs of whitespace to one space and trimming; all other characters must match',
           'issues': issues}
    (TRAINER / 'reports').mkdir(exist_ok=True)
    (TRAINER / 'reports/data_integrity.json').write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps({k: v for k, v in res.items() if k != 'issues'}, indent=2), '\nissues:', len(issues))
    for i in issues[:30]: print(' -', i)
    sys.exit(1 if issues else 0)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
