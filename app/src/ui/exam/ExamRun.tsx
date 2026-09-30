import { useEffect, useRef, useState } from 'react';
import type { Response } from '../../grading/engine';
import { navigate, useRoute } from '../../router';
import { goTo, pause, remainingMs, resume, setResponse, toggleFlag } from '../../session/exam';
import type { ExamSession } from '../../session/types';
import { COLOR_SCHEMES, COLOR_SCHEME_LABELS, settingsSlot } from '../../storage/slots';
import { readSlot, writeSlot } from '../../storage/store';
import { formatDuration, getClock } from '../../time/clock';
import { EXAM_NAME } from '../../version';
import { useData, useNow, useSlot } from '../hooks';
import { Modal } from '../Modal';
import { QuestionView } from '../question/QuestionView';
import { commitActive, getLastSeenActiveId, submitActive, useActiveExam } from './active';
import { ReviewScreen, examCounts } from './ReviewScreen';

const WARN_STEPS = [15, 5, 1]; // minutes

export function ExamRun() {
  const data = useData();
  const session = useActiveExam();
  const route = useRoute();
  const now = useNow(1000, !!session);
  const settings = useSlot(settingsSlot);
  const [dialog, setDialog] = useState<null | 'help' | 'end'>(null);
  const [announce, setAnnounce] = useState('');
  const announced = useRef<Set<number>>(new Set());
  const mainRef = useRef<HTMLElement>(null);

  // The exam ended (user, timeout, or another tab): go to its results.
  useEffect(() => {
    const last = getLastSeenActiveId();
    if (!session && last) navigate(`/exam/results/${last}`, { replace: true });
    else if (!session) navigate('/exam', { replace: true });
  }, [session]);

  const remaining = session ? remainingMs(session, now) : 0;

  // aria-live timer warnings (15 / 5 / 1 minutes left), announced once each
  useEffect(() => {
    if (!session || session.paused_at !== null) return;
    const mins = remaining / 60_000;
    for (const m of WARN_STEPS) {
      if (mins <= m && !announced.current.has(m)) {
        announced.current.add(m);
        // only announce the most urgent threshold just crossed
        if (Math.min(...WARN_STEPS.filter((x) => mins <= x)) === m) setAnnounce(`${m} minute${m === 1 ? '' : 's'} remaining.`);
      }
    }
  }, [remaining, session]);

  // Alt+N / Alt+P / Alt+F / Alt+R shortcuts (skipped while a dialog is open)
  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || document.querySelector('[data-modal]')) return;
      const k = e.key.toLowerCase();
      const cur = (commitActive((s) => s) ?? session) as ExamSession;
      if (k === 'n') {
        e.preventDefault();
        commitActive((s) => goTo(s, s.current_index + 1, getClock().now()));
        navigate('/exam/run');
      } else if (k === 'p') {
        e.preventDefault();
        commitActive((s) => goTo(s, s.current_index - 1, getClock().now()));
        navigate('/exam/run');
      } else if (k === 'f') {
        e.preventDefault();
        commitActive((s) => toggleFlag(s, cur.question_ids[cur.current_index], getClock().now()));
      } else if (k === 'r') {
        e.preventDefault();
        navigate(route.path === '/exam/review' ? '/exam/run' : '/exam/review');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, route.path]);

  // keep the top of the question in view when moving between questions
  useEffect(() => {
    mainRef.current?.scrollIntoView?.({ block: 'start' });
    window.scrollTo?.(0, 0);
  }, [session?.current_index, route.path]);

  if (!session) return null;

  const n = session.question_ids.length;
  const idx = Math.min(session.current_index, n - 1);
  const qid = session.question_ids[idx];
  const flagged = session.flags.includes(qid);
  const paused = session.paused_at !== null;
  const reviewing = route.path === '/exam/review';
  const counts = examCounts(data, session);

  const timerClass = remaining <= 5 * 60_000 ? 'timer timer-danger' : remaining <= 15 * 60_000 ? 'timer timer-warn' : 'timer';
  const update = (fn: (s: ExamSession, t: number) => ExamSession) => commitActive((s) => fn(s, getClock().now()));
  const go = (i: number) => {
    update((s, t) => goTo(s, i, t));
    navigate('/exam/run');
  };

  const setScheme = (v: (typeof COLOR_SCHEMES)[number]) => writeSlot(settingsSlot, { ...readSlot(settingsSlot), color_scheme: v });
  const setFont = (d: number) => {
    const cur = readSlot(settingsSlot);
    writeSlot(settingsSlot, { ...cur, font_step: Math.max(0, Math.min(3, cur.font_step + d)) });
  };

  const practiceChip =
    session.kind === 'standard' ? null : (
      <span className="badge badge-info">Practice configuration{session.allow_pause ? ' — pause enabled' : ''}</span>
    );

  return (
    <div className="exam-shell">
      <header className="exam-titlebar">
        <h1 className="exam-name">{EXAM_NAME}</h1>
        <div className="exam-meta">
          <span className="time-remaining">
            Time remaining: <span className={timerClass} role="timer" aria-live="off" data-testid="timer">{formatDuration(remaining)}</span>
          </span>
          <span className="question-counter" data-testid="question-counter">
            {`Question ${idx + 1} of ${n}`}
          </span>
        </div>
        {practiceChip}
      </header>
      <div className="exam-toolbar" role="toolbar" aria-label="Exam tools">
        <button
          type="button"
          className="flag-btn"
          aria-pressed={flagged}
          onClick={() => update((s, t) => toggleFlag(s, qid, t))}
          disabled={paused || reviewing}
          title="Alt+F"
        >
          <span aria-hidden="true">{flagged ? '⚑' : '⚐'}</span> Flag for review
        </button>
        <label className="scheme-label">
          Color scheme{' '}
          <select value={settings.color_scheme} onChange={(e) => setScheme(e.target.value as (typeof COLOR_SCHEMES)[number])}>
            {COLOR_SCHEMES.map((c) => (
              <option key={c} value={c}>
                {COLOR_SCHEME_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        {session.allow_pause && (
          <button type="button" onClick={() => update((s, t) => (s.paused_at === null ? pause(s, t) : resume(s, t)))}>
            {paused ? 'Resume timer' : 'Pause timer'}
          </button>
        )}
      </div>

      <div className="sr-only" aria-live="polite" role="status" data-testid="timer-announcement">
        {announce}
      </div>
      {announce && (
        <p className="timer-banner" role="note">
          {announce}
        </p>
      )}

      <main className="exam-main" ref={mainRef} tabIndex={-1}>
        {paused ? (
          <section className="paused-panel" aria-label="Timer paused">
            <h2>Exam paused</h2>
            <p>The timer is stopped and the question is hidden. Resume to continue.</p>
          </section>
        ) : reviewing ? (
          <ReviewScreen data={data} session={session} onJump={go} onReturn={() => navigate('/exam/run')} onEnd={() => setDialog('end')} />
        ) : (
          <QuestionView
            key={qid}
            data={data}
            qid={qid}
            response={session.responses[qid] as Response}
            onChange={(r) => update((s, t) => setResponse(s, qid, r, t))}
          />
        )}
      </main>

      <nav className="exam-bottomnav" aria-label="Exam navigation">
        <div className="nav-left">
          <button type="button" onClick={() => setDialog('help')}>
            Help
          </button>
          <button type="button" className="danger" onClick={() => setDialog('end')}>
            End exam
          </button>
        </div>
        <div className="nav-right">
          <button type="button" onClick={() => navigate(reviewing ? '/exam/run' : '/exam/review')} disabled={paused} title="Alt+R" aria-pressed={reviewing}>
            Review screen
          </button>
          <button type="button" onClick={() => go(idx - 1)} disabled={paused || idx === 0} title="Alt+P">
            Previous
          </button>
          <button type="button" onClick={() => go(idx + 1)} disabled={paused || idx >= n - 1} title="Alt+N">
            Next
          </button>
        </div>
      </nav>

      {dialog === 'help' && (
        <Modal title="Help" onClose={() => setDialog(null)}>
          <div className="modal-body">
            <p>
              <strong>This is an independent practice tool, not the official AWS or Pearson VUE exam interface.</strong> The layout is
              similar (title bar, tool bar, bottom navigation) but it is not a copy.
            </p>
            <ul>
              <li>Choose one answer for a single-answer question and as many as the question says for multiple response. Extra selections are not blocked.</li>
              <li>Ordering and matching questions use one drop-down per step or row. A used option may be disabled elsewhere when the question says each option is used once.</li>
              <li>
                <strong>Flag for review</strong> marks a question; the <strong>Review screen</strong> lists answered, unanswered and flagged questions.
              </li>
              <li>Moving between questions never grades them. Nothing is checked until you end the exam or time runs out.</li>
              <li>Clicking an image opens an enlarged view (Esc closes it).</li>
              <li>Shortcuts: Alt+N next, Alt+P previous, Alt+F flag, Alt+R review screen.</li>
            </ul>
            <div className="action-row">
              <span>Text size:</span>
              <button type="button" onClick={() => setFont(-1)} aria-label="Smaller text" disabled={settings.font_step === 0}>
                A&minus;
              </button>
              <button type="button" onClick={() => setFont(1)} aria-label="Larger text" disabled={settings.font_step === 3}>
                A+
              </button>
            </div>
            <div className="action-row">
              <button type="button" className="primary" data-autofocus onClick={() => setDialog(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {dialog === 'end' && (
        <Modal title="End exam?" role="alertdialog" onClose={() => setDialog(null)}>
          <div className="modal-body">
            <p>
              You have <strong>{counts.unanswered}</strong> unanswered question{counts.unanswered === 1 ? '' : 's'}
              {counts.incomplete > 0 && (
                <>
                  , <strong>{counts.incomplete}</strong> incomplete ordering/matching answer{counts.incomplete === 1 ? '' : 's'}
                </>
              )}{' '}
              and <strong>{counts.flagged}</strong> flagged for review.
            </p>
            <p>After you end the exam you cannot change your answers.</p>
            <div className="action-row">
              <button type="button" className="primary" data-autofocus onClick={() => setDialog(null)}>
                Return to exam
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  const out = submitActive('user');
                  setDialog(null);
                  if (out) navigate(`/exam/results/${out.id}`);
                }}
              >
                End exam
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
