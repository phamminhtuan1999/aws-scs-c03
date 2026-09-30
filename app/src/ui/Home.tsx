import { useData, useSlot } from './hooks';
import { practiceSlot, studySlot } from '../storage/slots';
import { STANDARD_MINUTES, STANDARD_QUESTIONS } from '../version';

export function Home() {
  const data = useData();
  const practice = useSlot(practiceSlot);
  const study = useSlot(studySlot);
  const checked = data.allIds.filter((id) => (study.attempts[id] ?? []).some((a) => a.source === 'practice')).length;
  const total = data.allIds.length;

  return (
    <div className="page home">
      <h1>SCS-C03 practice trainer</h1>
      <p className="identity">Independent practice tool &mdash; not affiliated with, endorsed by, or a copy of AWS or Pearson VUE.</p>

      <ul className="entry-cards">
        <li>
          <a className="entry-card" href="#/practice">
            <span className="entry-title">Practice in order (Q001 &rarr; Q{String(total).padStart(3, '0')})</span>
            <span className="entry-text">
              Go through every question in its original order.{' '}
              {practice.position ? `Resume at ${practice.position}. ` : ''}
              {checked} / {total} checked.
            </span>
          </a>
        </li>
        <li>
          <a className="entry-card" href="#/exam">
            <span className="entry-title">
              Exam simulation ({STANDARD_QUESTIONS} questions / {STANDARD_MINUTES} minutes)
            </span>
            <span className="entry-text">A timed exam. Answers are checked only at the end; raw score on the basis you choose.</span>
          </a>
        </li>
        <li>
          <a className="entry-card" href="#/study">
            <span className="entry-title">Study (custom set)</span>
            <span className="entry-text">Pick a set (IDs, domain, service, wrong, flagged, not attempted), check each answer, read the explanation.</span>
          </a>
        </li>
        <li>
          <a className="entry-card" href="#/exam/custom">
            <span className="entry-title">Custom exam</span>
            <span className="entry-text">Your own number of questions and duration. Labelled as a practice configuration.</span>
          </a>
        </li>
      </ul>

      <nav aria-label="More" className="more-links">
        <a href="#/bank">Question bank</a>
        <a href="#/coverage">Research coverage</a>
        <a href="#/history">History &amp; stats</a>
        <a href="#/tips">Saved tips</a>
        <a href="#/settings">Settings</a>
        <a href="#/data">Export / Import</a>
      </nav>
      <p className="muted small">
        Research status: {data.research_version}. Questions without a verified conclusion are shown with the source key only and are marked as not verified.
      </p>
    </div>
  );
}
