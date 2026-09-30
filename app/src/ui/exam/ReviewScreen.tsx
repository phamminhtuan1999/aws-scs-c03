import { useState } from 'react';
import type { AppData } from '../../data/loader';
import { answerState, type AnswerState } from '../../session/exam';
import type { ExamSession } from '../../session/types';

export function stateOf(data: AppData, s: ExamSession, qid: string): AnswerState {
  const q = data.byId.get(qid)!;
  const hs = data.hotspot[qid];
  const expected = hs?.kind === 'ordering' ? hs.slots : hs?.kind === 'matching' ? hs.prompts.length : undefined;
  return answerState(q.type, s.responses[qid], expected);
}

export function examCounts(data: AppData, s: ExamSession) {
  let answered = 0;
  let unanswered = 0;
  let incomplete = 0;
  for (const id of s.question_ids) {
    const st = stateOf(data, s, id);
    if (st === 'answered') answered += 1;
    else if (st === 'incomplete') incomplete += 1;
    else unanswered += 1;
  }
  return { answered, unanswered, incomplete, flagged: s.flags.length, total: s.question_ids.length };
}

type Filter = 'all' | 'answered' | 'unanswered' | 'flagged';

export interface ReviewScreenProps {
  data: AppData;
  session: ExamSession;
  onJump: (index: number) => void;
  onReturn: () => void;
  onEnd: () => void;
}

/** Grid of every question: answered / unanswered / flagged, filterable; click jumps to the question. No IDs are shown. */
export function ReviewScreen({ data, session, onJump, onReturn, onEnd }: ReviewScreenProps) {
  const [filter, setFilter] = useState<Filter>('all');
  const c = examCounts(data, session);
  const cells = session.question_ids.map((id, i) => ({ id, i, st: stateOf(data, session, id), flagged: session.flags.includes(id) }));
  const shown = cells.filter((x) => {
    if (filter === 'answered') return x.st === 'answered';
    if (filter === 'unanswered') return x.st !== 'answered';
    if (filter === 'flagged') return x.flagged;
    return true;
  });

  return (
    <section className="review-screen" aria-labelledby="review-h">
      <h2 id="review-h">Review screen</h2>
      <p className="review-summary" aria-live="polite">
        Answered: <strong>{c.answered}</strong> &middot; Unanswered: <strong>{c.unanswered}</strong>
        {c.incomplete > 0 && <> &middot; Incomplete: <strong>{c.incomplete}</strong></>} &middot; Flagged for review: <strong>{c.flagged}</strong>
      </p>
      <div className="filter-row" role="group" aria-label="Filter questions">
        {(
          [
            ['all', `All (${c.total})`],
            ['answered', `Answered (${c.answered})`],
            ['unanswered', `Unanswered (${c.unanswered + c.incomplete})`],
            ['flagged', `Flagged (${c.flagged})`],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>
      <ul className="review-grid" aria-label="Questions">
        {shown.map((x) => {
          const parts = [`Question ${x.i + 1}`, x.st === 'answered' ? 'answered' : x.st === 'incomplete' ? 'incomplete' : 'unanswered'];
          if (x.flagged) parts.push('flagged for review');
          return (
            <li key={x.id}>
              <button
                type="button"
                className={`review-cell st-${x.st}${x.flagged ? ' is-flagged' : ''}${x.i === session.current_index ? ' is-current' : ''}`}
                aria-label={parts.join(', ')}
                onClick={() => onJump(x.i)}
              >
                <span className="cell-num">{x.i + 1}</span>
                <span className="cell-marks" aria-hidden="true">
                  {x.st === 'answered' ? '✓' : x.st === 'incomplete' ? '…' : '–'}
                  {x.flagged ? ' ⚑' : ''}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="muted">No questions match this filter.</p>}
      <p className="legend muted small">
        &#10003; answered &middot; &hellip; incomplete (ordering/matching not fully filled) &middot; &ndash; unanswered &middot; &#9873; flagged
      </p>
      <div className="action-row">
        <button type="button" onClick={onReturn}>
          Return to question
        </button>
        <button type="button" className="danger" onClick={onEnd}>
          End exam
        </button>
      </div>
    </section>
  );
}
