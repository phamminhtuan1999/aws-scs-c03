import type { AppData } from '../../src/data/loader';
import { keyFor, type Basis, type Key } from '../../src/grading/engine';
import { createExamSession } from '../../src/session/exam';
import type { ExamSession } from '../../src/session/types';
import { saveSession, setActiveSessionId } from '../../src/storage/slots';
import { getClock } from '../../src/time/clock';

/** Persist + activate an exam with a hand-picked question list (keys snapshotted from `data` on `basis`). */
export function makeActiveExam(
  data: AppData,
  ids: string[],
  o: { basis?: Basis; minutes?: number; kind?: ExamSession['kind']; allowPause?: boolean; includeUngradable?: boolean; id?: string; now?: number } = {},
): ExamSession {
  const basis = o.basis ?? 'source';
  const keys: Record<string, Key | null> = {};
  for (const id of ids) keys[id] = keyFor(basis, id, data);
  const s = createExamSession({
    id: o.id ?? 'test-exam',
    kind: o.kind ?? 'custom',
    seed: 'test',
    basis,
    research_version: data.research_version,
    question_ids: ids,
    keys,
    include_ungradable: o.includeUngradable ?? false,
    duration_ms: (o.minutes ?? 30) * 60_000,
    allow_pause: o.allowPause ?? false,
    now: o.now ?? getClock().now(),
    app_version: 'test',
  });
  saveSession(s);
  setActiveSessionId(s.id);
  return s;
}
