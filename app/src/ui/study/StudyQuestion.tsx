import { useRef, useState, type ReactNode } from 'react';
import { TYPE_LABEL } from '../../data/derive';
import type { Response } from '../../grading/engine';
import { addTip, bookmarksSlot, recordAttempt, toggleBookmark } from '../../storage/slots';
import { getClock } from '../../time/clock';
import { Feedback } from '../feedback/Feedback';
import { annotate, studyOutcome, type Outcome } from '../feedback/outcome';
import { useData, useSlot } from '../hooks';
import { QuestionView } from '../question/QuestionView';

function emptyResponse(type: string): Response {
  return type === 'multiple_response' ? [] : type === 'matching' ? {} : type === 'ordering' ? [] : null;
}

export interface StudyQuestionProps {
  qid: string;
  source: 'study' | 'practice';
  /** navigation controls rendered in the action row (Previous / Next ...) */
  nav?: ReactNode;
  heading?: ReactNode;
}

/**
 * One question in Study / Practice / Bank. Nothing about correctness, explanation, keywords, tips,
 * research or answer images is mounted until "Check answer" is pressed.
 */
export function StudyQuestion({ qid, source, nav, heading }: StudyQuestionProps) {
  const data = useData();
  const q = data.byId.get(qid)!;
  const [response, setResponse] = useState<Response>(() => emptyResponse(q.type));
  const [checked, setChecked] = useState<{ outcome: Outcome; response: Response } | null>(null);
  const [tipOpen, setTipOpen] = useState(false);
  const [tipText, setTipText] = useState('');
  const [tipSaved, setTipSaved] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const marks = useSlot(bookmarksSlot);

  const check = () => {
    const outcome = studyOutcome(data, qid, response);
    setChecked({ outcome, response });
    recordAttempt({
      qid,
      at: getClock().now(),
      source,
      response: (response ?? null) as never,
      result: outcome.result,
      basis: outcome.gradedBasis,
      research_version: data.research_version,
    });
    window.setTimeout(() => feedbackRef.current?.focus(), 0);
  };
  const retry = () => {
    setChecked(null);
    setResponse(emptyResponse(q.type));
  };

  const openTip = () => {
    setTipOpen(true);
    setTipSaved(false);
    // the research memory tip is only offered once the answer has been checked
    if (checked && data.reviews[qid].memory_tip_vi && !tipText) setTipText(data.reviews[qid].memory_tip_vi ?? '');
  };

  return (
    <div className="study-question" data-qid={qid}>
      <header className="q-header">
        <h2>
          {qid} <span className="muted">&middot; {TYPE_LABEL[q.type]}</span>
        </h2>
        {heading}
      </header>

      <QuestionView
        data={data}
        qid={qid}
        response={checked ? checked.response : response}
        onChange={checked ? undefined : setResponse}
        disabled={!!checked}
        annotations={checked ? annotate(data, checked.outcome, checked.response) : undefined}
      />

      <div className="action-row">
        {!checked ? (
          <button type="button" className="primary" onClick={check}>
            Check answer
          </button>
        ) : (
          <button type="button" onClick={retry}>
            Try again
          </button>
        )}
        <button type="button" aria-pressed={marks.bookmarked.includes(qid)} onClick={() => toggleBookmark('bookmarked', qid)}>
          {marks.bookmarked.includes(qid) ? 'Bookmarked' : 'Bookmark'}
        </button>
        <button type="button" aria-pressed={marks.flagged.includes(qid)} onClick={() => toggleBookmark('flagged', qid)}>
          {marks.flagged.includes(qid) ? 'Flagged' : 'Flag'}
        </button>
        <button type="button" onClick={openTip} aria-expanded={tipOpen}>
          Save tip
        </button>
        {nav}
      </div>

      {tipOpen && (
        <form
          className="tip-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tipText.trim()) return;
            addTip(qid, tipText.trim(), getClock().now());
            setTipSaved(true);
            setTipOpen(false);
            setTipText('');
          }}
        >
          <label htmlFor={`tip-${qid}`}>Tip for {qid} (stored on this device, as plain text)</label>
          <textarea id={`tip-${qid}`} value={tipText} onChange={(e) => setTipText(e.target.value)} rows={3} maxLength={2000} />
          <div className="action-row">
            <button type="submit" className="primary">
              Save tip
            </button>
            <button type="button" onClick={() => setTipOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {tipSaved && (
        <p role="status" className="muted">
          Tip saved. See &ldquo;Saved tips&rdquo;.
        </p>
      )}

      {checked && (
        <div ref={feedbackRef} tabIndex={-1} className="feedback-wrap">
          <Feedback data={data} outcome={checked.outcome} response={checked.response} />
        </div>
      )}
    </div>
  );
}
