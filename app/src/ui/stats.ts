import type { GradeResult } from '../grading/engine';
import type { ExamSession } from '../session/types';
import type { Attempt } from '../storage/slots';

export interface Activity {
  attempted: boolean;
  lastResult: GradeResult | null;
  lastAt: number;
  lastSource: 'study' | 'practice' | 'exam' | null;
  attempts: number;
}

export const isWrong = (r: GradeResult | null) => r === 'incorrect' || r === 'unanswered_incorrect';

/** Per-question activity from study/practice attempts and finished exams. "Wrong" = the most recent scored result was wrong. */
export function buildActivity(attempts: Record<string, Attempt[]>, sessions: ExamSession[]): Map<string, Activity> {
  const m = new Map<string, Activity>();
  const bump = (qid: string, result: GradeResult, at: number, src: Activity['lastSource']) => {
    const cur = m.get(qid) ?? { attempted: false, lastResult: null, lastAt: -1, lastSource: null, attempts: 0 };
    cur.attempted = true;
    cur.attempts += 1;
    if (result !== 'ungradable' && at >= cur.lastAt) {
      cur.lastAt = at;
      cur.lastResult = result;
      cur.lastSource = src;
    }
    m.set(qid, cur);
  };
  for (const [qid, list] of Object.entries(attempts)) for (const a of list) bump(qid, a.result, a.at, a.source);
  for (const s of sessions) {
    if (s.status !== 'submitted' || !s.result) continue;
    for (const [qid, r] of Object.entries(s.result.per_question)) bump(qid, r, s.submitted_at ?? s.updated_at, 'exam');
  }
  return m;
}
