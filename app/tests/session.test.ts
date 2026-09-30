import { describe, expect, it } from 'vitest';
import { drawQuestionIds, hashSeed, mulberry32, seededShuffle } from '../src/session/prng';
import {
  answerState,
  createExamSession,
  expireIfDue,
  goTo,
  isExpired,
  pause,
  remainingMs,
  resume,
  setResponse,
  submitSession,
  toggleFlag,
} from '../src/session/exam';
import { keyFor, type Key } from '../src/grading/engine';
import { loadRealData, allPendingReviews } from './helpers/data';
import { fixtureReviews } from './helpers/fixtures';
import { FakeClock, formatDuration } from '../src/time/clock';
import { SessionSchema } from '../src/session/types';
import {
  deleteSession,
  getActiveSessionId,
  listSessions,
  loadSession,
  saveSession,
  setActiveSessionId,
} from '../src/storage/slots';

const MIN = 60_000;
const mc = (a: string): Key => ({ type: 'multiple_choice', answer: [a] });

function mk(now = 1_000_000, over: Partial<Parameters<typeof createExamSession>[0]> = {}) {
  return createExamSession({
    id: 'S1',
    kind: 'custom',
    seed: 'abc',
    basis: 'source',
    research_version: 'r1',
    question_ids: ['Q001', 'Q002', 'Q003'],
    keys: { Q001: mc('Q001:C'), Q002: { type: 'ordering', answer: ['Q002:S1', 'Q002:S5', 'Q002:S3'] }, Q003: null },
    include_ungradable: true,
    duration_ms: 10 * MIN,
    allow_pause: false,
    now,
    app_version: 'test',
    ...over,
  });
}

describe('seeded draw', () => {
  const ids = Array.from({ length: 143 }, (_, i) => `Q${String(i + 1).padStart(3, '0')}`);
  it('is reproducible for the same seed and differs for another seed', () => {
    const a = drawQuestionIds(ids, 65, 'seed-1');
    const b = drawQuestionIds(ids, 65, 'seed-1');
    const c = drawQuestionIds(ids, 65, 'seed-2');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(65);
    expect(new Set(a).size).toBe(65); // 65 different questions
  });
  it('does not depend on the order of the eligible list', () => {
    expect(drawQuestionIds([...ids].reverse(), 20, 'x')).toEqual(drawQuestionIds(ids, 20, 'x'));
  });
  it('clamps N to the pool and is stable across platforms (known value)', () => {
    expect(drawQuestionIds(['Q001', 'Q002'], 65, 's')).toHaveLength(2);
    expect(hashSeed('abc')).toBe(440920331);
    const r = mulberry32(1);
    expect([r(), r()].map((x) => x.toFixed(6))).toEqual(['0.627074', '0.002736']);
  });
  it('shuffle is a permutation', () => {
    expect([...seededShuffle(ids, 'z')].sort()).toEqual(ids);
  });
});

describe('session creation and snapshot', () => {
  it('stores the key snapshot, basis, research version and the ungradable ids', () => {
    const s = mk();
    expect(s.status).toBe('in_progress');
    expect(s.basis).toBe('source');
    expect(s.research_version).toBe('r1');
    expect(s.ungradable_ids).toEqual(['Q003']);
    expect(s.deadline).toBe(s.started_at + 10 * MIN);
    expect(SessionSchema.safeParse(s).success).toBe(true);
  });

  it('later research updates never alter an existing session snapshot', () => {
    const before = loadRealData(allPendingReviews());
    const ids = ['Q001', 'Q003'];
    const keys = Object.fromEntries(ids.map((id) => [id, keyFor('source', id, before)]));
    const s = createExamSession({ ...mkParams(), question_ids: ids, keys });
    const frozen = JSON.stringify(s.keys);
    // research changes: Q003 becomes verified with a DIFFERENT researched answer
    const after = loadRealData(fixtureReviews());
    expect(keyFor('research', 'Q003', after)).toEqual(mc('Q003:A'));
    const graded = submitSession(setResponse(s, 'Q003', 'Q003:B', 1_000_500), 1_000_501, 'user');
    expect(JSON.stringify(graded.keys)).toBe(frozen);
    expect(graded.result?.per_question.Q003).toBe('correct'); // still graded against the source-key snapshot
  });

  it('the snapshot is a deep copy (mutating the input key afterwards has no effect)', () => {
    const key: Key = { type: 'multiple_response', answer: ['A', 'B'] };
    const s = createExamSession({ ...mkParams(), question_ids: ['Q013'], keys: { Q013: key } });
    (key.answer as string[]).push('C');
    expect(s.keys.Q013).toEqual({ type: 'multiple_response', answer: ['A', 'B'] });
  });
});

