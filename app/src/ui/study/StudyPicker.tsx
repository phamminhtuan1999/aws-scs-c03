import { useMemo, useState } from 'react';
import { NOT_CLASSIFIED, buildTagIndex, parseIdList } from '../../data/derive';
import { navigate } from '../../router';
import { randomSeed, seededShuffle } from '../../session/prng';
import { bookmarksSlot, studySlot } from '../../storage/slots';
import { writeSlot } from '../../storage/store';
import { useData, useSlot } from '../hooks';
import { buildActivity, isWrong } from '../stats';
import { listSessions } from '../../storage/slots';

type Scope = 'all' | 'ids' | 'domain' | 'service' | 'wrong' | 'flagged' | 'unattempted';

export function StudyPicker() {
  const data = useData();
  const study = useSlot(studySlot);
  const marks = useSlot(bookmarksSlot);
  const tags = useMemo(() => buildTagIndex(data), [data]);
  const [scope, setScope] = useState<Scope>('all');
  const [idsText, setIdsText] = useState('');
  const [domain, setDomain] = useState('');
  const [service, setService] = useState('');
  const [order, setOrder] = useState<'original' | 'shuffled'>('original');
  const [seed, setSeed] = useState(() => randomSeed());

  const domains = [...tags.domains.keys()].sort();
  const services = [...tags.services.keys()].sort();
  const activity = useMemo(() => buildActivity(study.attempts, listSessions()), [study.attempts]);

  const { ids, label, problem } = useMemo(() => {
    let ids: string[] = data.allIds;
    let label = 'All questions';
    let problem: string | null = null;
    switch (scope) {
      case 'ids': {
        const r = parseIdList(idsText, data);
        ids = r.ids;
        label = `IDs: ${idsText.trim() || '(none)'}`;
        if (r.invalid.length) problem = `Not recognised: ${r.invalid.join(', ')}`;
        break;
      }
      case 'domain': {
        ids = domain === NOT_CLASSIFIED ? tags.unclassified : (tags.domains.get(domain) ?? []);
        label = `Domain: ${domain || '(choose)'}`;
        break;
      }
      case 'service': {
        ids = service === NOT_CLASSIFIED ? tags.unclassified : (tags.services.get(service) ?? []);
        label = `Service: ${service || '(choose)'}`;
        break;
      }
      case 'wrong':
        ids = data.allIds.filter((id) => isWrong(activity.get(id)?.lastResult ?? null));
        label = 'Wrong last time';
        break;
      case 'flagged':
        ids = data.allIds.filter((id) => marks.flagged.includes(id) || marks.bookmarked.includes(id));
        label = 'Flagged / bookmarked';
        break;
      case 'unattempted':
        ids = data.allIds.filter((id) => !activity.get(id)?.attempted);
        label = 'Not attempted yet';
        break;
      default:
        break;
    }
    return { ids, label, problem };
  }, [scope, idsText, domain, service, data, tags, activity, marks]);

  const start = () => {
    const ordered = order === 'shuffled' ? seededShuffle(ids, seed) : ids;
    writeSlot(studySlot, {
      ...study,
      current: { ids: ordered, index: 0, label: order === 'shuffled' ? `${label} (shuffled, seed ${seed})` : label, seed: order === 'shuffled' ? seed : null, order },
    });
    navigate('/study/run');
  };

  return (
    <div className="page">
      <h1>Study (custom set)</h1>
      <p className="muted">
        Pick a set of questions. Answer options always keep their original order. Nothing about the answer is shown until you press
        &ldquo;Check answer&rdquo;.
      </p>

      {study.current && (
        <p className="resume-box">
          Current set: <strong>{study.current.label}</strong> &mdash; question {Math.min(study.current.index + 1, study.current.ids.length)} of{' '}
          {study.current.ids.length}.{' '}
          <button type="button" onClick={() => navigate('/study/run')}>
            Continue this set
          </button>
        </p>
      )}

      <fieldset>
        <legend>Which questions?</legend>
        {(
          [
            ['all', 'All questions'],
            ['ids', 'Question IDs or ranges (e.g. Q001-Q020, Q045)'],
            ['domain', 'By domain (from research tags)'],
            ['service', 'By AWS service (from research tags)'],
            ['wrong', 'Wrong last time'],
            ['flagged', 'Flagged / bookmarked'],
            ['unattempted', 'Not attempted yet'],
          ] as [Scope, string][]
        ).map(([v, l]) => (
          <div key={v} className="radio-line">
            <label>
              <input type="radio" name="scope" value={v} checked={scope === v} onChange={() => setScope(v)} /> {l}
            </label>
          </div>
        ))}
        {scope === 'ids' && (
          <div className="field">
            <label htmlFor="ids">Question IDs</label>
            <input id="ids" type="text" value={idsText} onChange={(e) => setIdsText(e.target.value)} placeholder="Q001-Q020, Q045" />
            {problem && <p role="alert" className="error-text">{problem}</p>}
          </div>
        )}
        {scope === 'domain' && (
          <div className="field">
            <label htmlFor="domain">Domain</label>
            <select id="domain" value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="">Choose a domain…</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d} ({tags.domains.get(d)!.length})
                </option>
              ))}
              <option value={NOT_CLASSIFIED}>
                {NOT_CLASSIFIED} ({tags.unclassified.length})
              </option>
            </select>
            {domains.length === 0 && <p className="muted">No domain tags exist yet (research is still pending). Every question is listed as &ldquo;{NOT_CLASSIFIED}&rdquo;.</p>}
          </div>
        )}
        {scope === 'service' && (
          <div className="field">
            <label htmlFor="service">Service</label>
            <select id="service" value={service} onChange={(e) => setService(e.target.value)}>
              <option value="">Choose a service…</option>
              {services.map((d) => (
                <option key={d} value={d}>
                  {d} ({tags.services.get(d)!.length})
                </option>
              ))}
              <option value={NOT_CLASSIFIED}>
                {NOT_CLASSIFIED} ({tags.unclassified.length})
              </option>
            </select>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Order</legend>
        <div className="radio-line">
          <label>
            <input type="radio" name="order" checked={order === 'original'} onChange={() => setOrder('original')} /> Original order
          </label>
        </div>
        <div className="radio-line">
          <label>
            <input type="radio" name="order" checked={order === 'shuffled'} onChange={() => setOrder('shuffled')} /> Shuffled (seeded; options are never shuffled)
          </label>
        </div>
        {order === 'shuffled' && (
          <div className="field">
            <label htmlFor="seed">Seed</label>
            <input id="seed" type="text" value={seed} onChange={(e) => setSeed(e.target.value)} />
          </div>
        )}
      </fieldset>

      <p aria-live="polite">
        <strong>{ids.length}</strong> question{ids.length === 1 ? '' : 's'} in this set.
      </p>
      <button type="button" className="primary" onClick={start} disabled={ids.length === 0}>
        Start studying
      </button>
    </div>
  );
}
