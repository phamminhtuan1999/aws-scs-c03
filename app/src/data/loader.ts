import {
  BankSchema,
  HotspotFileSchema,
  ManifestSchema,
  ReviewSchema,
  ReviewsFileSchema,
  SourceKeysFileSchema,
  type Bank,
  type Hotspot,
  type Manifest,
  type Question,
  type Review,
  type SourceKey,
} from './schema';
import { unitsOf, type Unit } from './units';

export class DataError extends Error {
  constructor(public problems: string[]) {
    super(`Invalid or missing data: ${problems.slice(0, 5).join('; ')}`);
    this.name = 'DataError';
  }
}

export interface AppData {
  bank: Bank;
  questions: Question[];
  allIds: string[];
  byId: Map<string, Question>;
  hotspot: Record<string, Hotspot>;
  keys: Record<string, SourceKey>;
  reviews: Record<string, Review>;
  research_version: string;
  research_generated_at: string | null;
  /** review entries that failed validation and were replaced by "pending" (shown on the coverage page) */
  reviewIssues: { qid: string; message: string }[];
  manifest: Manifest | null;
  units: Record<string, Unit[]>;
  totalUnits: number;
  /** files of role "answer" (only ever rendered after checking/submitting) */
  answerImageFiles: Set<string>;
}

function issuesOf(label: string, err: { issues: { path: PropertyKey[]; message: string }[] }): string[] {
  return err.issues.slice(0, 6).map((i) => `${label}: ${i.path.map(String).join('.') || '(root)'} ${i.message}`);
}

export function pendingReview(qid: string, keys: Record<string, SourceKey>, version: string): Review {
  const k = keys[qid];
  return ReviewSchema.parse({
    status: 'pending',
    researched_answer: null,
    source_answer: (k?.choice_ids ?? k?.sequence ?? k?.pairs ?? null) as Review['source_answer'],
    comparison: 'not_comparable',
    differs_from_source: false,
    research_version: version,
    source_key_gradable: k?.gradable ?? true,
    source_key_ungradable_reason: k?.ungradable_reason ?? null,
    gradable_by_research: false,
  });
}

export interface RawData {
  bank: unknown;
  hotspot: unknown;
  keys: unknown;
  reviews: unknown;
  manifest?: unknown;
}

