import { fmtDate, fmtPercent, TYPE_LABEL } from '../../data/derive';
import type { Response } from '../../grading/engine';
import type { ExamSession } from '../../session/types';
import { listSessions } from '../../storage/slots';
import { formatDuration } from '../../time/clock';
import { EXAM_NAME } from '../../version';
import { Feedback } from '../feedback/Feedback';
import { annotate, examOutcome } from '../feedback/outcome';
import { useData } from '../hooks';
import { QuestionView } from '../question/QuestionView';
import { BASIS_LABEL } from './ExamStart';
import { navigate } from '../../router';

export const REASON_TEXT: Record<NonNullable<ExamSession['submit_reason']>, string> = {
  user: 'Ended by you',
  timeout: 'Time ran out: the exam was submitted automatically',
  expired_on_load: 'Time ran out while the app was closed: the exam was graded when it was reopened',
};

export function kindLabel(s: ExamSession): string {
  return s.kind === 'standard' ? 'Exam simulation' : s.kind === 'shorter' ? 'Practice configuration (shorter exam)' : 'Practice configuration (custom exam)';
}

function findSession(id: string): ExamSession | null {
  return listSessions().find((s) => s.id === id) ?? null;
}

function QLink({ s, id }: { s: ExamSession; id: string }) {
  const i = s.question_ids.indexOf(id);
  return (
    <a href={`#/exam/results/${s.id}/${i + 1}`}>
      #{i + 1} ({id})
    </a>
  );
}

