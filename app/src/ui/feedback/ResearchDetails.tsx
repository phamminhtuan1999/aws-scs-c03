import type { ReactNode } from 'react';
import { describeInline, fmtDate, unitLabel } from '../../data/derive';
import type { AppData } from '../../data/loader';
import type { Reference } from '../../data/schema';

export function SafeLink({ url, children }: { url: string; children: ReactNode }) {
  // only http(s) URLs become links; anything else stays inert text
  if (/^https?:\/\//i.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <span>{children}</span>;
}

function RefItem({ r }: { r: Reference }) {
  return (
    <li className="ref-item" data-ref-id={r.id}>
      <div>
        <strong>{r.id}</strong> <SafeLink url={r.url}>{r.title}</SafeLink>
        {r.kind && <span className="badge badge-info">{r.kind === 'direct' ? 'direct evidence' : r.kind === 'inference' ? 'inference' : r.kind}</span>}
      </div>
      {r.section && <div className="muted">Section: {r.section}</div>}
      {r.quote && <blockquote className="quote">{r.quote}</blockquote>}
      {r.supports && <div className="muted">Supports: {r.supports}</div>}
      <div className="muted">
        {r.accessed_at && <>Accessed: {r.accessed_at}. </>}
        {r.page_last_updated ? <>Page last updated: {r.page_last_updated}.</> : <>Page date: not stated on the page.</>}
        <span className="url-text"> {r.url}</span>
      </div>
    </li>
  );
}

/** Full research record for one question (collapsed "Research details" in study, open on the coverage page). */
export function ResearchRecord({ data, qid }: { data: AppData; qid: string }) {
  const rv = data.reviews[qid];
  const units = rv.option_reviews;
  const indep = rv.independent_verdict;
  return (
    <div className="research-record">
      <dl className="kv">
        <dt>Status</dt>
        <dd>{rv.status}</dd>
        <dt>Research version</dt>
        <dd>{rv.research_version ?? data.research_version}</dd>
        <dt>Confidence</dt>
        <dd>
          {rv.confidence ? (
            <>
              {rv.confidence.level}
              {rv.confidence.reason_vi ? ` — ${rv.confidence.reason_vi}` : ''}
            </>
          ) : (
            'n/a'
          )}
        </dd>
        {rv.confidence?.open_issues && rv.confidence.open_issues.length > 0 && (
          <>
            <dt>Open issues</dt>
            <dd>
              <ul>
                {rv.confidence.open_issues.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </dd>
          </>
        )}
        <dt>Researched</dt>
        <dd>{fmtDate(rv.researched_at) || 'n/a'}</dd>
        <dt>Last reviewed</dt>
        <dd>{fmtDate(rv.last_reviewed_at) || 'n/a'}</dd>
        <dt>Comparison with source key</dt>
        <dd>
          {rv.comparison ?? 'n/a'}
          {rv.differs_from_source ? ' (differs from the source key)' : ''}
        </dd>
      </dl>

      {rv.requirements.length > 0 && (
        <section>
          <h4>Requirements extracted from the question</h4>
          <ul>
            {rv.requirements.map((r) => (
              <li key={r.id}>
                <strong>{r.id}</strong> {r.kind ? `(${r.kind}) ` : ''}
                {r.text_vi}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4>
          Per-option reviews ({units.length} of {data.units[qid]?.length ?? 0} units)
        </h4>
        {units.length === 0 ? (
          <p className="muted">No option reviews yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Verdict</th>
                  <th>Evidence</th>
                  <th>Reason</th>
                  <th>Refs</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => {
                  const l = unitLabel(data, qid, u.unit_id);
                  return (
                    <tr key={u.unit_id}>
                      <td>
                        <strong>{l.label}</strong>
                        <div className="muted small">{l.text}</div>
                      </td>
                      <td>{u.verdict}</td>
                      <td>{u.evidence_kind ?? ''}</td>
                      <td>{u.reason_vi}</td>
                      <td>{(u.reference_ids ?? []).join(', ')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h4>References and evidence ({rv.references.length})</h4>
        {rv.references.length === 0 ? (
          <p className="muted">No references yet.</p>
        ) : (
          <ul className="ref-list">
            {rv.references.map((r) => (
              <RefItem key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>

      {indep && (
        <section>
          <h4>Independent (blind) verdict vs final</h4>
          <dl className="kv">
            <dt>Blind verdict</dt>
            <dd>
              {indep.answer ? describeInline(data, qid, indep.answer) : 'no answer'}
              {indep.proposed_status ? ` (proposed status: ${indep.proposed_status})` : ''}
              {indep.recorded_at ? ` — recorded ${fmtDate(indep.recorded_at)}` : ''}
            </dd>
            <dt>Final researched answer</dt>
            <dd>{rv.researched_answer ? describeInline(data, qid, rv.researched_answer) : 'no answer'}</dd>
          </dl>
          {rv.reconciliation_vi && <p>{rv.reconciliation_vi}</p>}
        </section>
      )}

      {rv.image_transcriptions.length > 0 && (
        <section>
          <h4>Image transcriptions (research)</h4>
          <ul>
            {rv.image_transcriptions.map((t, i) => {
              const o = (t ?? {}) as { image?: string; text?: string; notes_vi?: string };
              return (
                <li key={i}>
                  <div className="muted">{o.image}</div>
                  <pre className="transcription">{o.text}</pre>
                  {o.notes_vi && <div className="muted">{o.notes_vi}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {rv.source_issues.length > 0 && (
        <section>
          <h4>Source issues</h4>
          <ul>
            {rv.source_issues.map((s, i) => (
              <li key={i}>
                <strong>{s.type}</strong> {s.location ? `(${s.location}) ` : ''}
                {s.detail_vi}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rv.history.length > 0 && (
        <section>
          <h4>History</h4>
          <ul>
            {rv.history.map((h, i) => (
              <li key={i}>
                {h.version} {h.date ? `— ${h.date}` : ''}: {h.change}
                {h.previous_answer ? ` (previous answer: ${describeInline(data, qid, h.previous_answer)})` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function ResearchDetails({ data, qid }: { data: AppData; qid: string }) {
  return (
    <details className="research-details">
      <summary>Research details</summary>
      <ResearchRecord data={data} qid={qid} />
    </details>
  );
}