/** Validate + cross-check everything. Throws DataError (fatal screen) on any contract violation. */
export function buildAppData(raw: RawData): AppData {
  const problems: string[] = [];

  const b = BankSchema.safeParse(raw.bank);
  if (!b.success) throw new DataError(issuesOf('bank.json', b.error));
  const h = HotspotFileSchema.safeParse(raw.hotspot);
  if (!h.success) throw new DataError(issuesOf('hotspot.json', h.error));
  const k = SourceKeysFileSchema.safeParse(raw.keys);
  if (!k.success) throw new DataError(issuesOf('source_keys.json', k.error));
  const rf = ReviewsFileSchema.safeParse(raw.reviews);
  if (!rf.success) throw new DataError(issuesOf('question_reviews.json', rf.error));

  const bank = b.data;
  const questions = [...bank.questions].sort((x, y) => x.number - y.number);
  const byId = new Map<string, Question>();
  for (const q of questions) {
    if (byId.has(q.id)) problems.push(`duplicate question id ${q.id}`);
    byId.set(q.id, q);
  }
  const hotspot = h.data.questions;
  const keys = k.data.keys;

  for (const q of questions) {
    const key = keys[q.id];
    if (!key) {
      problems.push(`${q.id}: no source key`);
      continue;
    }
    if (key.type !== q.type) problems.push(`${q.id}: key type ${key.type} != question type ${q.type}`);
    const hs = hotspot[q.id];
    if (q.type === 'ordering' || q.type === 'matching') {
      if (!hs || hs.kind !== q.type) problems.push(`${q.id}: missing ${q.type} hotspot mapping`);
    }
    if (q.type === 'multiple_choice' || q.type === 'multiple_response') {
      if (q.choices.length === 0) problems.push(`${q.id}: no choices`);
      const ids = new Set(q.choices.map((c) => c.id));
      for (const id of key.choice_ids ?? []) if (!ids.has(id)) problems.push(`${q.id}: key choice ${id} not in choices`);
      if (key.gradable && !(key.choice_ids && key.choice_ids.length)) problems.push(`${q.id}: gradable key without choice_ids`);
    }
    if (hs?.kind === 'ordering') {
      const ids = new Set(hs.steps.map((s) => s.id));
      for (const id of key.sequence ?? []) if (!ids.has(id)) problems.push(`${q.id}: key step ${id} unknown`);
      if (key.gradable && (key.sequence?.length ?? 0) !== hs.slots) problems.push(`${q.id}: key length != slots`);
    }
    if (hs?.kind === 'matching') {
      const pids = new Set(hs.prompts.map((p) => p.id));
      const rids = new Set(hs.responses.map((r) => r.id));
      for (const [p, r] of Object.entries(key.pairs ?? {})) {
        if (!pids.has(p) || !rids.has(r)) problems.push(`${q.id}: key pair ${p}->${r} unknown`);
      }
      if (key.gradable && Object.keys(key.pairs ?? {}).length !== hs.prompts.length) problems.push(`${q.id}: key pairs != prompts`);
    }
    if (key.answer_image) {
      const meta = bank.images[key.answer_image];
      if (!meta || meta.role !== 'answer') problems.push(`${q.id}: answer_image ${key.answer_image} not an answer image`);
    }
    for (const blk of [...q.stem, ...q.choices.flatMap((c) => c.blocks)]) {
      if (blk.type === 'image' && !bank.images[blk.file]) problems.push(`${q.id}: image ${blk.file} not in images table`);
      if (blk.type === 'image' && blk.role === 'answer') problems.push(`${q.id}: answer image inside question blocks`);
    }
  }
  if (problems.length) throw new DataError(problems);

  // Research: file-level problems are fatal; a bad single entry degrades to "pending" and is reported.
  const version = rf.data.research_version;
  const reviews: Record<string, Review> = {};
  const reviewIssues: { qid: string; message: string }[] = [];
  for (const q of questions) {
    const entry = rf.data.questions[q.id];
    if (entry === undefined) {
      reviews[q.id] = pendingReview(q.id, keys, version);
      continue;
    }
    const r = ReviewSchema.safeParse(entry);
    if (r.success) reviews[q.id] = r.data;
    else {
      reviews[q.id] = pendingReview(q.id, keys, version);
      reviewIssues.push({ qid: q.id, message: issuesOf(q.id, r.error)[0] ?? 'invalid research record' });
    }
  }
  for (const id of Object.keys(rf.data.questions)) {
    if (!byId.has(id)) reviewIssues.push({ qid: id, message: 'research record for unknown question ignored' });
  }

  const m = raw.manifest === undefined ? null : ManifestSchema.safeParse(raw.manifest);
  const units: Record<string, Unit[]> = {};
  let totalUnits = 0;
  for (const q of questions) {
    units[q.id] = unitsOf(q, hotspot[q.id]);
    totalUnits += units[q.id].length;
  }
  const answerImageFiles = new Set(Object.entries(bank.images).filter(([, v]) => v.role === 'answer').map(([f]) => f));

  return {
    bank,
    questions,
    allIds: questions.map((q) => q.id),
    byId,
    hotspot,
    keys,
    reviews,
    research_version: version,
    research_generated_at: rf.data.generated_at ?? null,
    reviewIssues,
    manifest: m && m.success ? m.data : null,
    units,
    totalUnits,
    answerImageFiles,
  };
}

export async function loadAppData(fetchFn: typeof fetch = fetch, base = './data/'): Promise<AppData> {
  const get = async (name: string, optional = false): Promise<unknown> => {
    let res: Response;
    try {
      res = await fetchFn(base + name, { cache: 'no-cache' });
    } catch (e) {
      if (optional) return undefined;
      throw new DataError([`could not load ${name}: ${(e as Error).message}`]);
    }
    if (!res.ok) {
      if (optional) return undefined;
      throw new DataError([`could not load ${name}: HTTP ${res.status}`]);
    }
    try {
      return await res.json();
    } catch {
      throw new DataError([`${name} is not valid JSON`]);
    }
  };
  const [bank, hotspot, keys, reviews, manifest] = await Promise.all([
    get('bank.json'),
    get('hotspot.json'),
    get('source_keys.json'),
    get('question_reviews.json'),
    get('manifest.json', true),
  ]);
  return buildAppData({ bank, hotspot, keys, reviews, manifest });
}
