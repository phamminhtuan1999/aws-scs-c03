"""Record write times of all research records (evidence that each blind record predates its final record)."""
from pathlib import Path
from datetime import datetime, timezone
import json, os
R = Path(__file__).resolve().parents[1] / 'research'
out = R / 'mtime_snapshots.jsonl'
snap = {p.relative_to(R).as_posix(): datetime.fromtimestamp(os.path.getmtime(p), timezone.utc).isoformat(timespec='seconds')
        for d in ('blind', 'reviews') for p in sorted((R / d).glob('Q*.json'))}
with open(out, 'a', encoding='utf-8') as fh:
    fh.write(json.dumps({'taken_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'mtimes': snap}) + '\n')
print(len(snap), 'records snapshotted')
