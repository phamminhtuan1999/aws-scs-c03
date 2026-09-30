/**
 * TEST-ONLY research fixtures. Hand-written to follow the documented question_reviews.json shapes so the
 * verified / disputed / ambiguous code paths can be tested. This is NOT research and is never shipped in the app.
 * Every human-visible string carries a FIXTURE_ marker so leak tests can search for it.
 */
import { allPendingReviews } from './data';

export const MARK = {
  why: (q: string) => `FIXTURE_WHY_CORRECT_${q}`,
  other: (q: string, u: string) => `FIXTURE_OTHER_${q}_${u}`,
  keyword: (q: string) => `FIXTURE_KEYWORD_${q}`,
  keywordMeaning: (q: string) => `FIXTURE_KEYWORD_MEANING_${q}`,
  tip: (q: string) => `FIXTURE_TIP_${q}`,
  refTitle: (q: string) => `FIXTURE_REF_TITLE_${q}`,
  quote: (q: string) => `FIXTURE_QUOTE_${q}`,
  reason: (q: string) => `FIXTURE_CONFIDENCE_REASON_${q}`,
  disputedReason: (q: string) => `FIXTURE_DISPUTED_REASON_${q}`,
};

export interface FixtureOpts {
  status?: 'verified' | 'disputed' | 'ambiguous' | 'outdated' | 'unresolved';
  confidence?: 'high' | 'medium' | 'low';
  differs?: boolean;
  gradable?: boolean;
  domains?: string[];
  services?: string[];
}

export function makeReview(base: any, qid: string, researched: unknown, opts: FixtureOpts = {}) {
  const status = opts.status ?? 'verified';
  const gradable = opts.gradable ?? (status === 'verified');
  const unitIds: string[] = (base.__units ?? []) as string[];
  return {
    ...base,
    status,
    researched_answer: researched,
    comparison: opts.differs ? 'mismatch' : 'match',
    differs_from_source: !!opts.differs,
    confidence: { level: opts.confidence ?? 'high', reason_vi: MARK.reason(qid), open_issues: [] },
    option_reviews: unitIds.map((u) => ({
      unit_id: u,
      unit_type: 'choice',
      verdict: 'meets',
      reason_vi: `FIXTURE_UNIT_REASON_${u}`,
      reference_ids: ['ref1'],
      evidence_kind: 'direct',
    })),
    references: [
      {
        id: 'ref1',
        url: 'https://docs.aws.amazon.com/fixture-test-page.html',
        title: MARK.refTitle(qid),
        section: 'fixture',
        accessed_at: '2026-01-01',
        page_last_updated: null,
        quote: MARK.quote(qid),
        supports: 'fixture',
        kind: 'direct',
      },
    ],
    explanation_vi: { why_correct: MARK.why(qid), others: {} },
    keywords: [{ phrase: MARK.keyword(qid), meaning_vi: MARK.keywordMeaning(qid) }],
    memory_tip_vi: MARK.tip(qid),
    tags: { domains: opts.domains ?? ['4 Identity and Access Management'], services: opts.services ?? ['AWS IAM'], reason_vi: 'fixture' },
    source_issues: [],
    researched_at: '2026-01-01T00:00:00Z',
    last_reviewed_at: '2026-01-01T00:00:00Z',
    independent_verdict: { answer: researched, proposed_status: status, confidence: { level: 'high', reason_vi: 'fixture' }, reference_ids: ['ref1'], recorded_at: '2026-01-01T00:00:00Z' },
    reconciliation_vi: status === 'verified' ? 'FIXTURE_RECONCILIATION' : MARK.disputedReason(qid),
    history: [{ version: 'r1', date: '2026-01-01', change: 'FIXTURE_HISTORY', previous_answer: null }],
    gradable_by_research: gradable,
  };
}

/**
 * Fixture research file:
 *  Q001 verified, matches source (C)        Q003 verified, DIFFERS from source (source B -> researched A)
 *  Q013 disputed (MR)                       Q002 verified ordering (same as source)
 *  Q079 verified matching (same as source)  Q005 ambiguous
 */
export function fixtureReviews(): any {
  const f = allPendingReviews();
  const q = f.questions;
  const withUnits = (id: string, units: string[]) => ({ ...q[id], __units: units });
  q.Q001 = makeReview(withUnits('Q001', ['Q001:A', 'Q001:B', 'Q001:C', 'Q001:D']), 'Q001', ['Q001:C']);
  q.Q001.explanation_vi.others = { 'Q001:A': MARK.other('Q001', 'A'), 'Q001:B': MARK.other('Q001', 'B'), 'Q001:D': MARK.other('Q001', 'D') };
  q.Q003 = makeReview(withUnits('Q003', ['Q003:A', 'Q003:B', 'Q003:C', 'Q003:D']), 'Q003', ['Q003:A'], { differs: true });
  q.Q013 = makeReview(withUnits('Q013', ['Q013:A', 'Q013:B', 'Q013:C', 'Q013:D', 'Q013:E']), 'Q013', ['Q013:B', 'Q013:C'], { status: 'disputed', confidence: 'low', differs: true });
  q.Q002 = makeReview(withUnits('Q002', []), 'Q002', ['Q002:S1', 'Q002:S5', 'Q002:S3']);
  q.Q079 = makeReview(withUnits('Q079', []), 'Q079', { 'Q079:P1': 'Q079:R2', 'Q079:P2': 'Q079:R6', 'Q079:P3': 'Q079:R1' });
  q.Q005 = makeReview(withUnits('Q005', []), 'Q005', null, { status: 'ambiguous', confidence: 'low' });
  for (const id of Object.keys(q)) delete q[id].__units;
  f.research_version = 'rTEST';
  return f;
}
