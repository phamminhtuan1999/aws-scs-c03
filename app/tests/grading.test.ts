import { describe, expect, it } from 'vitest';
import {
  eligibleIds,
  gradeQuestion,
  isEmptyResponse,
  keyFor,
  researchKeyForDisplay,
  scoreQuestions,
  sourceKeyOf,
  type Key,
} from '../src/grading/engine';
import { loadRealData, allPendingReviews } from './helpers/data';
import { fixtureReviews } from './helpers/fixtures';

const mc = (a: string): Key => ({ type: 'multiple_choice', answer: [a] });
const mr = (...a: string[]): Key => ({ type: 'multiple_response', answer: [...a].sort() });
const ord = (...a: string[]): Key => ({ type: 'ordering', answer: a });
const mat = (o: Record<string, string>): Key => ({ type: 'matching', answer: o });

describe('gradeQuestion: multiple choice', () => {
  it('correct / incorrect / empty', () => {
    expect(gradeQuestion('multiple_choice', 'Q1:C', mc('Q1:C'))).toBe('correct');
    expect(gradeQuestion('multiple_choice', 'Q1:B', mc('Q1:C'))).toBe('incorrect');
    expect(gradeQuestion('multiple_choice', null, mc('Q1:C'))).toBe('unanswered_incorrect');
    expect(gradeQuestion('multiple_choice', undefined, mc('Q1:C'))).toBe('unanswered_incorrect');
    expect(gradeQuestion('multiple_choice', '', mc('Q1:C'))).toBe('unanswered_incorrect');
  });
  it('a changed answer is graded on the final value only', () => {
    let r: string | null = 'Q1:A';
    r = 'Q1:C';
    expect(gradeQuestion('multiple_choice', r, mc('Q1:C'))).toBe('correct');
  });
  it('a two-choice response to a single-answer question is incorrect', () => {
    expect(gradeQuestion('multiple_choice', ['Q1:C', 'Q1:D'], mc('Q1:C'))).toBe('incorrect');
  });
});

describe('gradeQuestion: multiple response (exact set)', () => {
  const key = mr('Q13:A', 'Q13:E');
  it('exact set in any order is correct', () => {
    expect(gradeQuestion('multiple_response', ['Q13:A', 'Q13:E'], key)).toBe('correct');
    expect(gradeQuestion('multiple_response', ['Q13:E', 'Q13:A'], key)).toBe('correct'); // reversed letters
  });
  it('negative cases', () => {
    expect(gradeQuestion('multiple_response', ['Q13:A'], key)).toBe('incorrect'); // missing
    expect(gradeQuestion('multiple_response', ['Q13:A', 'Q13:E', 'Q13:C'], key)).toBe('incorrect'); // extra choice
    expect(gradeQuestion('multiple_response', ['Q13:A', 'Q13:B'], key)).toBe('incorrect'); // one wrong
    expect(gradeQuestion('multiple_response', ['Q13:B', 'Q13:C'], key)).toBe('incorrect');
    expect(gradeQuestion('multiple_response', [], key)).toBe('unanswered_incorrect');
  });
  it('duplicate entries do not fake a correct answer', () => {
    expect(gradeQuestion('multiple_response', ['Q13:A', 'Q13:A'], key)).toBe('incorrect');
  });
});

describe('gradeQuestion: ordering (exact sequence, all slots)', () => {
  const key = ord('S1', 'S5', 'S3');
  it('correct sequence', () => expect(gradeQuestion('ordering', ['S1', 'S5', 'S3'], key)).toBe('correct'));
  it('right set wrong order is incorrect', () => {
    expect(gradeQuestion('ordering', ['S5', 'S1', 'S3'], key)).toBe('incorrect');
    expect(gradeQuestion('ordering', ['S3', 'S5', 'S1'], key)).toBe('incorrect');
  });
  it('missing step / gap / wrong step is incorrect', () => {
    expect(gradeQuestion('ordering', ['S1', 'S5', null], key)).toBe('incorrect');
    expect(gradeQuestion('ordering', ['S1', 'S5'], key)).toBe('incorrect');
    expect(gradeQuestion('ordering', ['S1', 'S5', 'S4'], key)).toBe('incorrect');
    expect(gradeQuestion('ordering', ['S1', 'S5', 'S3', 'S2'], key)).toBe('incorrect');
  });
  it('empty', () => {
    expect(gradeQuestion('ordering', [null, null, null], key)).toBe('unanswered_incorrect');
    expect(gradeQuestion('ordering', [], key)).toBe('unanswered_incorrect');
    expect(gradeQuestion('ordering', undefined, key)).toBe('unanswered_incorrect');
  });
});

