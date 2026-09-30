/**
 * Exam session state machine (pure: every function takes `now`, none touches storage or React).
 *
 * in_progress --submit(user|timeout|expired_on_load)--> submitted   (exactly once; later calls are no-ops)
 */
import { gradeQuestion, isEmptyResponse, type GradeResult, type Key, type Response } from '../grading/engine';
import type { ExamResult, ExamSession } from './types';

export interface CreateExamParams {
  id: string;
  kind: ExamSession['kind'];
  seed: string;
  basis: ExamSession['basis'];
  research_version: string;
  question_ids: string[];
  keys: Record<string, Key | null>;
  include_ungradable: boolean;
  duration_ms: number;
  allow_pause: boolean;
  now: number;
  app_version: string;
}

export function createExamSession(p: CreateExamParams): ExamSession {
  const keys: Record<string, Key | null> = {};
  for (const id of p.question_ids) keys[id] = p.keys[id] ? structuredCloneKey(p.keys[id]) : null; // snapshot (deep copy)
  return {
    id: p.id,
    status: 'in_progress',
    kind: p.kind,
    seed: p.seed,
    basis: p.basis,
    research_version: p.research_version,
    question_ids: [...p.question_ids],
    keys,
    ungradable_ids: p.question_ids.filter((id) => keys[id] === null),
    include_ungradable: p.include_ungradable,
    duration_ms: p.duration_ms,
    allow_pause: p.allow_pause,
    started_at: p.now,
    deadline: p.now + p.duration_ms,
    paused_at: null,
    paused_total_ms: 0,
    current_index: 0,
    responses: {},
    flags: [],
    submitted_at: null,
    submit_reason: null,
    result: null,
    app_version: p.app_version,
    updated_at: p.now,
  };
}

function structuredCloneKey(k: Key): Key {
  return JSON.parse(JSON.stringify(k)) as Key;
}

/** Milliseconds left. Frozen while paused; 0 once submitted. */
export function remainingMs(s: ExamSession, now: number): number {
  if (s.status === 'submitted') return 0;
  const ref = s.paused_at ?? now;
  return Math.max(0, s.deadline - ref);
}

export function isExpired(s: ExamSession, now: number): boolean {
  return s.status === 'in_progress' && s.paused_at === null && now >= s.deadline;
}

const touch = (s: ExamSession, now: number): ExamSession => ({ ...s, updated_at: now });
const editable = (s: ExamSession, now: number) => s.status === 'in_progress' && s.paused_at === null && !isExpired(s, now);

export function setResponse(s: ExamSession, qid: string, resp: Response, now: number): ExamSession {
  if (!editable(s, now) || !s.question_ids.includes(qid)) return s;
  const responses = { ...s.responses };
  const key = s.keys[qid];
  // an "empty" response is stored as absence, so it can never be confused with an answer
  if (isEmptyResponse(key?.type ?? guessType(resp), resp)) delete responses[qid];
  else responses[qid] = resp as ExamSession['responses'][string];
  return touch({ ...s, responses }, now);
}

function guessType(r: Response): Key['type'] {
  if (r === null || r === undefined || typeof r === 'string') return 'multiple_choice';
  if (Array.isArray(r)) return 'multiple_response';
  return 'matching';
}

export function toggleFlag(s: ExamSession, qid: string, now: number): ExamSession {
  if (!editable(s, now) || !s.question_ids.includes(qid)) return s;
  const flags = s.flags.includes(qid) ? s.flags.filter((x) => x !== qid) : [...s.flags, qid];
  return touch({ ...s, flags }, now);
}

export function goTo(s: ExamSession, index: number, now: number): ExamSession {
  if (s.status !== 'in_progress') return s;
  const i = Math.max(0, Math.min(s.question_ids.length - 1, Math.floor(index)));
  if (i === s.current_index) return s;
  return touch({ ...s, current_index: i }, now);
}

export function pause(s: ExamSession, now: number): ExamSession {
  if (!s.allow_pause || s.status !== 'in_progress' || s.paused_at !== null || isExpired(s, now)) return s;
  return touch({ ...s, paused_at: now }, now);
}

export function resume(s: ExamSession, now: number): ExamSession {
  if (s.status !== 'in_progress' || s.paused_at === null) return s;
  const gap = Math.max(0, now - s.paused_at);
  return touch({ ...s, paused_at: null, paused_total_ms: s.paused_total_ms + gap, deadline: s.deadline + gap }, now);
}

export function gradeSession(s: Pick<ExamSession, 'question_ids' | 'keys' | 'responses'>, timeUsedMs: number): ExamResult {
  const per_question: Record<string, GradeResult> = {};
  let correct = 0;
  let scored = 0;
  for (const id of s.question_ids) {
    const key = s.keys[id] ?? null;
    const g = gradeQuestion(key?.type ?? 'multiple_choice', s.responses[id], key as Key | null);
    per_question[id] = g;
    if (g !== 'ungradable') {
      scored += 1;
      if (g === 'correct') correct += 1;
    }
  }
  return { correct, scored, percent: scored > 0 ? (correct / scored) * 100 : null, per_question, time_used_ms: timeUsedMs };
}

/**
 * Idempotent: only the first call on an in_progress session changes anything.
 * A second submit (double click, second tab, timer + click race) returns the very same object.
 */
export function submitSession(s: ExamSession, now: number, reason: NonNullable<ExamSession['submit_reason']>): ExamSession {
  if (s.status === 'submitted') return s;
  const endedAt = reason === 'user' ? (s.paused_at ?? now) : Math.min(now, s.deadline);
  const effectiveEnd = reason === 'user' ? endedAt : s.deadline;
  const used = Math.max(0, Math.min(s.duration_ms, effectiveEnd - s.started_at - s.paused_total_ms));
  return {
    ...s,
    status: 'submitted',
    submit_reason: reason,
    submitted_at: effectiveEnd,
    paused_at: null,
    result: gradeSession(s, used),
    updated_at: now,
  };
}

/**
 * If the deadline has passed, grade once and lock. `reason` is "timeout" for a live session,
 * "expired_on_load" when discovered after the app was closed.
 */
export function expireIfDue(s: ExamSession, now: number, reason: 'timeout' | 'expired_on_load'): ExamSession {
  return isExpired(s, now) ? submitSession(s, now, reason) : s;
}

// ---- answer-state helpers (UI + review) ------------------------------------------------------

export type AnswerState = 'unanswered' | 'incomplete' | 'answered';

/** `expected` = slots (ordering) or prompt count (matching); ignored for choice types. */
export function answerState(type: Key['type'], resp: Response, expected?: number): AnswerState {
  if (isEmptyResponse(type, resp)) return 'unanswered';
  if (type === 'ordering' && Array.isArray(resp) && expected !== undefined) {
    return resp.filter((x) => typeof x === 'string' && x).length >= expected ? 'answered' : 'incomplete';
  }
  if (type === 'matching' && resp && typeof resp === 'object' && !Array.isArray(resp) && expected !== undefined) {
    const n = Object.values(resp).filter((x) => typeof x === 'string' && x).length;
    return n >= expected ? 'answered' : 'incomplete';
  }
  return 'answered';
}
