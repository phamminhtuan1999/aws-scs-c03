/**
 * Export / import of learner progress.
 *
 * Import safety: size cap, strict zod validation (wrong format/version rejected), unknown question IDs rejected,
 * any string longer than 10k characters rejected. Imported content can never contain or replace question, key or
 * research data (there is simply no place for it in the schema) and every string is rendered as text by the UI.
 */
import { z } from 'zod';
import { APP_VERSION } from '../version';
import { SessionSchema, type ExamSession } from '../session/types';
import {
  BookmarksSchema,
  PracticeSchema,
  SettingsSchema,
  StudySchema,
  TipSchema,
  bookmarksSlot,
  deleteSession,
  listSessions,
  practiceSlot,
  saveSession,
  sessionSlotNames,
  settingsSlot,
  studySlot,
  tipsSlot,
  activeSlot,
  type Attempt,
} from './slots';
import { readSlot, removeSlot, writeSlot } from './store';

export const EXPORT_FORMAT = 'scs-c03-trainer-progress';
export const EXPORT_VERSION = 1;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_STRING_CHARS = 10_000;

export const ExportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exported_at: z.string().max(100),
  app_version: z.string().max(50),
  data: z.object({
    sessions: z.array(SessionSchema).max(500),
    practice: PracticeSchema,
    study: StudySchema,
    bookmarks: BookmarksSchema,
    tips: z.array(TipSchema).max(2000),
    settings: SettingsSchema,
  }),
});
export type ExportPayload = z.infer<typeof ExportSchema>;

export function buildExport(now: number = Date.now()): ExportPayload {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exported_at: new Date(now).toISOString(),
    app_version: APP_VERSION,
    data: {
      sessions: listSessions(),
      practice: readSlot(practiceSlot),
      study: readSlot(studySlot),
      bookmarks: readSlot(bookmarksSlot),
      tips: readSlot(tipsSlot).items,
      settings: readSlot(settingsSlot),
    },
  };
}

function longString(v: unknown, depth = 0): boolean {
  if (depth > 40) return true; // absurd nesting is rejected too
  if (typeof v === 'string') return v.length > MAX_STRING_CHARS;
  if (Array.isArray(v)) return v.some((x) => longString(x, depth + 1));
  if (v && typeof v === 'object') return Object.entries(v).some(([k, x]) => k.length > MAX_STRING_CHARS || longString(x, depth + 1));
  return false;
}

export function collectQids(p: ExportPayload): string[] {
  const out: string[] = [];
  for (const s of p.data.sessions) {
    out.push(...s.question_ids, ...s.ungradable_ids, ...s.flags, ...Object.keys(s.keys), ...Object.keys(s.responses));
    if (s.result) out.push(...Object.keys(s.result.per_question));
  }
  if (p.data.practice.position) out.push(p.data.practice.position);
  out.push(...Object.keys(p.data.study.attempts));
  if (p.data.study.current) out.push(...p.data.study.current.ids);
  out.push(...p.data.bookmarks.bookmarked, ...p.data.bookmarks.flagged, ...p.data.tips.map((t) => t.qid));
  return out;
}

export type ImportCheck =
  | { ok: true; payload: ExportPayload; summary: ImportSummary }
  | { ok: false; error: string };

export interface ImportSummary {
  exportedAt: string;
  appVersion: string;
  sessions: number;
  inProgressSkipped: number;
  attempts: number;
  bookmarks: number;
  tips: number;
}

