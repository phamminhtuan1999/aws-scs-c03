from pathlib import Path
import base64, re, json
from lxml import html

ROOT = Path(__file__).resolve().parents[3]
out = []
for p in ROOT.glob('*.html'):
    raw = p.read_text(encoding='utf-8')
    payload = re.search(r'var\s+b2\s*=\s*"([^"]+)"', raw)[1]
    key = re.search(r'var\s+key\s*=\s*"([^"]+)"', raw)[1].encode()
    first = base64.b64decode(payload)
    decoded = base64.b64decode(bytes(v ^ key[i % len(key)] for i, v in enumerate(first))).decode('utf-8')
    doc = html.fromstring(decoded)
    links = doc.xpath('//a[contains(@href,"discussions")]')
    print(p.name, 'discussion hyperlinks', len(links))
    print([(a.get('href'), ''.join(a.itertext()).strip()[:80]) for a in links[:5]])
    for a in links:
        out.append({'href': a.get('href'), 'text': ''.join(a.itertext()).strip()})
Path(__file__).with_name('source_discussion_links.json').write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
