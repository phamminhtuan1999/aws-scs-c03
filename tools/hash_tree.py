"""SHA256 of the frozen baseline (two source HTML files, root PDFs, everything under output/).

Usage:
  python tools/hash_tree.py before   -> baseline/hashes_before.json
  python tools/hash_tree.py after    -> baseline/hashes_after.json + diff against before (exit 1 on any change)
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, sys

TRAINER = Path(__file__).resolve().parents[1]
WORKSPACE = TRAINER.parent


def targets():
    files = sorted(WORKSPACE.glob('*.html')) + sorted(WORKSPACE.glob('*.pdf'))
    files += sorted(p for p in (WORKSPACE / 'output').rglob('*') if p.is_file())
    return files


def snapshot():
    return {p.relative_to(WORKSPACE).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in targets()}


def main():
    stage = sys.argv[1] if len(sys.argv) > 1 else 'before'
    data = {'taken_at_utc': datetime.now(timezone.utc).isoformat(), 'root': 'workspace (parent of scs-c03-trainer)', 'files': snapshot()}
    out = TRAINER / 'baseline' / f'hashes_{stage}.json'
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'{len(data["files"])} files hashed -> {out.name}')
    if stage == 'after':
        before = json.loads((TRAINER / 'baseline' / 'hashes_before.json').read_text(encoding='utf-8'))['files']
        after = data['files']
        changed = sorted(k for k in before.keys() & after.keys() if before[k] != after[k])
        missing = sorted(before.keys() - after.keys())
        added = sorted(after.keys() - before.keys())
        print(json.dumps({'changed': changed, 'missing': missing, 'added': added}, indent=2))
        if changed or missing or added:
            sys.exit(1)


if __name__ == '__main__':
    main()
