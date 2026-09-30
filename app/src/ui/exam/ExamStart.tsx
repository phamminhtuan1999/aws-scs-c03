import { useMemo, useState } from 'react';
import { eligibleIds, type Basis } from '../../grading/engine';
import { navigate } from '../../router';
import { randomSeed } from '../../session/prng';
import { scaledMinutes } from '../../session/plan';
import { EXAM_NAME, STANDARD_MINUTES, STANDARD_QUESTIONS } from '../../version';
import { useData } from '../hooks';
import { startExam } from './start';

export const BASIS_LABEL: Record<Basis, string> = {
  research: 'By research',
  source: 'By source key — not guaranteed technically correct',
};

export function BasisSelector({ basis, onChange, pools }: { basis: Basis; onChange: (b: Basis) => void; pools: Record<Basis, number> }) {
  return (
    <fieldset>
      <legend>Grading basis</legend>
      <div className="radio-line">
        <label>
          <input type="radio" name="basis" checked={basis === 'research'} onChange={() => onChange('research')} /> {BASIS_LABEL.research}{' '}
          <span className="muted">(default) &mdash; only questions whose answer was verified by research are graded</span>
        </label>
        <div className="muted small indent">Eligible questions: {pools.research} of 143</div>
      </div>
      <div className="radio-line">
        <label>
          <input type="radio" name="basis" checked={basis === 'source'} onChange={() => onChange('source')} /> {BASIS_LABEL.source}
        </label>
        <div className="muted small indent">Eligible questions: {pools.source} of 143 (the unscorable Q008 is left out of the default draw)</div>
      </div>
      <p className="muted small">The two bases are never mixed in one exam.</p>
    </fieldset>
  );
}

export function ExamStart() {
  const data = useData();
  const [basis, setBasis] = useState<Basis>('research');
  const [seed, setSeed] = useState(() => randomSeed());
  const [error, setError] = useState<string | null>(null);

  const pools = useMemo(
    () => ({
      research: eligibleIds('research', data.allIds, data).length,
      source: eligibleIds('source', data.allIds, data).length,
    }),
    [data],
  );
  const pool = pools[basis];
  const short = pool < STANDARD_QUESTIONS;

  const start = (count: number, minutes: number, kind: 'standard' | 'shorter') => {
    try {
      startExam(data, { kind, basis, count, minutes, seed: seed.trim() || randomSeed(), includeUngradable: false, allowPause: false });
      navigate('/exam/run');
    } catch (e) {
      setError((e as Error).message);
    }
  };


  return (
    <div className="page">
      <h1>Exam simulation &mdash; {STANDARD_QUESTIONS} questions / {STANDARD_MINUTES} minutes</h1>
      <p className="muted">
        {EXAM_NAME}. A timed practice exam with your answers checked only at the end. The timer cannot be paused; closing the tab does
        not stop it.
      </p>

      <BasisSelector basis={basis} onChange={setBasis} pools={pools} />

      <div className="field">
        <label htmlFor="seed">Seed (same seed, same basis and same research data give the same questions)</label>
        <div className="inline-field">
          <input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value)} />
          <button type="button" onClick={() => setSeed(randomSeed())}>
            New random seed
          </button>
        </div>
      </div>

      {short ? (
        <section className="warn-box" role="region" aria-label="Not enough eligible questions">
          <p>
            <strong>
              Only {pool} question{pool === 1 ? '' : 's'} can be graded {basis === 'research' ? 'by research' : 'on this basis'} right now
            </strong>{' '}
            ({STANDARD_QUESTIONS} are needed for the standard exam).
            {basis === 'research' && ' Research is still in progress; questions without a verified conclusion are never graded silently with the source key.'}
          </p>
          <div className="action-row">
            {pool > 0 && (
              <button type="button" className="primary" onClick={() => start(pool, scaledMinutes(pool), 'shorter')}>
                Take a shorter exam ({pool} question{pool === 1 ? '' : 's'})
              </button>
            )}
            {basis === 'research' && (
              <button type="button" onClick={() => setBasis('source')}>
                Switch to {BASIS_LABEL.source}
              </button>
            )}
          </div>
          {pool > 0 && (
            <p className="muted small">
              A shorter exam is a practice configuration: {pool} questions in {scaledMinutes(pool)} minutes (scaled from {STANDARD_MINUTES} minutes).
            </p>
          )}
        </section>
      ) : (
        <div className="action-row">
          <button type="button" className="primary" onClick={() => start(STANDARD_QUESTIONS, STANDARD_MINUTES, 'standard')}>
            Start exam ({STANDARD_QUESTIONS} questions, {STANDARD_MINUTES} minutes)
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <p className="muted small">
        Raw practice score &mdash; not an AWS scaled score; it does not predict a pass. Need different settings? Use{' '}
        <a href="#/exam/custom">Custom exam</a>.
      </p>
    </div>
  );
}
