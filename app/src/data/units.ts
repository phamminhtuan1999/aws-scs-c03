import type { Hotspot, Question } from './schema';

/** Coverage unit (PLAN 5.6): MC/MR choice, ordering step, matching prompt row or response. */
export interface Unit {
  id: string;
  type: 'choice' | 'step' | 'prompt' | 'response';
}

export function unitsOf(q: Question, hs: Hotspot | undefined): Unit[] {
  if (q.type === 'multiple_choice' || q.type === 'multiple_response') {
    return q.choices.map((c) => ({ id: c.id, type: 'choice' as const }));
  }
  if (hs?.kind === 'ordering') return hs.steps.map((s) => ({ id: s.id, type: 'step' as const }));
  if (hs?.kind === 'matching') {
    return [
      ...hs.prompts.map((p) => ({ id: p.id, type: 'prompt' as const })),
      ...hs.responses.map((r) => ({ id: r.id, type: 'response' as const })),
    ];
  }
  return [];
}
