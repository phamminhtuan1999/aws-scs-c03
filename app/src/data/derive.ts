import type { AppData } from './loader';
import type { Block, QType, Question, ReviewStatus, TextBlock } from './schema';

export const TYPE_LABEL: Record<QType, string> = {
  multiple_choice: 'Multiple choice',
  multiple_response: 'Multiple response',
  ordering: 'Ordering',
  matching: 'Matching',
};

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  verified: 'Verified',
  disputed: 'Disputed',
  ambiguous: 'Ambiguous',
  outdated: 'Outdated',
  unresolved: 'Unresolved',
  pending: 'Pending (not researched yet)',
};

export const NOT_CLASSIFIED = 'Not yet classified';

export const isText = (b: Block): b is TextBlock => b.type === 'text';

export const blockText = (blocks: Block[]): string =>
  blocks
    .filter(isText)
    .map((b) => b.text)
    .join(' ');

export interface AnswerLine {
  label: string;
  text: string;
}

/** Render an answer/response value (choice IDs, step sequence or pairs) as labelled text lines. */
export function describeValue(data: AppData, qid: string, value: unknown): AnswerLine[] {
  const q = data.byId.get(qid);
  if (!q || value == null) return [];
  const hs = data.hotspot[qid];
  if (q.type === 'multiple_choice' || q.type === 'multiple_response') {
    const ids = new Set(typeof value === 'string' ? [value] : Array.isArray(value) ? (value.filter((x) => typeof x === 'string') as string[]) : []);
    return q.choices
      .filter((c) => ids.has(c.id))
      .map((c) => {
        const t = blockText(c.blocks);
        return { label: c.letter, text: t || '(image choice)' };
      });
  }
  if (q.type === 'ordering' && hs?.kind === 'ordering') {
    const arr = Array.isArray(value) ? value : [];
    return Array.from({ length: hs.slots }, (_, i) => {
      const id = arr[i];
      const step = hs.steps.find((s) => s.id === id);
      return { label: `Step ${i + 1}`, text: step ? step.text : '(empty)' };
    });
  }
  if (q.type === 'matching' && hs?.kind === 'matching') {
    const rec = (Array.isArray(value) || typeof value !== 'object' ? {} : value) as Record<string, string | null>;
    return hs.prompts.map((p, i) => {
      const r = hs.responses.find((x) => x.id === rec[p.id]);
      return { label: `Row ${i + 1}`, text: `${p.text} → ${r ? r.text : '(none selected)'}` };
    });
  }
  return [];
}

export function describeInline(data: AppData, qid: string, value: unknown): string {
  const q = data.byId.get(qid);
  const lines = describeValue(data, qid, value);
  if (!lines.length) return '(no answer)';
  if (q && (q.type === 'multiple_choice' || q.type === 'multiple_response')) return lines.map((l) => l.label).join(', ');
  return lines.map((l) => `${l.label}: ${l.text}`).join(' | ');
}

/** Human label for any unit id (choice / step / prompt / response). */
export function unitLabel(data: AppData, qid: string, unitId: string): { label: string; text: string } {
  const q = data.byId.get(qid);
  const hs = data.hotspot[qid];
  const c = q?.choices.find((x) => x.id === unitId);
  if (c) return { label: `Choice ${c.letter}`, text: blockText(c.blocks) || '(image choice)' };
  if (hs?.kind === 'ordering') {
    const i = hs.steps.findIndex((s) => s.id === unitId);
    if (i >= 0) return { label: `Step option ${unitId.split(':').pop()}`, text: hs.steps[i].text };
  }
  if (hs?.kind === 'matching') {
    const pi = hs.prompts.findIndex((s) => s.id === unitId);
    if (pi >= 0) return { label: `Row ${pi + 1}`, text: hs.prompts[pi].text };
    const ri = hs.responses.findIndex((s) => s.id === unitId);
    if (ri >= 0) return { label: `Response ${unitId.split(':').pop()}`, text: hs.responses[ri].text };
  }
  return { label: unitId, text: '' };
}

// ---- search / tags --------------------------------------------------------------------------------

const searchCache = new WeakMap<AppData, Map<string, string>>();
export function searchText(data: AppData, q: Question): string {
  let m = searchCache.get(data);
  if (!m) {
    m = new Map();
    searchCache.set(data, m);
  }
  const hit = m.get(q.id);
  if (hit !== undefined) return hit;
  const hs = data.hotspot[q.id];
  const parts = [q.id, blockText(q.stem), ...q.choices.map((c) => `${c.letter}. ${blockText(c.blocks)}`)];
  if (hs?.kind === 'matching') parts.push(...hs.prompts.map((p) => p.text));
  const t = parts.join(' \n ').toLowerCase();
  m.set(q.id, t);
  return t;
}

export interface TagIndex {
  domains: Map<string, string[]>;
  services: Map<string, string[]>;
  unclassified: string[];
}

export function buildTagIndex(data: AppData): TagIndex {
  const domains = new Map<string, string[]>();
  const services = new Map<string, string[]>();
  const unclassified: string[] = [];
  for (const id of data.allIds) {
    const t = data.reviews[id]?.tags;
    const d = t?.domains ?? [];
    const s = t?.services ?? [];
    if (!t || (d.length === 0 && s.length === 0)) unclassified.push(id);
    for (const x of d) domains.set(x, [...(domains.get(x) ?? []), id]);
    for (const x of s) services.set(x, [...(services.get(x) ?? []), id]);
  }
  return { domains, services, unclassified };
}

/** Parse "Q001-Q010, Q040, 55" style lists; returns known IDs (original order) and unparsed tokens. */
export function parseIdList(text: string, data: AppData): { ids: string[]; invalid: string[] } {
  const want = new Set<string>();
  const invalid: string[] = [];
  const toId = (t: string): string | null => {
    const m = /^q?0*(\d{1,3})$/i.exec(t.trim());
    if (!m) return null;
    const id = `Q${m[1].padStart(3, '0')}`;
    return data.byId.has(id) ? id : null;
  };
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const range = /^(q?\d{1,3})\s*[-–—]\s*(q?\d{1,3})$/i.exec(tok);
    if (range) {
      const a = toId(range[1]);
      const b = toId(range[2]);
      if (!a || !b) {
        invalid.push(tok);
        continue;
      }
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (const id of data.allIds) if (id >= lo && id <= hi) want.add(id);
      continue;
    }
    const id = toId(tok);
    if (id) want.add(id);
    else invalid.push(tok);
  }
  return { ids: data.allIds.filter((id) => want.has(id)), invalid };
}

export const fmtDate = (t: number | string | null | undefined): string => {
  if (t == null || t === '') return '';
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString();
};

export const fmtPercent = (p: number | null): string => (p == null ? 'n/a' : `${p.toFixed(1)}%`);
