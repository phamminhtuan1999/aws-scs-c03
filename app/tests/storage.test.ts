import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MemoryBackend, PREFIX, decodeEnvelope, getBackend, readSlot, setBackend, writeSlot, type Slot } from '../src/storage/store';
import { getNotices } from '../src/storage/notices';
import {
  addTip,
  bookmarksSlot,
  loadSession,
  recordAttempt,
  saveSession,
  settingsSlot,
  studySlot,
  tipsSlot,
  toggleBookmark,
} from '../src/storage/slots';
import { applyImport, buildExport, validateImport, MAX_IMPORT_BYTES } from '../src/storage/exportImport';
import { createExamSession, setResponse, submitSession } from '../src/session/exam';
import { loadRealData, allPendingReviews } from './helpers/data';

const data = loadRealData(allPendingReviews());
const known = new Set(data.allIds);

describe('versioned store', () => {
  it('uses the scs-c03-trainer:v1: prefix and an envelope with version', () => {
    writeSlot(settingsSlot, { font_step: 2, high_contrast: true, color_scheme: 'default' });
    const raw = getBackend().getItem(`${PREFIX}settings`)!;
    expect(PREFIX).toBe('scs-c03-trainer:v1:');
    expect(JSON.parse(raw)).toEqual({ version: 1, data: { font_step: 2, high_contrast: true, color_scheme: 'default' } });
    expect(readSlot(settingsSlot).font_step).toBe(2);
  });

  it('returns defaults when nothing is stored', () => {
    expect(readSlot(settingsSlot)).toEqual({ font_step: 0, high_contrast: false, color_scheme: 'default' });
    expect(getNotices()).toHaveLength(0);
  });

  it('corrupt JSON is quarantined, defaults are used and a notice is raised', () => {
    const b = getBackend();
    b.setItem(`${PREFIX}settings`, '{not json');
    const v = readSlot(settingsSlot);
    expect(v.font_step).toBe(0);
    expect(b.getItem(`${PREFIX}settings`)).toBeNull();
    const q = b.keys().filter((k) => k.startsWith(`${PREFIX}corrupt:`));
    expect(q).toHaveLength(1);
    expect(JSON.parse(b.getItem(q[0])!).raw).toBe('{not json');
    expect(getNotices().some((n) => n.kind === 'corrupt')).toBe(true);
  });

  it('schema-invalid data and unknown future versions are quarantined too', () => {
    const b = getBackend();
    b.setItem(`${PREFIX}settings`, JSON.stringify({ version: 1, data: { font_step: 99, high_contrast: 'yes' } }));
    expect(readSlot(settingsSlot).font_step).toBe(0);
    b.setItem(`${PREFIX}bookmarks`, JSON.stringify({ version: 7, data: { bookmarked: [], flagged: [] } }));
    expect(readSlot(bookmarksSlot)).toEqual({ bookmarked: [], flagged: [] });
    expect(b.keys().filter((k) => k.includes('corrupt:')).length).toBe(2);
  });

  it('migrates older versions through the slot migration chain', () => {
    const slot: Slot<{ name: string; count: number }> = {
      name: 'mig',
      version: 3,
      schema: z.object({ name: z.string(), count: z.number() }),
      defaults: () => ({ name: '', count: 0 }),
      migrations: {
        1: (d) => ({ ...(d as object), count: 0 }), // v1 -> v2 adds count
        2: (d) => ({ ...(d as { title: string; count: number }), name: (d as { title: string }).title }), // v2 -> v3 renames title
      },
    };
    const b = getBackend();
    b.setItem(`${PREFIX}mig`, JSON.stringify({ version: 1, data: { title: 'hello' } }));
    expect(readSlot(slot)).toEqual({ name: 'hello', count: 0 });
    // pre-envelope data is version 0
    const d = decodeEnvelope({ ...slot, migrations: { 0: (x) => ({ title: (x as { t: string }).t }), ...slot.migrations } }, JSON.stringify({ t: 'legacy' }));
    expect(d.ok && d.data.name).toBe('legacy');
    // a missing migration step is treated as corrupt
    expect(decodeEnvelope({ ...slot, migrations: {} }, JSON.stringify({ version: 1, data: {} })).ok).toBe(false);
  });

  it('writes are validated; invalid values are refused', () => {
    expect(() => writeSlot(settingsSlot, { font_step: 9, high_contrast: false, color_scheme: 'default' })).toThrow();
  });

  it('a storage backend that throws on write (quota) does not crash; a notice is raised', () => {
    const mem = new MemoryBackend();
    mem.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    setBackend(mem);
    expect(writeSlot(settingsSlot, { font_step: 1, high_contrast: false, color_scheme: 'default' })).toBe(false);
    expect(getNotices().some((n) => n.kind === 'storage')).toBe(true);
  });

  it('bookmarks, tips and attempts helpers persist', () => {
    toggleBookmark('bookmarked', 'Q010');
    toggleBookmark('flagged', 'Q011');
    toggleBookmark('bookmarked', 'Q010');
    expect(readSlot(bookmarksSlot)).toEqual({ bookmarked: [], flagged: ['Q011'] });
    const t = addTip('Q005', 'remember <b>this</b>', 5);
    expect(readSlot(tipsSlot).items[0]).toMatchObject({ qid: 'Q005', text: 'remember <b>this</b>', id: t.id });
    recordAttempt({ qid: 'Q001', at: 1, source: 'study', response: 'Q001:C', result: 'correct', basis: 'source', research_version: 'r1' });
    expect(readSlot(studySlot).attempts.Q001).toHaveLength(1);
  });
});

