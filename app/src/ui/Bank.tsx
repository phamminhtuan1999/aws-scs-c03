import { useMemo, useState } from 'react';
import { NOT_CLASSIFIED, STATUS_LABEL, TYPE_LABEL, blockText, buildTagIndex, searchText } from '../data/derive';
import { STATUSES, QTYPES } from '../data/schema';
import { navigate } from '../router';
import { bookmarksSlot, listSessions, studySlot } from '../storage/slots';
import { useData, useSlot } from './hooks';
import { StudyQuestion } from './study/StudyQuestion';
import { buildActivity, isWrong } from './stats';

export function StatusBadge({ status }: { status: string }) {
  const tone = status === 'verified' ? 'good' : status === 'pending' ? 'muted' : 'warn';
  return <span className={`badge badge-${tone}`}>{status}</span>;
}

type ActivityFilter = 'all' | 'wrong' | 'unattempted' | 'bookmarked' | 'flagged';

export function Bank() {
  const data = useData();
  const study = useSlot(studySlot);
  const marks = useSlot(bookmarksSlot);
  const tags = useMemo(() => buildTagIndex(data), [data]);
  const activity = useMemo(() => buildActivity(study.attempts, listSessions()), [study.attempts]);
  const [text, setText] = useState('');
  const [type, setType] = useState('');
  const [domain, setDomain] = useState('');
  const [service, setService] = useState('');
  const [status, setStatus] = useState('');
  const [act, setAct] = useState<ActivityFilter>('all');

  const rows = useMemo(() => {
    const t = text.trim().toLowerCase();
    const idMatch = /^q?0*(\d{1,3})$/.exec(t);
    return data.questions.filter((q) => {
      if (t) {
        if (idMatch) {
          if (q.id !== `Q${idMatch[1].padStart(3, '0')}` && !searchText(data, q).includes(t)) return false;
        } else if (!searchText(data, q).includes(t)) return false;
      }
      if (type && q.type !== type) return false;
      if (status && data.reviews[q.id].status !== status) return false;
      if (domain) {
        const list = domain === NOT_CLASSIFIED ? tags.unclassified : (tags.domains.get(domain) ?? []);
        if (!list.includes(q.id)) return false;
      }
      if (service) {
        const list = service === NOT_CLASSIFIED ? tags.unclassified : (tags.services.get(service) ?? []);
        if (!list.includes(q.id)) return false;
      }
      const a = activity.get(q.id);
      if (act === 'wrong' && !isWrong(a?.lastResult ?? null)) return false;
      if (act === 'unattempted' && a?.attempted) return false;
      if (act === 'bookmarked' && !marks.bookmarked.includes(q.id)) return false;
      if (act === 'flagged' && !marks.flagged.includes(q.id)) return false;
      return true;
    });
  }, [data, text, type, domain, service, status, act, activity, marks, tags]);

  return (
    <div className="page">
      <h1>Question bank</h1>
      <p className="muted">Opening a question starts a study view: the answer and explanation appear only after you press &ldquo;Check answer&rdquo;.</p>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field">
          <label htmlFor="q">Search by Qxxx or text</label>
          <input id="q" type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Q042 or words from the question" />
        </div>
        <div className="field">
          <label htmlFor="ftype">Type</label>
          <select id="ftype" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {QTYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fdomain">Domain</label>
          <select id="fdomain" value={domain} onChange={(e) => setDomain(e.target.value)}>
            <option value="">All domains</option>
            {[...tags.domains.keys()].sort().map((d) => (
              <option key={d}>{d}</option>
            ))}
            <option value={NOT_CLASSIFIED}>{NOT_CLASSIFIED}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fservice">Service</label>
          <select id="fservice" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">All services</option>
            {[...tags.services.keys()].sort().map((d) => (
              <option key={d}>{d}</option>
            ))}
            <option value={NOT_CLASSIFIED}>{NOT_CLASSIFIED}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fstatus">Research status</label>
          <select id="fstatus" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="fact">My progress</label>
          <select id="fact" value={act} onChange={(e) => setAct(e.target.value as ActivityFilter)}>
            <option value="all">All</option>
            <option value="wrong">Wrong last time</option>
            <option value="unattempted">Not attempted</option>
            <option value="bookmarked">Bookmarked</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </form>
      <p aria-live="polite" data-testid="bank-count">
        {rows.length} of {data.questions.length} questions
      </p>
      <div className="table-scroll">
        <table className="data-table bank-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Question</th>
              <th>Research</th>
              <th>My progress</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((q) => {
              const a = activity.get(q.id);
              const snippet = blockText(q.stem).slice(0, 140);
              return (
                <tr key={q.id}>
                  <td className="bank-id">
                    <a href={`#/bank/${q.id}`}>{q.id}</a>
                  </td>
                  <td className="bank-type">{TYPE_LABEL[q.type]}</td>
                  <td className="snippet">{snippet}{blockText(q.stem).length > 140 ? '…' : ''}</td>
                  <td className="bank-status">
                    <StatusBadge status={data.reviews[q.id].status} />
                  </td>
                  <td className="bank-progress">
                    {a?.attempted ? (a.lastResult ? (isWrong(a.lastResult) ? 'wrong last time' : 'correct last time') : 'attempted') : 'not attempted'}
                    {marks.bookmarked.includes(q.id) ? ' · bookmarked' : ''}
                    {marks.flagged.includes(q.id) ? ' · flagged' : ''}
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

export function BankQuestion({ qid }: { qid: string }) {
  const data = useData();
  const idx = data.allIds.indexOf(qid);
  if (idx < 0) {
    return (
      <div className="page">
        <p role="alert">Unknown question &ldquo;{qid}&rdquo;.</p>
        <a href="#/bank">Back to the bank</a>
      </div>
    );
  }
  const prev = data.allIds[idx - 1];
  const next = data.allIds[idx + 1];
  return (
    <div className="page">
      <p className="crumbs">
        <a href="#/bank">&larr; Question bank</a>
      </p>
      <StudyQuestion
        key={qid}
        qid={qid}
        source="study"
        nav={
          <span className="nav-group">
            <button type="button" disabled={!prev} onClick={() => navigate(`/bank/${prev}`)}>
              Previous
            </button>
            <button type="button" disabled={!next} onClick={() => navigate(`/bank/${next}`)}>
              Next
            </button>
          </span>
        }
      />
    </div>
  );
}
