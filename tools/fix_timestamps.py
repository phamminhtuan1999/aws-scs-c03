"""Correct fabricated (future-dated) timestamps in COMPLETED research records, with an audit trail.

Only timestamp fields are touched; no verdict/answer/evidence content changes.
- blind record: researched_at / independent_verdict.recorded_at later than file mtime+120s -> set to file mtime.
  Adds `timestamp_correction`. Because the blind bytes change, the matching final record (if any) gets its
  copied independent_verdict.recorded_at + blind_record_sha256 updated and a history entry.
- final record: last_reviewed_at later than file mtime+120s -> set to file mtime (+ `timestamp_correction`).
Every change is appended to research/corrections_log.md.

Usage: python tools/fix_timestamps.py Q001 Q002 ...   (only pass IDs whose agents have finished)
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, os, sys

R = Path(__file__).resolve().parents[1] / 'research'
NOW = datetime.now(timezone.utc).isoformat(timespec='seconds')


def mtime(p):
    return datetime.fromtimestamp(os.path.getmtime(p), timezone.utc)


def parse(s):
    t = datetime.fromisoformat(str(s).replace('Z', '+00:00'))
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def iso(t):
    return t.isoformat(timespec='seconds').replace('+00:00', 'Z')


def dump(p, obj):
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding='utf-8')


def main():
    log = []
    for qid in sys.argv[1:]:
        bp, fp = R / 'blind' / f'{qid}.json', R / 'reviews' / f'{qid}.json'
        b = json.loads(bp.read_text(encoding='utf-8'))
        bm = mtime(bp)
        changed = {}
        for key in ('researched_at',):
            if (parse(b[key]) - bm).total_seconds() > 120:
                changed[key] = (b[key], iso(bm)); b[key] = iso(bm)
        iv = b['independent_verdict']
        if (parse(iv['recorded_at']) - bm).total_seconds() > 120:
            changed['independent_verdict.recorded_at'] = (iv['recorded_at'], iso(bm)); iv['recorded_at'] = iso(bm)
        if changed:
            b['timestamp_correction'] = {'corrected_at': NOW, 'by': 'main agent (tools/fix_timestamps.py)',
                                         'reason': 'Original values were estimated by the agent and lay in the future relative to the file write time; replaced by the file modification time (upper bound of the true time). Content unchanged.',
                                         'fields': {k: {'original': o, 'corrected': c} for k, (o, c) in changed.items()},
                                         'file_mtime_before_correction': iso(bm)}
            dump(bp, b)
            log.append(f'| {qid} | blind | {", ".join(f"{k}: {o} → {c}" for k, (o, c) in changed.items())} |')
        if fp.exists():
            f = json.loads(fp.read_text(encoding='utf-8'))
            fm = mtime(fp)
            fchanged = []
            if changed:
                f['independent_verdict'] = b['independent_verdict']
                old_sha = f['blind_record_sha256']
                f['blind_record_sha256'] = hashlib.sha256(bp.read_bytes()).hexdigest()
                fchanged.append(f'blind sha {old_sha[:10]}→{f["blind_record_sha256"][:10]}')
            if (parse(f['last_reviewed_at']) - fm).total_seconds() > 120:
                fchanged.append(f'last_reviewed_at: {f["last_reviewed_at"]} → {iso(fm)}')
                f.setdefault('timestamp_correction', {'corrected_at': NOW, 'by': 'main agent (tools/fix_timestamps.py)', 'fields': {}})
                f['timestamp_correction']['fields']['last_reviewed_at'] = {'original': f['last_reviewed_at'], 'corrected': iso(fm)}
                f['last_reviewed_at'] = iso(fm)
            if fchanged:
                f['history'].append({'version': 'r1', 'date': NOW, 'change': 'Timestamp correction only (fabricated future timestamps replaced by file mtime); ' + '; '.join(fchanged), 'previous_answer': f.get('researched_answer')})
                dump(fp, f)
                log.append(f'| {qid} | final | {"; ".join(fchanged)} |')
    lp = R / 'corrections_log.md'
    if not lp.exists():
        lp.write_text('# Corrections log (non-content corrections to research records)\n\n| Question | Record | Change |\n|---|---|---|\n', encoding='utf-8')
    with open(lp, 'a', encoding='utf-8') as fh:
        fh.write('\n'.join(log) + ('\n' if log else ''))
    print(f'{len(log)} record(s) corrected')


if __name__ == '__main__':
    main()
