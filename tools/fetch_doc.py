"""Fetch an AWS documentation page, keep a local text snapshot as research evidence.

Usage:
  python tools/fetch_doc.py URL                 # fetch (or reuse cached snapshot), print id + title + text
  python tools/fetch_doc.py URL --refresh       # force re-fetch
  python tools/fetch_doc.py URL --grep "regex"  # print only matching lines (+-2 lines context) after fetching
  python tools/fetch_doc.py --find SNAPSHOT_ID "quote"   # check a quote exists in a snapshot (whitespace-insensitive)

Snapshots: research/sources/snapshots/<id>.txt + <id>.meta.json ; `--rebuild-index` writes research/sources/index.json
id = first 12 hex of sha256(final_url). page_last_updated is recorded ONLY if the page states it.
Evidence snapshots are private research records; quote only short excerpts in reviews.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, re, sys, urllib.request, urllib.error
from lxml import html as LH

TRAINER = Path(__file__).resolve().parents[1]
SRC = TRAINER / 'research' / 'sources'
SNAP = SRC / 'snapshots'
INDEX = SRC / 'index.json'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) scs-c03-trainer-research/1.0'
BLOCK = {'p', 'div', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'table', 'section', 'dt', 'dd', 'br', 'td', 'th', 'blockquote'}


def load_index():
    """Index is derived from per-snapshot meta files (safe with parallel writers)."""
    return {m.name[:-10]: json.loads(m.read_text(encoding='utf-8')) for m in SNAP.glob('*.meta.json')} if SNAP.exists() else {}


def rebuild_index():
    INDEX.write_text(json.dumps(load_index(), indent=2, ensure_ascii=False, sort_keys=True), encoding='utf-8')


def squash(s):
    return re.sub(r'\s+', ' ', s).strip().lower()


def extract(doc):
    for bad in doc.xpath('//script|//style|//noscript|//nav|//header|//footer'):
        bad.drop_tree()
    main = (doc.xpath('//*[@id="main-col-body"]') or doc.xpath('//main') or doc.xpath('//*[@id="main-content"]') or doc.xpath('//body'))
    root = main[0] if main else doc
    lines = []

    def walk(el):
        if not isinstance(el.tag, str):
            return
        tag = el.tag.lower()
        if tag in BLOCK:
            lines.append('\n')
        if tag in ('h1', 'h2', 'h3', 'h4'):
            lines.append('#' * int(tag[1]) + ' ')
        if tag == 'li':
            lines.append('- ')
        if el.text:
            lines.append(el.text)
        for c in el:
            walk(c)
            if c.tail:
                lines.append(c.tail)
        if tag in BLOCK:
            lines.append('\n')
    walk(root)
    text = ''.join(lines)
    text = '\n'.join(re.sub(r'[ \t ]+', ' ', l).strip() for l in text.splitlines())
    text = re.sub(r'^-[ \t]*\n+', '- ', text, flags=re.M)
    return re.sub(r'\n{3,}', '\n\n', text).strip()


def fetch(url, refresh=False):
    idx = load_index()
    for sid, meta in idx.items():
        if url in (meta['url'], meta['final_url']) and not refresh and (SNAP / f'{sid}.txt').exists():
            return sid, meta, (SNAP / f'{sid}.txt').read_text(encoding='utf-8')
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en-US,en'})
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        final = r.geturl()
        ctype = r.headers.get('Content-Type', '')
    if 'pdf' in ctype.lower() or raw[:5] == b'%PDF-':
        return save_pdf(url, final, raw)
    doc = LH.fromstring(raw)
    title = (doc.xpath('string(//title)') or '').strip()
    updated = None
    for xp in ('//meta[@name="date"]/@content', '//meta[@property="article:modified_time"]/@content',
               '//meta[@name="last-modified"]/@content'):
        v = doc.xpath(xp)
        if v:
            updated = v[0].strip()
            break
    text = extract(doc)
    if not updated:
        m = re.search(r'(Last updated|Page updated|Updated)\s*:?\s*([A-Z][a-z]+ \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2})', text)
        if m:
            updated = m.group(2)
    sid = hashlib.sha256(final.encode()).hexdigest()[:12]
    SNAP.mkdir(parents=True, exist_ok=True)
    (SNAP / f'{sid}.txt').write_text(f'URL: {final}\nTITLE: {title}\n\n{text}\n', encoding='utf-8')
    meta = {'url': url, 'final_url': final, 'title': title, 'fetched_at_utc': datetime.now(timezone.utc).isoformat(),
            'page_last_updated': updated, 'sha256': hashlib.sha256(text.encode()).hexdigest(), 'chars': len(text),
            'read_via': 'tools/fetch_doc.py'}
    (SNAP / f'{sid}.meta.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
    return sid, meta, (SNAP / f'{sid}.txt').read_text(encoding='utf-8')


def save_pdf(url, final, raw):
    from io import BytesIO
    from pypdf import PdfReader
    reader = PdfReader(BytesIO(raw))
    pages = [(pg.extract_text() or '') for pg in reader.pages]
    text = '

'.join(f'[page {i}]
{t}' for i, t in enumerate(pages, 1))
    title = (reader.metadata.title if reader.metadata and reader.metadata.title else final.rsplit('/', 1)[-1])
    sid = hashlib.sha256(final.encode()).hexdigest()[:12]
    SNAP.mkdir(parents=True, exist_ok=True)
    (SNAP / f'{sid}.txt').write_text(f'URL: {final}
TITLE: {title}

{text}
', encoding='utf-8')
    meta = {'url': url, 'final_url': final, 'title': title, 'fetched_at_utc': datetime.now(timezone.utc).isoformat(),
            'page_last_updated': None, 'sha256': hashlib.sha256(text.encode()).hexdigest(), 'chars': len(text),
            'read_via': 'tools/fetch_doc.py (pdf)', 'pages': len(pages)}
    (SNAP / f'{sid}.meta.json').write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8')
    return sid, meta, (SNAP / f'{sid}.txt').read_text(encoding='utf-8')


def find(sid, quote):
    t = (SNAP / f'{sid}.txt').read_text(encoding='utf-8')
    return squash(quote) in squash(t)


def main():
    args = sys.argv[1:]
    sys.stdout.reconfigure(encoding='utf-8')
    if not args:
        print(__doc__); return
    if args[0] == '--rebuild-index':
        rebuild_index(); print('index rebuilt'); return
    if args[0] == '--find':
        ok = find(args[1], args[2])
        print('FOUND' if ok else 'NOT FOUND'); sys.exit(0 if ok else 1)
    url = args[0]
    try:
        sid, meta, text = fetch(url, refresh='--refresh' in args)
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code} for {url}'); sys.exit(2)
    except Exception as e:  # noqa
        print(f'FETCH FAILED {url}: {e}'); sys.exit(2)
    print(f'SNAPSHOT_ID: {sid}\nTITLE: {meta["title"]}\nFINAL_URL: {meta["final_url"]}\nPAGE_LAST_UPDATED: {meta["page_last_updated"]}\nCHARS: {meta["chars"]}\n')
    if '--grep' in args:
        pat = re.compile(args[args.index('--grep') + 1], re.I)
        lines = text.splitlines()
        hits = [i for i, l in enumerate(lines) if pat.search(l)]
        shown = set()
        for i in hits:
            for j in range(max(0, i - 2), min(len(lines), i + 3)):
                if j not in shown:
                    print(f'{j}: {lines[j]}'); shown.add(j)
            print('--')
    else:
        print(text)


if __name__ == '__main__':
    main()
