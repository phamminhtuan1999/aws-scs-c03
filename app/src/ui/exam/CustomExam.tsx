import { useMemo, useState } from 'react';
import { eligibleIds, type Basis } from '../../grading/engine';
import { navigate } from '../../router';
import { planExam } from '../../session/plan';
import { randomSeed } from '../../session/prng';
import { useData } from '../hooks';
import { BASIS_LABEL, BasisSelector } from './ExamStart';
import { startExam } from './start';

export function CustomExam() {
  const data = useData();
  const [basis, setBasis] = useState<Basis>('research');
  const [count, setCount] = useState(20);
  const [minutes, setMinutes] = useState(30);
  const [includeUngradable, setIncludeUngradable] = useState(false);
  const [allowPause, setAllowPause] = useState(false);
  const [seed, setSeed] = useState(() => randomSeed());
  const [error, setError] = useState<string | null>(null);

  const pools = useMemo(
    () => ({
      research: eligibleIds('research', data.allIds, data).length,
      source: eligibleIds('source', data.allIds, data).length,
    }),
    [data],
  );
  const poolSize = includeUngradable ? data.allIds.length : pools[basis];
  const countOk = Number.isInteger(count) && count >= 1 && count <= poolSize;
  const minutesOk = Number.isFinite(minutes) && minutes >= 1 && minutes <= 600;

  const plan = useMemo(
    () => (countOk ? planExam(data.allIds, data, { basis, count, seed: seed.trim() || 'seed', includeUngradable }) : null),
    [countOk, data, basis, count, seed, includeUngradable],
  );

  const start = () => {
    if (!countOk || !minutesOk) return;
    try {
      startExam(data, { kind: 'custom', basis, count, minutes, seed: seed.trim() || randomSeed(), includeUngradable, allowPause });
      navigate('/exam/run');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="page">
      <h1>Custom exam</h1>
      <p>
        <span className="badge badge-info">Practice configuration</span>{' '}
        <span className="muted">Not the standard 65 questions / 170 minutes. Use the Exam simulation card for that.</span>
      </p>

      <BasisSelector basis={basis} onChange={setBasis} pools={pools} />

      <div className="field-grid">
        <div className="field">
          <label htmlFor="count">Number of questions (1 to {poolSize})</label>
          <input id="count" type="number" min={1} max={poolSize} value={Number.isNaN(count) ? '' : count} onChange={(e) => setCount(e.target.valueAsNumber)} />
        </div>
        <div className="field">
          <label htmlFor="minutes">Duration in minutes (1 to 600)</label>
          <input id="minutes" type="number" min={1} max={600} value={Number.isNaN(minutes) ? '' : minutes} onChange={(e) => setMinutes(e.target.valueAsNumber)} />
        </div>
        <div className="field">
          <label htmlFor="seed">Seed</label>
          <div className="inline-field">
            <input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value)} />
            <button type="button" onClick={() => setSeed(randomSeed())}>
              New random seed
            </button>
          </div>
        </div>
      </div>

      <div className="radio-line">
        <label>
          <input type="checkbox" checked={includeUngradable} onChange={(e) => setIncludeUngradable(e.target.checked)} /> Include not-scorable questions (shown, not scored)
        </label>
      </div>
      <div className="radio-line">
        <label>
          <input type="checkbox" checked={allowPause} onChange={(e) => setAllowPause(e.target.checked)} /> Allow pausing the timer{' '}
          <span className="muted">(Practice configuration &mdash; pause enabled)</span>
        </label>
      </div>

      {plan && (
        <section className="info-box" aria-live="polite">
          <h2 className="h3">Scoring for this draw</h2>
          <p>
            Graded {basis === 'research' ? 'by research' : 'by source key'}: {plan.ids.length - plan.unscored.length} of {plan.ids.length} questions will be scored.
          </p>
          {includeUngradable ? (
            plan.unscored.length > 0 ? (
              <p>
                These {plan.unscored.length} question{plan.unscored.length === 1 ? '' : 's'} will be shown but <strong>not scored</strong> and are excluded from the
                denominator: <span className="id-list">{[...plan.unscored].sort().join(', ')}</span>.
              </p>
            ) : (
              <p>No question in this draw is unscorable; every question will be scored.</p>
            )
          ) : (
            <p className="muted">Questions that cannot be scored on this basis are left out of the draw.</p>
          )}
          {basis === 'research' && plan.ids.length - plan.unscored.length === 0 && (
            <p className="error-text">Nothing in this draw can be scored by research yet. Switch the basis to {BASIS_LABEL.source} or wait for research.</p>
          )}
        </section>
      )}

      <div className="action-row">
        <button type="button" className="primary" onClick={start} disabled={!countOk || !minutesOk || !plan || plan.ids.length === 0}>
          Start custom exam
        </button>
      </div>
      {!countOk && <p role="alert" className="error-text">Enter a whole number of questions between 1 and {poolSize}.</p>}
      {!minutesOk && <p role="alert" className="error-text">Enter a duration between 1 and 600 minutes.</p>}
      {error && <p role="alert" className="error-text">{error}</p>}
    </div>
  );
}