function mkParams() {
  return {
    id: 'S1',
    kind: 'custom' as const,
    seed: 's',
    basis: 'source' as const,
    research_version: 'r1',
    question_ids: ['Q001'],
    keys: {},
    include_ungradable: false,
    duration_ms: 10 * MIN,
    allow_pause: false,
    now: 1_000_000,
    app_version: 'test',
  };
}

describe('answering', () => {
  it('records, changes and clears answers; empty answers are stored as absence', () => {
    let s = mk();
    s = setResponse(s, 'Q001', 'Q001:A', s.started_at + 1);
    expect(s.responses.Q001).toBe('Q001:A');
    s = setResponse(s, 'Q001', 'Q001:C', s.started_at + 2);
    expect(s.responses.Q001).toBe('Q001:C');
    s = setResponse(s, 'Q001', null, s.started_at + 3);
    expect('Q001' in s.responses).toBe(false);
    s = setResponse(s, 'Q002', [null, null, null], s.started_at + 4);
    expect('Q002' in s.responses).toBe(false);
    s = setResponse(s, 'Q002', ['Q002:S1', null, null], s.started_at + 4);
    expect(s.responses.Q002).toEqual(['Q002:S1', null, null]);
  });
  it('ignores ids that are not in the exam', () => {
    const s = mk();
    expect(setResponse(s, 'Q099', 'x', s.started_at + 1)).toBe(s);
    expect(toggleFlag(s, 'Q099', s.started_at + 1)).toBe(s);
  });
  it('flag toggles on and off; navigation clamps and never grades', () => {
    let s = mk();
    s = toggleFlag(s, 'Q002', s.started_at + 1);
    expect(s.flags).toEqual(['Q002']);
    s = toggleFlag(s, 'Q002', s.started_at + 2);
    expect(s.flags).toEqual([]);
    s = goTo(s, 99, s.started_at + 3);
    expect(s.current_index).toBe(2);
    s = goTo(s, -5, s.started_at + 4);
    expect(s.current_index).toBe(0);
    expect(s.status).toBe('in_progress');
    expect(s.result).toBeNull();
  });
});

describe('submission', () => {
  it('grades all-or-nothing against the snapshot and excludes ungradable from the denominator', () => {
    let s = mk();
    s = setResponse(s, 'Q001', 'Q001:C', s.started_at + 1);
    s = setResponse(s, 'Q002', ['Q002:S1', 'Q002:S3', 'Q002:S5'], s.started_at + 2); // right set, wrong order
    s = setResponse(s, 'Q003', 'Q003:A', s.started_at + 3);
    const done = submitSession(s, s.started_at + 4 * MIN, 'user');
    expect(done.status).toBe('submitted');
    expect(done.result?.correct).toBe(1);
    expect(done.result?.scored).toBe(2);
    expect(done.result?.per_question).toEqual({ Q001: 'correct', Q002: 'incorrect', Q003: 'ungradable' });
    expect(done.result?.time_used_ms).toBe(4 * MIN);
    expect(done.submit_reason).toBe('user');
  });

  it('is idempotent: a second submit (double click / second tab / timer race) changes nothing', () => {
    let s = mk();
    s = setResponse(s, 'Q001', 'Q001:C', s.started_at + 1);
    const a = submitSession(s, s.started_at + MIN, 'user');
    const b = submitSession(a, s.started_at + 5 * MIN, 'timeout');
    const c = submitSession(a, s.started_at + 6 * MIN, 'user');
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(b.submit_reason).toBe('user');
    expect(b.submitted_at).toBe(a.submitted_at);
  });

  it('a submitted session is locked against edits, flags and navigation', () => {
    const s = submitSession(mk(), 1_000_100, 'user');
    expect(setResponse(s, 'Q001', 'Q001:A', 1_000_200)).toBe(s);
    expect(toggleFlag(s, 'Q001', 1_000_200)).toBe(s);
    expect(goTo(s, 1, 1_000_200)).toBe(s);
  });

  it('unanswered gradable questions count as incorrect (and are reported as unanswered)', () => {
    const s = submitSession(mk(), 1_000_100, 'user');
    expect(s.result?.per_question.Q001).toBe('unanswered_incorrect');
    expect(s.result?.correct).toBe(0);
    expect(s.result?.scored).toBe(2);
  });
});

