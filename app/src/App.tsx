import { useEffect, useRef, useState } from 'react';
import { DataError, loadAppData, type AppData } from './data/loader';
import { navigate, useRoute, type Route } from './router';
import { expireIfDue } from './session/exam';
import { dismissNotice } from './storage/notices';
import { settingsSlot } from './storage/slots';
import { getClock } from './time/clock';
import { Bank, BankQuestion } from './ui/Bank';
import { Coverage, QuestionResearch } from './ui/Coverage';
import { DataTransfer } from './ui/DataTransfer';
import { CustomExam } from './ui/exam/CustomExam';
import { ExamRun } from './ui/exam/ExamRun';
import { ExamStart } from './ui/exam/ExamStart';
import { Results, ResultReview } from './ui/exam/Results';
import { commitActive, useActiveExam } from './ui/exam/active';
import { History, Tips } from './ui/History';
import { Home } from './ui/Home';
import { DataContext, useNotices, useNow, useSlot } from './ui/hooks';
import { Settings } from './ui/Settings';
import { PracticeHome, PracticeRunner, StudyRunner } from './ui/study/StudyRunner';
import { StudyPicker } from './ui/study/StudyPicker';
import { ZoomProvider } from './ui/ZoomDialog';

type Load = { status: 'loading' } | { status: 'error'; problems: string[] } | { status: 'ready'; data: AppData };

export function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  useEffect(() => {
    let off = false;
    loadAppData()
      .then((data) => !off && setLoad({ status: 'ready', data }))
      .catch((e: unknown) => {
        if (off) return;
        setLoad({ status: 'error', problems: e instanceof DataError ? e.problems : [String((e as Error)?.message ?? e)] });
      });
    return () => {
      off = true;
    };
  }, []);
  if (load.status === 'loading') return <p className="page" role="status">Loading questions…</p>;
  if (load.status === 'error') {
    return (
      <div className="page fatal" role="alert">
        <h1>The question data could not be loaded</h1>
        <p>The app cannot start because its data files are missing or invalid. Nothing has been changed on this device.</p>
        <ul>
          {load.problems.slice(0, 12).map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
        <p className="muted">Run &ldquo;npm run sync-data&rdquo; and rebuild, and open the app through the static server (not from a file://).</p>
      </div>
    );
  }
  return <AppShell data={load.data} />;
}

/** Everything after the data is loaded (also used directly by tests). */
export function AppShell({ data }: { data: AppData }) {
  const settings = useSlot(settingsSlot);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.font = String(settings.font_step);
    el.dataset.contrast = settings.high_contrast ? 'high' : 'normal';
    el.dataset.scheme = settings.color_scheme;
  }, [settings]);

  return (
    <DataContext.Provider value={data}>
      <ZoomProvider>
        <NoticeBanner />
        <ExamBoundary />
        <Routes />
      </ZoomProvider>
    </DataContext.Provider>
  );
}

function NoticeBanner() {
  const notices = useNotices();
  if (!notices.length) return null;
  return (
    <div className="notice-banner" role="status">
      {notices.map((n) => (
        <p key={n.id}>
          {n.message}{' '}
          <button type="button" onClick={() => dismissNotice(n.id)}>
            Dismiss
          </button>
        </p>
      ))}
    </div>
  );
}

/**
 * Watches the in-progress exam: an expired session (timeout while open, or found expired when the app is opened)
 * is graded exactly once and locked; the user is taken to the results.
 */
function ExamBoundary() {
  const active = useActiveExam();
  const now = useNow(1000, !!active);
  const route = useRoute();
  const first = useRef(true);
  const firstCheck = active ? active.id : null;
  useEffect(() => {
    if (!active) return;
    const t = getClock().now();
    const reason = first.current ? 'expired_on_load' : 'timeout';
    first.current = false;
    const out = commitActive((s) => expireIfDue(s, t, reason));
    if (out && out.status === 'submitted' && route.segments[1] !== 'results') navigate(`/exam/results/${out.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, firstCheck]);
  return null;
}

function ExamInProgress() {
  return (
    <div className="page exam-in-progress" role="region" aria-label="Exam in progress">
      <h1>Exam in progress</h1>
      <p>
        An exam is running, so the question bank, study mode, research and answers are not available until it ends. Your timer keeps running.
      </p>
      <button type="button" className="primary" onClick={() => navigate('/exam/run')}>
        Return to exam
      </button>
    </div>
  );
}

const NAV: [string, string][] = [
  ['/', 'Home'],
  ['/practice', 'Practice in order'],
  ['/exam', 'Exam'],
  ['/study', 'Study'],
  ['/bank', 'Bank'],
  ['/coverage', 'Research coverage'],
  ['/history', 'History'],
  ['/tips', 'Tips'],
  ['/settings', 'Settings'],
  ['/data', 'Export/Import'],
];

function TopNav({ route }: { route: Route }) {
  return (
    <header className="topnav">
      <a className="brand" href="#/">
        SCS-C03 Practice
      </a>
      <nav aria-label="Main">
        <ul>
          {NAV.map(([p, label]) => {
            const on = p === '/' ? route.path === '/' : route.path === p || route.path.startsWith(p + '/');
            return (
              <li key={p}>
                <a href={`#${p}`} aria-current={on ? 'page' : undefined}>
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}

function Routes() {
  const route = useRoute();
  const active = useActiveExam();
  const [a, b, c] = route.segments;

  if (active) {
    if (route.path === '/exam/run' || route.path === '/exam/review') return <ExamRun />;
    return <ExamInProgress />;
  }

  let page;
  if (!a) page = <Home />;
  else if (a === 'practice') page = b ? <PracticeRunner qid={b.toUpperCase()} /> : <PracticeHome />;
  else if (a === 'study') page = b === 'run' ? <StudyRunner /> : <StudyPicker />;
  else if (a === 'exam') {
    if (!b) page = <ExamStart />;
    else if (b === 'custom') page = <CustomExam />;
    else if (b === 'run' || b === 'review') page = <ExamRun />; // no active exam: ExamRun redirects
    else if (b === 'results' && c) page = route.segments[3] ? <ResultReview id={c} n={Number(route.segments[3])} /> : <Results id={c} />;
    else page = <NotFound />;
  } else if (a === 'bank') page = b ? <BankQuestion qid={b.toUpperCase()} /> : <Bank />;
  else if (a === 'coverage') page = b ? <QuestionResearch qid={b.toUpperCase()} /> : <Coverage />;
  else if (a === 'history') page = <History />;
  else if (a === 'tips') page = <Tips />;
  else if (a === 'settings') page = <Settings />;
  else if (a === 'data') page = <DataTransfer />;
  else page = <NotFound />;

  return (
    <>
      <TopNav route={route} />
      <div className="content">{page}</div>
    </>
  );
}

function NotFound() {
  return (
    <div className="page">
      <h1>Page not found</h1>
      <a href="#/">Go to the home page</a>
    </div>
  );
}