describe('gradeQuestion: matching (all pairs)', () => {
  const key = mat({ P1: 'R2', P2: 'R6', P3: 'R1' });
  it('all pairs correct', () => expect(gradeQuestion('matching', { P1: 'R2', P2: 'R6', P3: 'R1' }, key)).toBe('correct'));
  it('one wrong pair is incorrect (no partial credit)', () => {
    expect(gradeQuestion('matching', { P1: 'R2', P2: 'R6', P3: 'R3' }, key)).toBe('incorrect');
    expect(gradeQuestion('matching', { P1: 'R6', P2: 'R2', P3: 'R1' }, key)).toBe('incorrect');
  });
  it('a missing pair is incorrect, all empty is unanswered', () => {
    expect(gradeQuestion('matching', { P1: 'R2', P2: 'R6', P3: null }, key)).toBe('incorrect');
    expect(gradeQuestion('matching', { P1: 'R2', P2: 'R6' }, key)).toBe('incorrect');
    expect(gradeQuestion('matching', { P1: null, P2: null, P3: null }, key)).toBe('unanswered_incorrect');
    expect(gradeQuestion('matching', {}, key)).toBe('unanswered_incorrect');
  });
  it('an unknown extra row can never be part of a correct answer', () => {
    expect(gradeQuestion('matching', { P1: 'R2', P2: 'R6', P3: 'R1', P9: 'R1' }, key)).toBe('incorrect');
  });
});

describe('ungradable / type mismatch', () => {
  it('no key -> ungradable', () => {
    expect(gradeQuestion('multiple_choice', 'x', null)).toBe('ungradable');
    expect(gradeQuestion('matching', {}, undefined)).toBe('ungradable');
  });
  it('a key of another type never scores', () => {
    expect(gradeQuestion('multiple_choice', 'Q1:A', mr('Q1:A'))).toBe('ungradable');
  });
  it('isEmptyResponse', () => {
    expect(isEmptyResponse('multiple_response', [])).toBe(true);
    expect(isEmptyResponse('ordering', [null, 'S1'])).toBe(false);
    expect(isEmptyResponse('matching', { a: null })).toBe(true);
  });
});