export function validateImport(text: string, knownQids: ReadonlySet<string>): ImportCheck {
  const bytes = new TextEncoder().encode(text).length;
  if (bytes > MAX_IMPORT_BYTES) return { ok: false, error: `File is too large (${(bytes / 1048576).toFixed(1)} MB; limit is 5 MB).` };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return { ok: false, error: 'Unexpected file contents.' };
  const head = json as { format?: unknown; version?: unknown };
  if (head.format !== EXPORT_FORMAT) return { ok: false, error: 'This is not a progress file from this app (wrong "format").' };
  if (head.version !== EXPORT_VERSION) return { ok: false, error: `Unsupported progress file version "${String(head.version)}" (expected ${EXPORT_VERSION}).` };
  if (longString(json)) return { ok: false, error: `The file contains a text value longer than ${MAX_STRING_CHARS} characters; import rejected.` };
  const r = ExportSchema.safeParse(json);
  if (!r.success) {
    const i = r.error.issues[0];
    return { ok: false, error: `File failed validation at "${i.path.map(String).join('.')}": ${i.message}` };
  }
  const unknown = [...new Set(collectQids(r.data).filter((q) => !knownQids.has(q)))];
  if (unknown.length) return { ok: false, error: `The file refers to unknown question IDs (${unknown.slice(0, 5).join(', ')}); import rejected.` };
  for (const s of r.data.data.sessions) {
    const inExam = new Set(s.question_ids);
    const stray = [...Object.keys(s.keys), ...Object.keys(s.responses), ...s.flags].filter((q) => !inExam.has(q));
    if (stray.length) return { ok: false, error: `Session ${s.id} is inconsistent (answers for questions outside the exam); import rejected.` };
  }
  const d = r.data.data;
  return {
    ok: true,
    payload: r.data,
    summary: {
      exportedAt: r.data.exported_at,
      appVersion: r.data.app_version,
      sessions: d.sessions.filter((s) => s.status === 'submitted').length,
      inProgressSkipped: d.sessions.filter((s) => s.status !== 'submitted').length,
      attempts: Object.values(d.study.attempts).reduce((n, a) => n + a.length, 0),
      bookmarks: d.bookmarks.bookmarked.length + d.bookmarks.flagged.length,
      tips: d.tips.length,
    },
  };
}

const uniq = <T>(a: T[]): T[] => [...new Set(a)];

/** Apply a validated payload. In-progress sessions are never imported (only finished exams). */
export function applyImport(p: ExportPayload, mode: 'merge' | 'replace'): void {
  const finished: ExamSession[] = p.data.sessions.filter((s) => s.status === 'submitted');
  if (mode === 'replace') {
    for (const name of sessionSlotNames()) deleteSession(name.slice('session:'.length));
    removeSlot('sessions-index');
    writeSlot(activeSlot, { id: null });
    for (const s of finished) saveSession(s);
    writeSlot(practiceSlot, p.data.practice);
    writeSlot(studySlot, p.data.study);
    writeSlot(bookmarksSlot, p.data.bookmarks);
    writeSlot(tipsSlot, { items: p.data.tips });
    writeSlot(settingsSlot, p.data.settings);
    return;
  }
  // merge: existing data wins on conflicts, everything else is added
  const have = new Set(listSessions().map((s) => s.id));
  for (const s of finished) if (!have.has(s.id)) saveSession(s);

  const cur = readSlot(studySlot);
  const attempts: Record<string, Attempt[]> = { ...cur.attempts };
  for (const [qid, list] of Object.entries(p.data.study.attempts)) {
    const seen = new Set((attempts[qid] ?? []).map((a) => `${a.at}|${a.source}`));
    const add = list.filter((a) => !seen.has(`${a.at}|${a.source}`));
    attempts[qid] = [...(attempts[qid] ?? []), ...add].sort((a, b) => a.at - b.at).slice(-200);
  }
  writeSlot(studySlot, { attempts, current: cur.current ?? p.data.study.current });

  const pr = readSlot(practiceSlot);
  if ((p.data.practice.updated_at ?? 0) > (pr.updated_at ?? 0)) writeSlot(practiceSlot, p.data.practice);

  const bm = readSlot(bookmarksSlot);
  writeSlot(bookmarksSlot, {
    bookmarked: uniq([...bm.bookmarked, ...p.data.bookmarks.bookmarked]),
    flagged: uniq([...bm.flagged, ...p.data.bookmarks.flagged]),
  });
  const tips = readSlot(tipsSlot);
  const tipIds = new Set(tips.items.map((t) => t.id));
  writeSlot(tipsSlot, { items: [...tips.items, ...p.data.tips.filter((t) => !tipIds.has(t.id))] });
}
