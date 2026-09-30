import { useId } from 'react';
import type { MatchingHotspot } from '../../data/schema';

export interface MatchingControlProps {
  hotspot: MatchingHotspot;
  value: Record<string, string | null> | undefined;
  onChange?: (v: Record<string, string | null>) => void;
  disabled?: boolean;
  annotations?: Record<string, { text: string; tone: 'good' | 'bad' | 'info' }[]>;
}

/** Matching answer control: one row per prompt, a <select> of responses. Reuse follows the source rule (hotspot.reuse). */
export function MatchingControl({ hotspot, value, onChange, disabled, annotations }: MatchingControlProps) {
  const uid = useId();
  const cur = (pid: string): string | null => value?.[pid] ?? null;

  const choose = (pid: string, rid: string) => {
    const next: Record<string, string | null> = {};
    for (const p of hotspot.prompts) next[p.id] = cur(p.id);
    next[pid] = rid || null;
    onChange?.(next);
  };

  return (
    <div className="matching" data-control="matching">
      <p className="control-note">
        Choose a response for each row. Row labels are added by this practice tool.
        {!hotspot.reuse && ' An option already used in another row is disabled there.'}
      </p>
      <ol className="match-list">
        {hotspot.prompts.map((p, i) => {
          const selId = `${uid}-row-${i}`;
          const chosen = cur(p.id);
          const resp = hotspot.responses.find((r) => r.id === chosen);
          const notes = annotations?.[p.id] ?? [];
          return (
            <li key={p.id} className="match-row" data-row={i + 1}>
              <div className="match-prompt">
                <span className="row-label">Row {i + 1}</span>
                <label htmlFor={selId} className="match-prompt-text">
                  {p.text}
                </label>
              </div>
              <select id={selId} value={chosen ?? ''} disabled={disabled} onChange={(e) => choose(p.id, e.target.value)} aria-label={`Response for row ${i + 1}`}>
                <option value="">Select…</option>
                {hotspot.responses.map((r) => {
                  const usedRow = hotspot.prompts.findIndex((q) => q.id !== p.id && cur(q.id) === r.id);
                  const off = !hotspot.reuse && usedRow >= 0;
                  return (
                    <option key={r.id} value={r.id} disabled={off}>
                      {r.text}
                      {off ? ` (used in row ${usedRow + 1})` : ''}
                    </option>
                  );
                })}
              </select>
              {resp && <p className="slot-echo">{resp.text}</p>}
              {notes.length > 0 && (
                <div className="choice-notes">
                  {notes.map((n, k) => (
                    <span key={k} className={`badge badge-${n.tone}`}>
                      {n.text}
                    </span>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