describe('keyFor / basis / ungradable (real source keys, test-only research fixtures)', () => {
  const pending = loadRealData(allPendingReviews());
  const fx = loadRealData(fixtureReviews());

  it('source basis: every key except Q008 is gradable (142 of 143)', () => {
    const ids = eligibleIds('source', pending.allIds, pending);
    expect(ids).toHaveLength(142);
    expect(ids).not.toContain('Q008');
    expect(keyFor('source', 'Q008', pending)).toBeNull();
    expect(keyFor('source', 'Q001', pending)).toEqual({ type: 'multiple_choice', answer: ['Q001:C'] });
    expect(keyFor('source', 'Q013', pending)).toEqual({ type: 'multiple_response', answer: ['Q013:A', 'Q013:E'] });
    expect(keyFor('source', 'Q002', pending)).toEqual({ type: 'ordering', answer: ['Q002:S1', 'Q002:S5', 'Q002:S3'] });
    expect(keyFor('source', 'Q079', pending)?.type).toBe('matching');
  });

  it('research basis with all pending: nothing is eligible and the source key is NOT silently substituted', () => {
    expect(eligibleIds('research', pending.allIds, pending)).toEqual([]);
    expect(keyFor('research', 'Q001', pending)).toBeNull();
  });

  it('research basis uses researched_answer only when gradable_by_research', () => {
    expect(keyFor('research', 'Q001', fx)).toEqual({ type: 'multiple_choice', answer: ['Q001:C'] });
    // differs from source: research picks A, source says B
    expect(keyFor('research', 'Q003', fx)).toEqual({ type: 'multiple_choice', answer: ['Q003:A'] });
    expect(keyFor('source', 'Q003', fx)).toEqual({ type: 'multiple_choice', answer: ['Q003:B'] });
    // disputed / ambiguous -> not gradable by research, but source key still gradable on the source basis
    expect(keyFor('research', 'Q013', fx)).toBeNull();
    expect(keyFor('research', 'Q005', fx)).toBeNull();
    expect(keyFor('source', 'Q013', fx)).not.toBeNull();
    expect(eligibleIds('research', fx.allIds, fx).sort()).toEqual(['Q001', 'Q002', 'Q003', 'Q079']);
  });

  it('displayed research key exists for a disputed question but is never a scoring key', () => {
    expect(researchKeyForDisplay('Q013', fx)).toEqual({ type: 'multiple_response', answer: ['Q013:B', 'Q013:C'] });
    expect(keyFor('research', 'Q013', fx)).toBeNull();
  });

  it('Q008 is never scored in either basis, even if research were verified', () => {
    const data = { keys: pending.keys, reviews: { Q008: { gradable_by_research: true, researched_answer: { 'Q008:P1': 'Q008:R1' } } } };
    expect(keyFor('research', 'Q008', data)).toBeNull();
    expect(keyFor('source', 'Q008', data)).toBeNull();
    expect(sourceKeyOf(pending.keys.Q008)).toBeNull();
  });

  it('malformed researched answers do not produce a key', () => {
    const keys = { Q1: { type: 'multiple_choice' as const, gradable: true, choice_ids: ['Q1:A'] } };
    const bad = (researched_answer: any) => keyFor('research', 'Q1', { keys, reviews: { Q1: { gradable_by_research: true, researched_answer } } });
    expect(bad(null)).toBeNull();
    expect(bad([])).toBeNull();
    expect(bad(['Q1:A', 'Q1:B'])).toBeNull(); // two answers for a single-choice question
    expect(bad({ a: 'b' })).toBeNull();
    expect(bad(['Q1:A'])).not.toBeNull();
  });
});

describe('scoreQuestions', () => {
  it('excludes ungradable questions from the denominator and never counts them as wrong', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const types = { a: 'multiple_choice', b: 'multiple_choice', c: 'multiple_choice', d: 'multiple_choice' } as const;
    const keys = { a: mc('a1'), b: mc('b1'), c: mc('c1'), d: null };
    const s = scoreQuestions(ids, types, { a: 'a1', b: 'bX', d: 'whatever' }, keys);
    expect(s.correct).toBe(1);
    expect(s.scored).toBe(3);
    expect(s.incorrect).toEqual(['b', 'c']);
    expect(s.unanswered).toEqual(['c']);
    expect(s.ungradable).toEqual(['d']);
    expect(s.percent).toBeCloseTo(33.33, 1);
  });
  it('percent is null when nothing is scorable', () => {
    expect(scoreQuestions(['a'], { a: 'multiple_choice' }, {}, { a: null }).percent).toBeNull();
  });
  it('shuffling question order cannot change a mapping (IDs are stable)', () => {
    const types = { a: 'multiple_choice', b: 'multiple_choice', c: 'multiple_choice' } as const;
    const keys = { a: mc('a1'), b: mc('b1'), c: mc('c1') };
    const responses = { a: 'a1', b: 'b1', c: 'cX' };
    const one = scoreQuestions(['a', 'b', 'c'], types, responses, keys);
    const two = scoreQuestions(['c', 'a', 'b'], types, responses, keys);
    expect(two.perQuestion).toEqual(one.perQuestion);
    expect(two.correct).toBe(one.correct);
  });
});
