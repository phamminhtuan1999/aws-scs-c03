"""Create the key-free research set and run leak checks.

Input : data/normalized/bank.json, data/interactions/hotspot.json (question-side fields only)
Output: research/blind_set/questions.json, research/blind_set/images/*, research/blind_set/LEAK_CHECK.json
The blind set never reads data/keys/ or the original answer fields.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, shutil, sys
from PIL import Image

TRAINER = Path(__file__).resolve().parents[1]
DATA = TRAINER / 'data'
OUT = TRAINER / 'research' / 'blind_set'
FORBIDDEN_KEYS = {'answer', 'votes', 'explanation', 'answer_image_transcription', 'answer_transcription_method',
                  'source_note', 'key', 'keys', 'sequence', 'pairs', 'choice_ids', 'answer_image', 'visual_check'}


def sha(b): return hashlib.sha256(b).hexdigest()


def green_pixels(path):
    """Count saturated pure-green pixels (the answer-marking border colour)."""
    with Image.open(path) as im:
        rgb = im.convert('RGB')
        return sum(1 for r, g, b in rgb.getdata() if g >= 180 and r <= 110 and b <= 110)


def main():
    bank = json.loads((DATA / 'normalized' / 'bank.json').read_text(encoding='utf-8'))
    hot = json.loads((DATA / 'interactions' / 'hotspot.json').read_text(encoding='utf-8'))['questions']
    if OUT.exists():
        shutil.rmtree(OUT / 'images', ignore_errors=True)
    (OUT / 'images').mkdir(parents=True, exist_ok=True)

    questions, copied = [], {}
    for q in bank['questions']:
        item = {k: q[k] for k in ('id', 'type', 'choose', 'stem', 'choices', 'content_hash')}
        if q['id'] in hot:
            h = hot[q['id']]
            side = {'kind': h['kind'], 'reuse': h['reuse'], 'rule_source_text': h['rule_source_text']}
            if h['kind'] == 'ordering':
                side.update(slots=h['slots'], steps=h['steps'])
            else:
                side.update(prompts=h['prompts'], responses=h['responses'])
            item['interaction'] = side
        for b in item['stem'] + [x for c in item['choices'] for x in c['blocks']]:
            if b['type'] == 'image':
                assert b['role'] in ('stem', 'choice')
                src = DATA / 'original' / b['file']
                dst = OUT / b['file']
                shutil.copyfile(src, dst)
                copied[b['file']] = b['sha256']
        questions.append(item)

    (OUT / 'questions.json').write_text(json.dumps({
        'purpose': 'Blind research set: question content only. No answer keys, votes, explanations, answer images or transcriptions.',
        'created_at_utc': datetime.now(timezone.utc).isoformat(),
        'questions': questions}, ensure_ascii=False, indent=2), encoding='utf-8')

    # ---------------- leak checks
    text = (OUT / 'questions.json').read_text(encoding='utf-8')
    obj = json.loads(text)
    found_keys = set()

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in FORBIDDEN_KEYS: found_keys.add(k)
                walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(obj)
    answer_hashes = {v['sha256'] for v in bank['images'].values() if v['role'] == 'answer'}
    files = sorted((OUT / 'images').iterdir())
    file_hashes = {f.name: sha(f.read_bytes()) for f in files}
    green = {f.name: green_pixels(f) for f in files}
    reference_green = {Path(k).name: green_pixels(DATA / 'original' / k) for k, v in bank['images'].items() if v['role'] == 'answer'}
    result = {
        'checked_at_utc': datetime.now(timezone.utc).isoformat(),
        'questions': len(questions),
        'forbidden_field_names_found': sorted(found_keys),
        'images_in_blind_set': len(files),
        'answer_image_hash_overlap': sorted(n for n, h in file_hashes.items() if h in answer_hashes),
        'image_hash_mismatch': sorted(n for n, h in file_hashes.items() if copied.get('images/' + n) != h),
        'green_marker_pixels_blind_images': {k: v for k, v in green.items() if v},
        'green_marker_pixels_reference_answer_images': reference_green,
        'visual_check': 'pending',
    }
    result['automated_status'] = 'PASS' if not (found_keys or result['answer_image_hash_overlap'] or result['image_hash_mismatch']
                                                or any(v > 50 for v in green.values())) else 'FAIL'
    (OUT / 'LEAK_CHECK.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))
    if result['automated_status'] != 'PASS':
        sys.exit(1)


if __name__ == '__main__':
    main()
