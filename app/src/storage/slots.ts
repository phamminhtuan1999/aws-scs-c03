import { z } from 'zod';
import { GradeResultSchema, ResponseSchema, SessionSchema, type ExamSession } from '../session/types';
import { listSlotNames, readSlot, removeSlot, writeSlot, type Slot } from './store';

const Qid = z.string().regex(/^Q\d{3}$/);

// ---- settings -----------------------------------------------------------------------------------
export const COLOR_SCHEMES = ['default', 'black-on-white', 'white-on-black', 'black-on-light-yellow'] as const;
export const COLOR_SCHEME_LABELS: Record<(typeof COLOR_SCHEMES)[number], string> = {
  default: 'Default (light)',
  'black-on-white': 'Black on white',
  'white-on-black': 'White on black',
  'black-on-light-yellow': 'Black on light yellow',
};
export const SettingsSchema = z.object({
  font_step: z.number().int().min(0).max(3),
  high_contrast: z.boolean(),
  color_scheme: z.enum(COLOR_SCHEMES).default('default'),
});
export type Settings = z.infer<typeof SettingsSchema>;
export const settingsSlot: Slot<Settings> = {
  name: 'settings',
  version: 1,
  schema: SettingsSchema,
  defaults: () => ({ font_step: 0, high_contrast: false, color_scheme: 'default' }),
};

// ---- practice-in-order position -------------------------------------------------------------------
export const PracticeSchema = z.object({ position: Qid.nullable(), updated_at: z.number().nullable() });
export type PracticeState = z.infer<typeof PracticeSchema>;
export const practiceSlot: Slot<PracticeState> = {
  name: 'practice',
  version: 1,
  schema: PracticeSchema,
  defaults: () => ({ position: null, updated_at: null }),
};

// ---- study attempts + current set --------------------------------------------------------------------
export const AttemptSchema = z.object({
  qid: Qid,
  at: z.number(),
  source: z.enum(['study', 'practice']),
  response: ResponseSchema,
  result: GradeResultSchema,
  /** what the result was graded against: verified research answer, source key (not verified), or nothing (ungradable) */
  basis: z.enum(['research', 'source', 'none']),
  research_version: z.string().max(100),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const StudyCurrentSchema = z.object({
  ids: z.array(Qid).max(143),
  index: z.number().int().min(0),
  label: z.string().max(300),
  seed: z.string().max(200).nullable(),
  order: z.enum(['original', 'shuffled']),
});
export type StudyCurrent = z.infer<typeof StudyCurrentSchema>;

export const StudySchema = z.object({
  attempts: z.record(Qid, z.array(AttemptSchema).max(200)),
  current: StudyCurrentSchema.nullable(),
});
export type StudyState = z.infer<typeof StudySchema>;
export const studySlot: Slot<StudyState> = {
  name: 'study',
  version: 1,
  schema: StudySchema,
  defaults: () => ({ attempts: {}, current: null }),
};

// ---- bookmarks + tips ----------------------------------------------------------------------------------
export const BookmarksSchema = z.object({ bookmarked: z.array(Qid), flagged: z.array(Qid) });
export type BookmarksState = z.infer<typeof BookmarksSchema>;
export const bookmarksSlot: Slot<BookmarksState> = {
  name: 'bookmarks',
  version: 1,
  schema: BookmarksSchema,
  defaults: () => ({ bookmarked: [], flagged: [] }),
};

export const TipSchema = z.object({
  id: z.string().min(1).max(100),
  qid: Qid,
  text: z.string().max(10000),
  created_at: z.number(),
});
export type Tip = z.infer<typeof TipSchema>;
export const TipsSchema = z.object({ items: z.array(TipSchema).max(2000) });
export type TipsState = z.infer<typeof TipsSchema>;
export const tipsSlot: Slot<TipsState> = {
  name: 'tips',
  version: 1,
  schema: TipsSchema,
  defaults: () => ({ items: [] }),
};

// ---- exam sessions ---------------------------------------------------------------------------------------
export const SessionsIndexSchema = z.object({ ids: z.array(z.string().max(100)).max(500) });
export const sessionsIndexSlot: Slot<z.infer<typeof SessionsIndexSchema>> = {
  name: 'sessions-index',
  version: 1,
  schema: SessionsIndexSchema,
  defaults: () => ({ ids: [] }),
};
export const ActiveSchema = z.object({ id: z.string().max(100).nullable() });
export const activeSlot: Slot<z.infer<typeof ActiveSchema>> = {
  name: 'active',
  version: 1,
  schema: ActiveSchema,
  defaults: () => ({ id: null }),
};

export const sessionSlot = (id: string): Slot<ExamSession | null> => ({
  name: `session:${id}`,
  version: 1,
  schema: SessionSchema.nullable(),
  defaults: () => null,
});

export function loadSession(id: string): ExamSession | null {
  return readSlot(sessionSlot(id));
}

/**
 * Persist a session. A submitted session on disk is final: a later write of an in_progress copy
 * (second tab, stale timer) is discarded and the stored submitted session is returned instead.
 */
export function saveSession(s: ExamSession): ExamSession {
  const stored = loadSession(s.id);
  if (stored && stored.status === 'submitted') return stored;
  writeSlot(sessionSlot(s.id), s);
  const idx = readSlot(sessionsIndexSlot);
  if (!idx.ids.includes(s.id)) writeSlot(sessionsIndexSlot, { ids: [...idx.ids, s.id] });
  return s;
}

export function getActiveSessionId(): string | null {
  return readSlot(activeSlot).id;
}
export function setActiveSessionId(id: string | null): void {
  writeSlot(activeSlot, { id });
}

export function listSessions(): ExamSession[] {
  const idx = readSlot(sessionsIndexSlot);
  const out: ExamSession[] = [];
  for (const id of idx.ids) {
    const s = loadSession(id);
    if (s) out.push(s);
  }
  return out;
}

export function deleteSession(id: string): void {
  removeSlot(`session:${id}`);
  const idx = readSlot(sessionsIndexSlot);
  writeSlot(sessionsIndexSlot, { ids: idx.ids.filter((x) => x !== id) });
  if (getActiveSessionId() === id) setActiveSessionId(null);
}

export function sessionSlotNames(): string[] {
  return listSlotNames('session:');
}

// ---- small mutation helpers ---------------------------------------------------------------------------------
export function recordAttempt(a: Attempt): void {
  const s = readSlot(studySlot);
  const list = [...(s.attempts[a.qid] ?? []), a].slice(-200);
  writeSlot(studySlot, { ...s, attempts: { ...s.attempts, [a.qid]: list } });
}

export function toggleBookmark(kind: 'bookmarked' | 'flagged', qid: string): void {
  const b = readSlot(bookmarksSlot);
  const list = b[kind].includes(qid) ? b[kind].filter((x) => x !== qid) : [...b[kind], qid];
  writeSlot(bookmarksSlot, { ...b, [kind]: list });
}

export function addTip(qid: string, text: string, now: number): Tip {
  const t = readSlot(tipsSlot);
  const tip: Tip = { id: `tip-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, qid, text: text.slice(0, 10000), created_at: now };
  writeSlot(tipsSlot, { items: [...t.items, tip] });
  return tip;
}
export function deleteTip(id: string): void {
  const t = readSlot(tipsSlot);
  writeSlot(tipsSlot, { items: t.items.filter((x) => x.id !== id) });
}