describe('timer / deadline', () => {
  it('remaining = deadline - now, derived from the stored deadline (no drift from a counter)', () => {
    const s = mk(1_000_000);
    expect(remainingMs(s, 1_000_000)).toBe(10 * MIN);
    expect(remainingMs(s, 1_000_000 + 3 * MIN)).toBe(7 * MIN);
    expect(remainingMs(s, 1_000_000 + 99 * MIN)).toBe(0);
  });

  it('times out exactly once and locks; answers after the deadline are rejected', () => {
    const clock = new FakeClock(1_000_000);
    let s = mk(clock.now());
    s = setResponse(s, 'Q001', 'Q001:C', clock.now() + 1);
    clock.advance(10 * MIN);
    expect(isExpired(s, clock.now())).toBe(true);
    expect(setResponse(s, 'Q001', 'Q001:A', clock.now())).toBe(s); // too late
    const a = expireIfDue(s, clock.now(), 'timeout');
    const b = expireIfDue(a, clock.now() + 5000, 'timeout');
    expect(a.status).toBe('submitted');
    expect(a.submit_reason).toBe('timeout');
    expect(a.submitted_at).toBe(s.deadline);
    expect(a.result?.per_question.Q001).toBe('correct'); // answered before the deadline
    expect(a.result?.time_used_ms).toBe(10 * MIN);
    expect(b).toBe(a);
  });

  it('not expired one millisecond before the deadline', () => {
    const s = mk(1_000_000);
    expect(expireIfDue(s, s.deadline - 1, 'timeout')).toBe(s);
  });

  it('an expired session found on load is graded once with reason expired_on_load', () => {
    const s = mk(1_000_000);
    const loaded = expireIfDue(s, 1_000_000 + 3 * 60 * MIN, 'expired_on_load');
    expect(loaded.status).toBe('submitted');
    expect(loaded.submit_reason).toBe('expired_on_load');
    expect(loaded.submitted_at).toBe(s.deadline);
  });

  it('pause (custom only) freezes the clock and extends the deadline on resume', () => {
    const noPause = mk();
    expect(pause(noPause, noPause.started_at + 1)).toBe(noPause);
    let s = mk(1_000_000, { allow_pause: true });
    s = pause(s, 1_000_000 + 2 * MIN);
    expect(remainingMs(s, 1_000_000 + 50 * MIN)).toBe(8 * MIN); // frozen
    expect(isExpired(s, 1_000_000 + 50 * MIN)).toBe(false);
    expect(setResponse(s, 'Q001', 'Q001:A', 1_000_000 + 3 * MIN)).toBe(s); // no answering while paused
    s = resume(s, 1_000_000 + 12 * MIN);
    expect(s.deadline).toBe(1_000_000 + 20 * MIN);
    expect(remainingMs(s, 1_000_000 + 12 * MIN)).toBe(8 * MIN);
  });

  it('formatDuration', () => {
    expect(formatDuration(170 * MIN)).toBe('02:50:00');
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(1)).toBe('00:00:01');
  });
});

describe('persistence (storage layer)', () => {
  it('saves and restores a session; answers, index, flags and deadline survive a reload', () => {
    let s = mk(1_000_000);
    s = setResponse(s, 'Q001', 'Q001:C', 1_000_001);
    s = toggleFlag(s, 'Q002', 1_000_002);
    s = goTo(s, 2, 1_000_003);
    saveSession(s);
    setActiveSessionId(s.id);
    const re = loadSession('S1')!;
    expect(re).toEqual(s);
    expect(getActiveSessionId()).toBe('S1');
    expect(listSessions().map((x) => x.id)).toEqual(['S1']);
    expect(remainingMs(re, 1_000_000 + 4 * MIN)).toBe(6 * MIN); // timer not reset by the "reload"
  });

  it('a submitted session on disk is final: a stale in_progress write from another tab is discarded', () => {
    const s = mk();
    saveSession(s);
    const done = submitSession(s, s.started_at + MIN, 'user');
    saveSession(done);
    const stale = setResponse(s, 'Q001', 'Q001:A', s.started_at + 2);
    const out = saveSession(stale);
    expect(out.status).toBe('submitted');
    expect(loadSession('S1')?.status).toBe('submitted');
    expect(loadSession('S1')?.responses).toEqual({});
  });

  it('delete removes the session, index entry and active pointer', () => {
    const s = mk();
    saveSession(s);
    setActiveSessionId(s.id);
    deleteSession(s.id);
    expect(loadSession('S1')).toBeNull();
    expect(listSessions()).toEqual([]);
    expect(getActiveSessionId()).toBeNull();
  });
});

describe('answerState', () => {
  it('classifies empty / partial / complete', () => {
    expect(answerState('multiple_choice', null)).toBe('unanswered');
    expect(answerState('multiple_response', ['a'])).toBe('answered');
    expect(answerState('ordering', [null, 'S1', null], 3)).toBe('incomplete');
    expect(answerState('ordering', ['S2', 'S1', 'S3'], 3)).toBe('answered');
    expect(answerState('matching', { P1: 'R1', P2: null }, 2)).toBe('incomplete');
    expect(answerState('matching', { P1: 'R1', P2: 'R2' }, 2)).toBe('answered');
  });
});
