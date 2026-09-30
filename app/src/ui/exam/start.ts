import type { AppData } from '../../data/loader';
import type { Basis } from '../../grading/engine';
import { createExamSession } from '../../session/exam';
import { planExam } from '../../session/plan';
import type { ExamSession } from '../../session/types';
import { saveSession, setActiveSessionId } from '../../storage/slots';
import { getClock } from '../../time/clock';
import { APP_VERSION } from '../../version';

export interface StartOptions {
  kind: ExamSession['kind'];
  basis: Basis;
  count: number;
  minutes: number;
  seed: string;
  includeUngradable: boolean;
  allowPause: boolean;
}

export function newSessionId(now: number): string {
  return `exam-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Draw the questions, snapshot keys + basis + research version, persist and mark the session active. */
export function startExam(data: AppData, o: StartOptions): ExamSession {
  const now = getClock().now();
  const plan = planExam(data.allIds, data, o);
  if (plan.ids.length === 0) throw new Error('No questions available for this configuration.');
  const s = createExamSession({
    id: newSessionId(now),
    kind: o.kind,
    seed: o.seed,
    basis: o.basis,
    research_version: data.research_version,
    question_ids: plan.ids,
    keys: plan.keys,
    include_ungradable: o.includeUngradable,
    duration_ms: Math.round(o.minutes * 60_000),
    allow_pause: o.allowPause,
    now,
    app_version: APP_VERSION,
  });
  saveSession(s);
  setActiveSessionId(s.id);
  return s;
}
