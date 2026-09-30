/**
 * Pure grading engine. No React, no storage, no clock.
 *
 * All grading is all-or-nothing:
 *  - multiple_choice / multiple_response: the exact set of choice IDs (order-insensitive)
 *  - ordering: the exact sequence of step IDs for every slot
 *  - matching: every prompt mapped to the exact response
 * An empty response to a gradable question is incorrect (reported as "unanswered_incorrect").
 * A question without a key is "ungradable" and never counts in any denominator.
 */
import type { AnswerValue, QType, Review, SourceKey } from '../data/schema';

export type GradeResult = 'correct' | 'incorrect' | 'unanswered_incorrect' | 'ungradable';
export type Basis = 'research' | 'source';

/** Normalised key. MC/MR: sorted choice IDs. ordering: step IDs in slot order. matching: promptId -> responseId. */
export type Key =
  | { type: 'multiple_choice' | 'multiple_response'; answer: string[] }
  | { type: 'ordering'; answer: string[] }
  | { type: 'matching'; answer: Record<string, string> };

/**
 * A user's response.
 *  - multiple_choice: choice ID or null
 *  - multiple_response: array of choice IDs
 *  - ordering: one entry per slot (step ID or null for an empty slot)
 *  - matching: promptId -> responseId | null
 */
export type Response = string | null | undefined | (string | null)[] | Record<string, string | null>;

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function responseSet(r: Response): string[] {
  if (r == null) return [];
  if (typeof r === 'string') return r ? [r] : [];
  if (Array.isArray(r)) return [...new Set(r.filter(isStr))];
  return [];
}

export function isEmptyResponse(type: QType, r: Response): boolean {
  switch (type) {
    case 'multiple_choice':
    case 'multiple_response':
      return responseSet(r).length === 0;
    case 'ordering':
      return !Array.isArray(r) || r.every((x) => !isStr(x));
    case 'matching':
      return r == null || typeof r !== 'object' || Array.isArray(r) || Object.values(r).every((x) => !isStr(x));
  }
}

export function gradeQuestion(type: QType, response: Response, key: Key | null | undefined): GradeResult {
  if (!key || key.type !== type) return 'ungradable';
  if (isEmptyResponse(type, response)) return 'unanswered_incorrect';
  switch (type) {
    case 'multiple_choice':
    case 'multiple_response': {
      const want = [...new Set(key.answer as string[])].sort();
      const got = responseSet(response).sort();
      const ok = want.length === got.length && want.every((v, i) => v === got[i]);
      return ok ? 'correct' : 'incorrect';
    }
    case 'ordering': {
      const want = key.answer as string[];
      const got = response as (string | null)[];
      if (!Array.isArray(got) || got.length !== want.length) return 'incorrect';
      return want.every((v, i) => got[i] === v) ? 'correct' : 'incorrect';
    }
    case 'matching': {
      const want = key.answer as Record<string, string>;
      const got = (response ?? {}) as Record<string, string | null>;
      const prompts = Object.keys(want);
      if (!prompts.every((p) => got[p] === want[p])) return 'incorrect';
      // extra, unknown prompt rows with a value can never be part of a correct response
      const extra = Object.keys(got).some((p) => !(p in want) && isStr(got[p]));
      return extra ? 'incorrect' : 'correct';
    }
  }
}

export const isCorrect = (r: GradeResult) => r === 'correct';
export const isScored = (r: GradeResult) => r !== 'ungradable';

// ---- key selection (basis) -------------------------------------------------------------------

/** Minimal structural view of the data needed to pick a key; real AppData and test fixtures both satisfy it. */
export interface KeyData {
  keys: Record<string, Pick<SourceKey, 'type' | 'gradable' | 'choice_ids' | 'sequence' | 'pairs'>>;
  reviews: Record<string, Pick<Review, 'gradable_by_research' | 'researched_answer'>>;
}

function keyFromAnswer(type: QType, a: AnswerValue | undefined): Key | null {
  if (a == null) return null;
  if (type === 'multiple_choice' || type === 'multiple_response') {
    if (!Array.isArray(a) || a.length === 0 || !a.every(isStr)) return null;
    const sorted = [...new Set(a)].sort();
    if (type === 'multiple_choice' && sorted.length !== 1) return null;
    return { type, answer: sorted };
  }
  if (type === 'ordering') {
    if (!Array.isArray(a) || a.length === 0 || !a.every(isStr)) return null;
    return { type, answer: [...a] };
  }
  if (Array.isArray(a) || typeof a !== 'object') return null;
  const entries = Object.entries(a);
  if (entries.length === 0 || !entries.every(([k, v]) => isStr(k) && isStr(v))) return null;
  return { type: 'matching', answer: { ...a } };
}

/** The source key as a Key. Returns null for an ungradable source key unless `forDisplay` is set (study display only, never scoring). */
export function sourceKeyOf(sk: KeyData['keys'][string] | undefined, forDisplay = false): Key | null {
  if (!sk || (!sk.gradable && !forDisplay)) return null;
  const a: AnswerValue | undefined =
    sk.type === 'ordering' ? sk.sequence : sk.type === 'matching' ? sk.pairs : sk.choice_ids;
  return keyFromAnswer(sk.type, a ?? null);
}

/**
 * The key used to score `qid` under `basis`, or null when the question is not scorable there.
 *  - "source": the immutable source key, iff `gradable`.
 *  - "research": `researched_answer` iff `gradable_by_research`.
 * A question whose source key is marked ungradable (Q008) is never scored in either basis.
 */
export function keyFor(basis: Basis, qid: string, data: KeyData): Key | null {
  const sk = data.keys[qid];
  if (!sk) return null;
  if (!sk.gradable) return null;
  if (basis === 'source') return sourceKeyOf(sk);
  const rv = data.reviews[qid];
  if (!rv || !rv.gradable_by_research) return null;
  return keyFromAnswer(sk.type, rv.researched_answer);
}

/** Research key regardless of the source key's gradability, for display only (never for scoring). */
export function researchKeyForDisplay(qid: string, data: KeyData): Key | null {
  const sk = data.keys[qid];
  const rv = data.reviews[qid];
  if (!sk || !rv || !rv.researched_answer) return null;
  return keyFromAnswer(sk.type, rv.researched_answer);
}

export function eligibleIds(basis: Basis, ids: string[], data: KeyData): string[] {
  return ids.filter((id) => keyFor(basis, id, data) !== null);
}

// ---- scoring ---------------------------------------------------------------------------------

export interface ScoreSummary {
  correct: number;
  scored: number;
  percent: number | null;
  incorrect: string[];
  unanswered: string[];
  ungradable: string[];
  perQuestion: Record<string, GradeResult>;
}

export function scoreQuestions(
  ids: string[],
  types: Record<string, QType>,
  responses: Record<string, Response>,
  keys: Record<string, Key | null>,
): ScoreSummary {
  const perQuestion: Record<string, GradeResult> = {};
  let correct = 0;
  let scored = 0;
  const incorrect: string[] = [];
  const unanswered: string[] = [];
  const ungradable: string[] = [];
  for (const id of ids) {
    const g = gradeQuestion(types[id], responses[id], keys[id] ?? null);
    perQuestion[id] = g;
    if (g === 'ungradable') {
      ungradable.push(id);
      continue;
    }
    scored += 1;
    if (g === 'correct') correct += 1;
    else {
      incorrect.push(id);
      if (g === 'unanswered_incorrect') unanswered.push(id);
    }
  }
  return { correct, scored, percent: scored > 0 ? (correct / scored) * 100 : null, incorrect, unanswered, ungradable, perQuestion };
}
