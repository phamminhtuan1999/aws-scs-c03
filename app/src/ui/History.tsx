import { fmtDate, fmtPercent } from '../data/derive';
import type { ExamSession } from '../session/types';
import { deleteTip, listSessions, studySlot, tipsSlot } from '../storage/slots';
import { formatDuration } from '../time/clock';
import { useData, useSlot } from './hooks';
import { BASIS_LABEL } from './exam/ExamStart';
import { kindLabel } from './exam/Results';
import { isWrong } from './stats';

interface Group {
  key: string;
  basis: ExamSession['basis'];
  version: string;
  exams: ExamSession[];
}

export function History() {
  const data = useData();
  const study = useSlot(studySlot);
  const sessions = listSessions()
    .filter((s) => s.status === 'submitted' && s.result)
    .sort((a, b) => (b.submitted_at ?? 0) - (a.submitted_at ?? 0));

  // Stats are aggregated only within the same grading basis AND research version.
  const groups = new Map<string, Group>();
  for (const s of sessions) {
    const key = `${s.basis}|${s.research_version}`;
    if (!groups.has(key)) groups.set(key, { key, basis: s.basis, version: s.research_version, exams: [] });
    groups.get(key)!.exams.push(s);
  }

  const studyMisses = Object.entries(study.attempts)
    .map(([qid, list]) => ({ qid, n: list.filter((a) => isWrong(a.result)).length, total: list.filter((a) => a.result !== 'ungradable').length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.qid.localeCompare(b.qid))
    .slice(0, 10);

  return (
    <div className="page">
      <h1>History &amp; stats</h1>
      {sessions.length === 0 ? (
        <p>No finished exams yet. <a href="#/exam">Start an exam simulation</a>.</p>
      ) : (
        <>
          <h2 className="h3">Finished exams</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Basis</th>
                  <th>Research version</th>
                  <th>Score</th>
                  <th>Duration used</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.submitted_at)}</td>
                    <td>{kindLabel(s)}</td>
                    <td>{BASIS_LABEL[s.basis]}</td>
                    <td>{s.research_version}</td>
                    <td>
                      {s.result!.correct} / {s.result!.scored} ({fmtPercent(s.result!.percent)})
                    </td>
                    <td>{formatDuration(s.result!.time_used_ms)}</td>
                    <td>
                      <a href={`#/exam/results/${s.id}`}>Open</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="h3">Statistics by grading basis and research version</h2>
          <p className="muted">Percentages are never combined across different bases or research versions.</p>
          {[...groups.values()].map((g) => {
            const scoredExams = g.exams.filter((e) => (e.result?.scored ?? 0) > 0);
            const totalC = scoredExams.reduce((n, e) => n + e.result!.correct, 0);
            const totalS = scoredExams.reduce((n, e) => n + e.result!.scored, 0);
            const miss = new Map<string, { missed: number; seen: number }>();
            for (const e of g.exams)
              for (const [qid, r] of Object.entries(e.result!.per_question)) {
                if (r === 'ungradable') continue;
                const m = miss.get(qid) ?? { missed: 0, seen: 0 };
                m.seen += 1;
                if (r !== 'correct') m.missed += 1;
                miss.set(qid, m);
              }
            const top = [...miss.entries()].filter(([, m]) => m.missed > 0).sort((a, b) => b[1].missed - a[1].missed || a[0].localeCompare(b[0])).slice(0, 10);
            return (
              <section key={g.key} className="stat-group" data-group={g.key}>
                <h3>
                  {BASIS_LABEL[g.basis]} &middot; research_version {g.version}
                </h3>
                <p>
                  {g.exams.length} exam{g.exams.length === 1 ? '' : 's'}; {totalC} / {totalS} correct in total
                  {totalS > 0 ? ` (${fmtPercent((totalC / totalS) * 100)})` : ''}; raw practice scores, not AWS scaled scores.
                </p>
                {top.length > 0 && (
                  <>
                    <h4>Most frequently missed</h4>
                    <ul>
                      {top.map(([qid, m]) => (
                        <li key={qid}>
                          {qid}: missed {m.missed} of {m.seen} time{m.seen === 1 ? '' : 's'} asked
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </>
      )}

      <h2 className="h3">Study and practice: most missed</h2>
      {studyMisses.length === 0 ? (
        <p className="muted">Nothing missed yet.</p>
      ) : (
        <ul>
          {studyMisses.map((x) => (
            <li key={x.qid}>
              <a href={`#/bank/${x.qid}`}>{x.qid}</a>: wrong {x.n} of {x.total} check{x.total === 1 ? '' : 's'} (against the key in use at the time, which may not be verified)
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">{data.allIds.length} questions in the bank.</p>
    </div>
  );
}

export function Tips() {
  const data = useData();
  const tips = useSlot(tipsSlot);
  const items = [...tips.items].sort((a, b) => b.created_at - a.created_at);
  return (
    <div className="page">
      <h1>Saved tips</h1>
      {items.length === 0 ? (
        <p>No saved tips yet. Use &ldquo;Save tip&rdquo; while studying a question.</p>
      ) : (
        <ul className="tip-list">
          {items.map((t) => (
            <li key={t.id} className="tip-item">
              <div className="tip-head">
                <a href={`#/bank/${t.qid}`}>{t.qid}</a>{' '}
                <span className="muted small">
                  {data.byId.has(t.qid) ? '' : '(unknown question) '}
                  {fmtDate(t.created_at)}
                </span>
              </div>
              <p className="tip-text">{t.text}</p>
              <button type="button" onClick={() => deleteTip(t.id)} aria-label={`Delete tip for ${t.qid}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
