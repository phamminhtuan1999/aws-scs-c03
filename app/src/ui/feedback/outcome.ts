import type { AppData } from '../../data/loader';
import type { Review, ReviewStatus } from '../../data/schema';
import {
  gradeQuestion,
  keyFor,
  researchKeyForDisplay,
  sourceKeyOf,
  type GradeResult,
  type Key,
  type Response,
} from '../../grading/engine';
import type { ExamSession } from '../../session/types';
import type { Annotations } from '../question/QuestionView';

/** Everything the feedback panel needs to describe a checked / submitted answer. */
export interface Outcome {
  qid: string;
  mode: 'study' | 'exam';
  status: ReviewStatus;
  review: Review;
  /** the source key for display (present even for an unscorable key such as Q008) */
  sourceKey: Key | null;
  /** the researched answer for display (may exist for non-verified statuses) */
  researchKey: Key | null;
  gradedKey: Key | null;
  gradedBasis: 'research' | 'source' | 'none';
  result: GradeResult;
  matchesSource: boolean | null;
  matchesResearch: boolean | null;
  differs: boolean;
  notScorableReason: string | null;
  /** exam mode: research version the exam was graded with (snapshot) */
  snapshotVersion: string | null;
}

function sameAnswer(a: Key | null, b: Key | null): boolean {
  if (!a || !b || a.type !== b.type) return false;
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}
function normalise(k: Key) {
  if (k.type === 'matching') return Object.fromEntries(Object.entries(k.answer).sort());
  if (k.type === 'ordering') return k.answer;
  return [...k.answer].sort();
}

function common(data: AppData, qid: string, response: Response) {
  const q = data.byId.get(qid)!;
  const review = data.reviews[qid];
  const sk = data.keys[qid];
  const sourceKey = sourceKeyOf(sk, true);
  const researchKey = researchKeyForDisplay(qid, data);
  const against = (k: Key | null) => (k ? gradeQuestion(q.type, response, k) === 'correct' : null);
  return {
    review,
    status: review.status,
    sourceKey,
    researchKey,
    matchesSource: against(sourceKey),
    matchesResearch: against(researchKey),
    differs: !!review.differs_from_source || (!!researchKey && !!sourceKey && !sameAnswer(researchKey, sourceKey)),
    notScorableReason: sk.gradable ? null : (sk.ungradable_reason ?? 'This question cannot be scored.'),
  };
}

/** Study / practice: verified research answer if gradable_by_research, otherwise the source key (clearly not verified). */
export function studyOutcome(data: AppData, qid: string, response: Response): Outcome {
  const q = data.byId.get(qid)!;
  const c = common(data, qid, response);
  const rk = keyFor('research', qid, data);
  const sk = keyFor('source', qid, data);
  const gradedKey = rk ?? sk;
  const gradedBasis = rk ? 'research' : sk ? 'source' : 'none';
  return {
    qid,
    mode: 'study',
    ...c,
    gradedKey,
    gradedBasis,
    result: gradeQuestion(q.type, response, gradedKey),
    snapshotVersion: null,
  };
}

/** Exam review: graded against the session's frozen key snapshot; the stored per-question result is authoritative. */
export function examOutcome(data: AppData, s: ExamSession, qid: string, response: Response): Outcome {
  const c = common(data, qid, response);
  const gradedKey = (s.keys[qid] ?? null) as Key | null;
  return {
    qid,
    mode: 'exam',
    ...c,
    gradedKey,
    gradedBasis: gradedKey ? s.basis : 'none',
    result: s.result?.per_question[qid] ?? 'ungradable',
    snapshotVersion: s.research_version,
  };
}

/** Text badges on choices / slots / rows once an answer has been checked. */
export function annotate(data: AppData, o: Outcome, response: Response): Annotations {
  const q = data.byId.get(o.qid)!;
  const hs = data.hotspot[o.qid];
  const key = o.gradedKey ?? o.sourceKey;
  const keyName = o.gradedBasis === 'research' ? 'Researched answer' : 'Source key (not verified)';
  const out: Annotations = {};
  if (!key) return out;
  const tone = o.gradedBasis === 'research' ? 'good' : 'info';
  if (q.type === 'multiple_choice' || q.type === 'multiple_response') {
    const chosen = new Set(typeof response === 'string' ? [response] : Array.isArray(response) ? (response as string[]) : []);
    const inKey = new Set(key.type === 'matching' ? [] : (key.answer as string[]));
    out.choice = {};
    for (const c of q.choices) {
      const notes: { text: string; tone: 'good' | 'bad' | 'info' }[] = [];
      if (chosen.has(c.id)) notes.push({ text: 'Your choice', tone: 'info' });
      if (inKey.has(c.id)) notes.push({ text: keyName, tone });
      if (o.researchKey && o.researchKey.type !== 'matching' && o.gradedBasis !== 'research' && (o.researchKey.answer as string[]).includes(c.id))
        notes.push({ text: `Research conclusion (${o.status})`, tone: 'info' });
      if (notes.length) out.choice[c.id] = notes;
    }
  } else if (q.type === 'ordering' && hs?.kind === 'ordering' && key.type === 'ordering') {
    out.slot = {};
    const arr = Array.isArray(response) ? (response as (string | null)[]) : [];
    key.answer.forEach((stepId, i) => {
      const step = hs.steps.find((s) => s.id === stepId);
      const ok = arr[i] === stepId;
      out.slot![i] = [{ text: ok ? `Matches ${keyName}` : `${keyName}: ${step?.text ?? stepId}`, tone: ok ? tone : 'info' }];
    });
  } else if (q.type === 'matching' && hs?.kind === 'matching' && key.type === 'matching') {
    out.row = {};
    const rec = (response && typeof response === 'object' && !Array.isArray(response) ? response : {}) as Record<string, string | null>;
    for (const p of hs.prompts) {
      const want = key.answer[p.id];
      const resp = hs.responses.find((r) => r.id === want);
      const ok = rec[p.id] === want;
      out.row[p.id] = [{ text: ok ? `Matches ${keyName}` : `${keyName}: ${resp?.text ?? want}`, tone: ok ? tone : 'info' }];
    }
  }
  return out;
}
