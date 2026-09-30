import { useEffect } from 'react';
import { navigate } from '../../router';
import { practiceSlot, studySlot } from '../../storage/slots';
import { readSlot, writeSlot } from '../../storage/store';
import { getClock } from '../../time/clock';
import { useData, useSlot } from '../hooks';
import { StudyQuestion } from './StudyQuestion';

/** Runs the persisted custom study set (#/study/run). The index survives a refresh. */
export function StudyRunner() {
  const study = useSlot(studySlot);
  const cur = study.current;

  useEffect(() => {
    if (!cur) navigate('/study', { replace: true });
  }, [cur]);
  if (!cur || cur.ids.length === 0) return null;

  const index = Math.min(cur.index, cur.ids.length - 1);
  const qid = cur.ids[index];
  const go = (i: number) => {
    const s = readSlot(studySlot);
    if (s.current) writeSlot(studySlot, { ...s, current: { ...s.current, index: i } });
  };

  return (
    <div className="page">
      <p className="crumbs">
        <a href="#/study">&larr; Study sets</a> &middot; <span>{cur.label}</span>
      </p>
      <p className="progress-line" aria-live="polite">
        Question {index + 1} of {cur.ids.length}
      </p>
      <StudyQuestion
        key={qid}
        qid={qid}
        source="study"
        nav={
          <span className="nav-group">
            <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
              Previous
            </button>
            {index < cur.ids.length - 1 ? (
              <button type="button" className="primary" onClick={() => go(index + 1)}>
                Next
              </button>
            ) : (
              <button type="button" className="primary" onClick={() => navigate('/study')}>
                Finish set
              </button>
            )}
          </span>
        }
      />
    </div>
  );
}

/** Practice in order: Q001 -> Q143. */
export function PracticeHome() {
  const data = useData();
  const practice = useSlot(practiceSlot);
  const study = useSlot(studySlot);
  const checked = data.allIds.filter((id) => (study.attempts[id] ?? []).some((a) => a.source === 'practice')).length;
  const total = data.allIds.length;
  const resume = practice.position && data.byId.has(practice.position) ? practice.position : null;

  return (
    <div className="page">
      <h1>Practice in order (Q001 &rarr; Q{String(total).padStart(3, '0')})</h1>
      <p className="muted">
        Walk through all {total} questions in their original order. Your position is remembered. Each question works like Study: nothing
        about the answer is shown until you press &ldquo;Check answer&rdquo;.
      </p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={checked} aria-label="Questions checked">
        <div className="progress-fill" style={{ width: `${(checked / total) * 100}%` }} />
      </div>
      <p className="progress-line">
        <strong>
          {checked} / {total}
        </strong>{' '}
        checked
      </p>
      <div className="action-row">
        {resume && (
          <button type="button" className="primary" onClick={() => navigate(`/practice/${resume}`)}>
            Resume at {resume}
          </button>
        )}
        <button type="button" className={resume ? '' : 'primary'} onClick={() => navigate(`/practice/${data.allIds[0]}`)}>
          Start at {data.allIds[0]}
        </button>
      </div>
      <JumpTo />
    </div>
  );
}

function JumpTo({ current }: { current?: string }) {
  const data = useData();
  return (
    <form
      className="jump-form"
      onSubmit={(e) => {
        e.preventDefault();
        const input = (e.currentTarget.elements.namedItem('jump') as HTMLInputElement).value.trim();
        const m = /^q?0*(\d{1,3})$/i.exec(input);
        const id = m ? `Q${m[1].padStart(3, '0')}` : '';
        if (data.byId.has(id)) navigate(`/practice/${id}`);
        else (e.currentTarget.elements.namedItem('jump') as HTMLInputElement).setCustomValidity('Enter a question number from 1 to ' + data.allIds.length);
        (e.currentTarget.elements.namedItem('jump') as HTMLInputElement).reportValidity?.();
      }}
    >
      <label htmlFor="jump">Jump to Q…</label>{' '}
      <input
        id="jump"
        name="jump"
        type="text"
        inputMode="numeric"
        placeholder={current ?? 'e.g. 42 or Q042'}
        size={10}
        onChange={(e) => e.currentTarget.setCustomValidity('')}
      />{' '}
      <button type="submit">Go</button>
    </form>
  );
}

export function PracticeRunner({ qid }: { qid: string }) {
  const data = useData();
  const study = useSlot(studySlot);
  const idx = data.allIds.indexOf(qid);

  useEffect(() => {
    if (idx >= 0) writeSlot(practiceSlot, { position: qid, updated_at: getClock().now() });
  }, [qid, idx]);

  if (idx < 0) {
    return (
      <div className="page">
        <p role="alert">Unknown question &ldquo;{qid}&rdquo;.</p>
        <a href="#/practice">Back to practice</a>
      </div>
    );
  }
  const checked = data.allIds.filter((id) => (study.attempts[id] ?? []).some((a) => a.source === 'practice')).length;
  const prev = data.allIds[idx - 1];
  const next = data.allIds[idx + 1];

  return (
    <div className="page">
      <p className="crumbs">
        <a href="#/practice">&larr; Practice in order</a>
      </p>
      <p className="progress-line" aria-live="polite">
        {qid} &middot; {idx + 1} of {data.allIds.length} &middot; <strong>{checked} / {data.allIds.length}</strong> checked
      </p>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={data.allIds.length} aria-valuenow={checked} aria-label="Questions checked">
        <div className="progress-fill" style={{ width: `${(checked / data.allIds.length) * 100}%` }} />
      </div>
      <StudyQuestion
        key={qid}
        qid={qid}
        source="practice"
        nav={
          <span className="nav-group">
            <button type="button" onClick={() => navigate(`/practice/${prev}`)} disabled={!prev}>
              Previous
            </button>
            {next ? (
              <button type="button" className="primary" onClick={() => navigate(`/practice/${next}`)}>
                Next
              </button>
            ) : (
              <button type="button" className="primary" onClick={() => navigate('/practice')}>
                Finish
              </button>
            )}
          </span>
        }
      />
      <JumpTo current={qid} />
    </div>
  );
}
