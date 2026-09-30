import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAppData, type AppData } from '../../src/data/loader';

const here = path.dirname(fileURLToPath(import.meta.url));
export const TRAINER_ROOT = path.resolve(here, '..', '..', '..');

export const readJson = (rel: string): any => JSON.parse(fs.readFileSync(path.join(TRAINER_ROOT, rel), 'utf8'));

let rawCache: { bank: any; hotspot: any; keys: any; reviews: any } | null = null;
export function rawData() {
  if (!rawCache) {
    rawCache = {
      bank: readJson('data/normalized/bank.json'),
      hotspot: readJson('data/interactions/hotspot.json'),
      keys: readJson('data/keys/source_keys.json'),
      reviews: readJson('research/question_reviews.json'),
    };
  }
  return rawCache;
}

/** Real data from disk. `reviewsOverride` lets tests replace the research file (e.g. all-pending or a fixture). */
export function loadRealData(reviewsOverride?: unknown): AppData {
  const r = rawData();
  return buildAppData({
    bank: structuredClone(r.bank),
    hotspot: structuredClone(r.hotspot),
    keys: structuredClone(r.keys),
    reviews: reviewsOverride ?? structuredClone(r.reviews),
  });
}

/** Every question pending, regardless of what the research agents have produced so far. */
export function allPendingReviews(): any {
  const r = rawData();
  const questions: Record<string, unknown> = {};
  for (const q of r.bank.questions) {
    const k = r.keys.keys[q.id];
    questions[q.id] = {
      status: 'pending',
      researched_answer: null,
      source_answer: k.choice_ids ?? k.sequence ?? k.pairs ?? null,
      comparison: 'not_comparable',
      differs_from_source: false,
      confidence: null,
      option_reviews: [],
      references: [],
      explanation_vi: null,
      keywords: [],
      memory_tip_vi: null,
      tags: null,
      source_issues: [],
      requirements: [],
      image_transcriptions: [],
      research_version: 'r1',
      source_key_gradable: k.gradable,
      source_key_ungradable_reason: k.ungradable_reason ?? null,
      gradable_by_research: false,
    };
  }
  return { research_version: 'r1', generated_at: '2026-01-01T00:00:00Z', questions };
}
