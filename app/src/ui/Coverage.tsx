import { STATUS_LABEL, TYPE_LABEL, describeInline } from '../data/derive';
import type { AppData } from '../data/loader';
import { STATUSES } from '../data/schema';
import { ExplanationPanel } from './feedback/ExplanationPanel';
import { ResearchRecord } from './feedback/ResearchDetails';
import { useData } from './hooks';
import { StatusBadge } from './Bank';
import { QuestionView } from './question/QuestionView';

export function unitsReviewed(data: AppData, qid: string): number {
  const valid = new Set(data.units[qid].map((u) => u.id));
  return new Set(data.reviews[qid].option_reviews.map((o) => o.unit_id).filter((id) => valid.has(id))).size;
}

export function coverageTotals(data: AppData) {
  const byStatus: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  let gradable = 0;
  let differs = 0;
  let units = 0;
  for (const id of data.allIds) {
    const r = data.reviews[id];
    byStatus[r.status] += 1;
    if (r.gradable_by_research) gradable += 1;
    if (r.differs_from_source) differs += 1;
    units += unitsReviewed(data, id);
  }
  return { byStatus, gradable, differs, units, totalUnits: data.totalUnits };
}

export function Coverage() {
  const data = useData();
  const t = coverageTotals(data);
  return (
    <div className="page">
      <h1>Research coverage</h1>
      <p className="muted">
        Research version <strong>{data.research_version}</strong>
        {data.research_generated_at ? `, generated ${data.research_generated_at}` : ''}. &ldquo;Pending&rdquo; means not researched yet; it is never shown as verified.
        Counts are reported per status and are never added up into &ldquo;143 correct answers&rdquo;.
      </p>

      <section aria-label="Totals">
        <ul className="stat-grid">
          {STATUSES.map((s) => (
            <li key={s} data-status={s}>
              <span className="stat-num">{t.byStatus[s]}</span>
              <span className="stat-label">{STATUS_LABEL[s]}</span>
            </li>
          ))}
        </ul>
        <dl className="kv">
          <dt>Gradable by research</dt>
          <dd data-testid="gradable-count">{t.gradable}</dd>
          <dt>Differs from the source key</dt>
          <dd data-testid="differs-count">{t.differs}</dd>
          <dt>Units reviewed</dt>
          <dd data-testid="units-count">
            {t.units} / {t.totalUnits}
          </dd>
        </dl>
      </section>

      {data.reviewIssues.length > 0 && (
        <section className="warn-box" role="alert">
          <h2 className="h3">Research records that could not be read ({data.reviewIssues.length})</h2>
          <p>These were treated as pending:</p>
          <ul>
            {data.reviewIssues.map((i, k) => (
              <li key={k}>
                {i.qid}: {i.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Type</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Differs from source key</th>
              <th>Units reviewed</th>
            </tr>
          </thead>
          <tbody>
            {data.questions.map((q) => {
              const r = data.reviews[q.id];
              return (
                <tr key={q.id}>
                  <td>
                    <a href={`#/coverage/${q.id}`}>{q.id}</a>
                  </td>
                  <td>{TYPE_LABEL[q.type]}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.confidence?.level ?? '–'}</td>
                  <td>{r.status === 'pending' ? '–' : r.differs_from_source ? 'yes' : 'no'}</td>
                  <td>
                    {unitsReviewed(data, q.id)} / {data.units[q.id].length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function QuestionResearch({ qid }: { qid: string }) {
  const data = useData();
  const q = data.byId.get(qid);
  if (!q) {
    return (
      <div className="page">
        <p role="alert">Unknown question &ldquo;{qid}&rdquo;.</p>
        <a href="#/coverage">Back to coverage</a>
      </div>
    );
  }
  const r = data.reviews[qid];
  const sk = data.keys[qid];
  return (
    <div className="page">
      <p className="crumbs">
        <a href="#/coverage">&larr; Research coverage</a> &middot; <a href={`#/bank/${qid}`}>Open in study view</a>
      </p>
      <h1>
        Research record: {qid} <StatusBadge status={r.status} />
      </h1>
      <p className="muted">
        {TYPE_LABEL[q.type]} &middot; {unitsReviewed(data, qid)} / {data.units[qid].length} units reviewed
      </p>

      <section className="info-box">
        <h2 className="h3">Answers</h2>
        <p>
          <strong>Source key (not technically verified):</strong> {describeInline(data, qid, sk.choice_ids ?? sk.sequence ?? sk.pairs)}
          {!sk.gradable && sk.ungradable_reason ? ` — not scorable: ${sk.ungradable_reason}` : ''}
        </p>
        <p>
          <strong>Researched answer:</strong> {r.researched_answer ? describeInline(data, qid, r.researched_answer) : r.status === 'pending' ? 'Research pending' : 'no answer is supported strongly enough'}
          {r.differs_from_source ? ' (differs from the source key)' : ''}
        </p>
      </section>

      <details className="research-details">
        <summary>Question text</summary>
        <QuestionView data={data} qid={qid} response={null} disabled hideClear />
      </details>

      <ExplanationPanel data={data} qid={qid} />
      <h2 className="h3">Research details</h2>
      <ResearchRecord data={data} qid={qid} />
    </div>
  );
}