export function Results({ id }: { id: string }) {
  const data = useData();
  const s = findSession(id);
  if (!s) {
    return (
      <div className="page">
        <h1>Exam results</h1>
        <p role="alert">This exam could not be found on this device.</p>
        <a href="#/history">History</a>
      </div>
    );
  }
  if (s.status !== 'submitted' || !s.result) {
    return (
      <div className="page">
        <h1>Exam results</h1>
        <p>This exam has not been submitted yet.</p>
        <button type="button" onClick={() => navigate('/exam/run')}>
          Return to exam
        </button>
      </div>
    );
  }
  const r = s.result;
  const per = r.per_question;
  const flagged = s.flags;
  const wrong = s.question_ids.filter((q) => per[q] === 'incorrect');
  const unanswered = s.question_ids.filter((q) => per[q] === 'unanswered_incorrect');
  const ungradable = s.question_ids.filter((q) => per[q] === 'ungradable');
  const pct = fmtPercent(r.percent);

  return (
    <div className="page results">
      <h1>Exam results</h1>
      <p className="muted">
        {EXAM_NAME} &middot; {kindLabel(s)}
      </p>

      <section className="score-box" aria-label="Score">
        <p className="score" data-testid="score">
          Raw score: <strong>{r.correct} / {r.scored}</strong> ({pct})
        </p>
        <p className="disclaimer">Raw practice score &mdash; not an AWS scaled score; does not predict a pass.</p>
        {r.scored === 0 && <p className="warn-text">No question in this exam could be scored on this basis.</p>}
      </section>

      <dl className="kv">
        <dt>Grading basis</dt>
        <dd>
          {BASIS_LABEL[s.basis]} (research_version {s.research_version})
        </dd>
        <dt>Started</dt>
        <dd>{fmtDate(s.started_at)}</dd>
        <dt>Time used</dt>
        <dd>
          {formatDuration(r.time_used_ms)} of {formatDuration(s.duration_ms)}
        </dd>
        <dt>How it ended</dt>
        <dd>{s.submit_reason ? REASON_TEXT[s.submit_reason] : ''}</dd>
        <dt>Seed</dt>
        <dd>{s.seed}</dd>
        <dt>Counts</dt>
        <dd>
          correct {r.correct} &middot; incorrect {wrong.length} &middot; unanswered {unanswered.length} &middot; flagged {flagged.length} &middot; not scored {ungradable.length}
        </dd>
      </dl>

      {ungradable.length > 0 && (
        <section className="info-box">
          <h2 className="h3">Not scored ({ungradable.length})</h2>
          <p>
            These questions were shown but could not be scored on this basis; they are excluded from the denominator and are not counted as wrong:{' '}
            {ungradable.map((q, i) => (
              <span key={q}>
                {i > 0 && ', '}
                <QLink s={s} id={q} />
              </span>
            ))}
            .
          </p>
        </section>
      )}

      <ListSection title="Incorrect" ids={wrong} s={s} />
      <ListSection title="Unanswered (counted as incorrect)" ids={unanswered} s={s} />
      <ListSection title="Flagged for review" ids={flagged} s={s} />

      <h2 className="h3">All questions</h2>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Question</th>
              <th>Type</th>
              <th>Result</th>
              <th>Flagged</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {s.question_ids.map((q, i) => (
              <tr key={q}>
                <td>{i + 1}</td>
                <td>{q}</td>
                <td>{TYPE_LABEL[data.byId.get(q)!.type]}</td>
                <td>{resultText(per[q])}</td>
                <td>{flagged.includes(q) ? 'yes' : ''}</td>
                <td>
                  <a href={`#/exam/results/${s.id}/${i + 1}`}>Review</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="action-row">
        <a className="button-link" href={`#/exam/results/${s.id}/1`}>
          Review question by question
        </a>
        <a className="button-link" href="#/exam">
          New exam
        </a>
        <a className="button-link" href="#/history">
          History &amp; stats
        </a>
      </div>
    </div>
  );
}

export function resultText(g: string | undefined): string {
  return g === 'correct' ? 'Correct' : g === 'incorrect' ? 'Incorrect' : g === 'unanswered_incorrect' ? 'Unanswered (incorrect)' : g === 'ungradable' ? 'Not scored' : '';
}

function ListSection({ title, ids, s }: { title: string; ids: string[]; s: ExamSession }) {
  if (ids.length === 0) return null;
  return (
    <section>
      <h2 className="h3">
        {title} ({ids.length})
      </h2>
      <p>
        {ids.map((q, i) => (
          <span key={q}>
            {i > 0 && ', '}
            <QLink s={s} id={q} />
          </span>
        ))}
      </p>
    </section>
  );
}

/** Per-question review: your answer vs the key snapshot, then the same explanation panel as Study. */
export function ResultReview({ id, n }: { id: string; n: number }) {
  const data = useData();
  const s = findSession(id);
  if (!s || s.status !== 'submitted' || !s.result) {
    return (
      <div className="page">
        <p role="alert">This exam result is not available.</p>
        <a href="#/history">History</a>
      </div>
    );
  }
  const total = s.question_ids.length;
  const idx = Math.max(1, Math.min(total, n)) - 1;
  const qid = s.question_ids[idx];
  const response = (s.responses[qid] ?? null) as Response;
  const outcome = examOutcome(data, s, qid, response);

  return (
    <div className="page results-review">
      <p className="crumbs">
        <a href={`#/exam/results/${s.id}`}>&larr; Results</a>
      </p>
      <h1>
        Review: question {idx + 1} of {total} <span className="muted">&middot; {qid}</span>
      </h1>
      <p className="muted">
        {TYPE_LABEL[data.byId.get(qid)!.type]}
        {s.flags.includes(qid) ? ' · flagged for review' : ''}
      </p>
      <QuestionView data={data} qid={qid} response={response} disabled hideClear annotations={annotate(data, outcome, response)} />
      <Feedback data={data} outcome={outcome} response={response} />
      <div className="action-row">
        <button type="button" onClick={() => navigate(`/exam/results/${s.id}/${idx}`)} disabled={idx === 0}>
          Previous
        </button>
        <button type="button" className="primary" onClick={() => navigate(`/exam/results/${s.id}/${idx + 2}`)} disabled={idx >= total - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
