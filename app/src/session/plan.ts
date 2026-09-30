import { eligibleIds, keyFor, type Basis, type Key, type KeyData } from '../grading/engine';
import { STANDARD_MINUTES, STANDARD_QUESTIONS } from '../version';
import { drawQuestionIds } from './prng';

export interface PlanOptions {
  basis: Basis;
  count: number;
  seed: string;
  /** include questions that have no key on this basis: shown, never scored, excluded from the denominator */
  includeUngradable: boolean;
}

export interface ExamPlan {
  ids: string[];
  keys: Record<string, Key | null>;
  /** drawn questions that will not be scored */
  unscored: string[];
  poolSize: number;
}

/** Deterministic draw: same seed + same pool => same questions in the same order. Bases are never mixed. */
export function planExam(allIds: string[], data: KeyData, o: PlanOptions): ExamPlan {
  const pool = o.includeUngradable ? allIds : eligibleIds(o.basis, allIds, data);
  const ids = drawQuestionIds(pool, o.count, o.seed);
  const keys: Record<string, Key | null> = {};
  for (const id of ids) keys[id] = keyFor(o.basis, id, data);
  return { ids, keys, unscored: ids.filter((id) => keys[id] === null), poolSize: pool.length };
}

/** Minutes for a shorter practice exam, scaled from the standard 170 minutes / 65 questions (at least 1). */
export function scaledMinutes(n: number): number {
  return Math.max(1, Math.ceil((STANDARD_MINUTES * n) / STANDARD_QUESTIONS));
}