function finishedSession(id = 'E1') {
  let s = createExamSession({
    id,
    kind: 'custom',
    seed: 'x',
    basis: 'source',
    research_version: 'r1',
    question_ids: ['Q001', 'Q004'],
    keys: { Q001: { type: 'multiple_choice', answer: ['Q001:C'] }, Q004: { type: 'multiple_choice', answer: ['Q004:C'] } },
    include_ungradable: false,
    duration_ms: 600000,
    allow_pause: false,
    now: 1000,
    app_version: 't',
  });
  s = setResponse(s, 'Q001', 'Q001:C', 1100);
  return submitSession(s, 2000, 'user');
}

describe('export / import', () => {
  function seeded() {
    saveSession(finishedSession('E1'));
    toggleBookmark('bookmarked', 'Q020');
    addTip('Q020', 'tip text', 10);
    recordAttempt({ qid: 'Q020', at: 10, source: 'practice', response: 'Q020:A', result: 'incorrect', basis: 'source', research_version: 'r1' });
  }

  it('round trip: export -> wipe -> import (replace) restores the same data', () => {
    seeded();
    const text = JSON.stringify(buildExport(123));
    const before = JSON.parse(text);
    setBackend(new MemoryBackend()); // wipe
    const c = validateImport(text, known);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.summary).toMatchObject({ sessions: 1, attempts: 1, tips: 1, inProgressSkipped: 0 });
    applyImport(c.payload, 'replace');
    const after = JSON.parse(JSON.stringify(buildExport(123)));
    expect(after).toEqual(before);
    expect(loadSession('E1')?.status).toBe('submitted');
  });

  it('merge keeps existing data and adds missing items without duplicating', () => {
    seeded();
    const text = JSON.stringify(buildExport(1));
    const c = validateImport(text, known);
    if (!c.ok) throw new Error(c.error);
    toggleBookmark('bookmarked', 'Q021'); // extra local data
    applyImport(c.payload, 'merge');
    applyImport(c.payload, 'merge'); // twice: still no duplicates
    const now = buildExport(1).data;
    expect(now.sessions).toHaveLength(1);
    expect(now.tips).toHaveLength(1);
    expect(now.study.attempts.Q020).toHaveLength(1);
    expect(now.bookmarks.bookmarked.sort()).toEqual(['Q020', 'Q021']);
  });

  it('in-progress sessions are not imported', () => {
    const s = createExamSession({
      id: 'P1', kind: 'custom', seed: 'x', basis: 'source', research_version: 'r1', question_ids: ['Q001'],
      keys: { Q001: { type: 'multiple_choice', answer: ['Q001:C'] } }, include_ungradable: false, duration_ms: 1000, allow_pause: false, now: 1, app_version: 't',
    });
    saveSession(s);
    const c = validateImport(JSON.stringify(buildExport(1)), known);
    if (!c.ok) throw new Error(c.error);
    expect(c.summary.inProgressSkipped).toBe(1);
    setBackend(new MemoryBackend());
    applyImport(c.payload, 'replace');
    expect(loadSession('P1')).toBeNull();
  });

  const base = () => JSON.parse(JSON.stringify(buildExport(1)));
  const bad = (mutate: (o: any) => void) => {
    const o = base();
    mutate(o);
    return validateImport(JSON.stringify(o), known);
  };

  it('rejects non-JSON, wrong format, wrong/unknown version', () => {
    expect(validateImport('not json', known)).toMatchObject({ ok: false });
    expect(bad((o) => (o.format = 'something-else'))).toMatchObject({ ok: false });
    expect(bad((o) => (o.version = 2))).toMatchObject({ ok: false });
    expect(bad((o) => (o.version = '1'))).toMatchObject({ ok: false });
    expect(validateImport('[]', known)).toMatchObject({ ok: false });
    const r = bad((o) => (o.version = 99));
    expect(r.ok === false && r.error).toMatch(/version/);
  });

  it('rejects unknown question IDs everywhere they can appear', () => {
    seeded();
    expect(bad((o) => (o.data.bookmarks.bookmarked = ['Q999']))).toMatchObject({ ok: false });
    expect(bad((o) => (o.data.tips[0].qid = 'Q500'))).toMatchObject({ ok: false });
    expect(bad((o) => (o.data.study.attempts = { Q777: [] }))).toMatchObject({ ok: false });
    expect(bad((o) => (o.data.sessions[0].question_ids.push('Q888')))).toMatchObject({ ok: false });
    expect(bad((o) => (o.data.practice.position = 'Q144'))).toMatchObject({ ok: false });
  });

  it('rejects oversized files and over-long strings', () => {
    expect(validateImport(' '.repeat(MAX_IMPORT_BYTES + 1), known)).toMatchObject({ ok: false, error: expect.stringMatching(/too large/) });
    seeded();
    const r = bad((o) => (o.data.tips[0].text = 'x'.repeat(10_001)));
    expect(r).toMatchObject({ ok: false });
    expect(bad((o) => (o.data.tips[0].text = 'x'.repeat(10_000)))).toMatchObject({ ok: true });
  });

  it('script/HTML strings are just data: they survive as inert text and cannot alter questions', () => {
    seeded();
    const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
    const o = base();
    o.data.tips[0].text = evil;
    o.data.tips[0].__proto__ = { polluted: true };
    o.data.extra_field = { stem: 'replaced question' }; // unknown top-level data fields are dropped
    o.question_bank = [{ id: 'Q001', stem: 'x' }];
    const c = validateImport(JSON.stringify(o), known);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.payload.data.tips[0].text).toBe(evil);
    expect((c.payload.data as Record<string, unknown>).extra_field).toBeUndefined();
    expect((c.payload as Record<string, unknown>).question_bank).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    applyImport(c.payload, 'replace');
    expect(readSlot(tipsSlot).items[0].text).toBe(evil);
    // the bank the app uses is untouched
    expect(data.byId.get('Q001')!.stem[0]).toMatchObject({ type: 'text' });
  });

  it('rejects an inconsistent session (answers outside the exam)', () => {
    seeded();
    expect(bad((o) => (o.data.sessions[0].responses.Q050 = 'Q050:A'))).toMatchObject({ ok: false });
  });
});
