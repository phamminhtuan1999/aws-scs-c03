import { useId } from 'react';
import type { OrderingHotspot } from '../../data/schema';

export interface OrderingControlProps {
  hotspot: OrderingHotspot;
  /** one entry per slot: step id or null */
  value: (string | null)[] | undefined;
  onChange?: (v: (string | null)[]) => void;
  disabled?: boolean;
  /** optional per-slot badges after checking */
  annotations?: Record<number, { text: string; tone: 'good' | 'bad' | 'info' }[]>;
}

/**
 * Ordering answer control: AWS uses one drop-down per step, so: "Step 1 ... Step n", each a <select>
 * ("Select..." + every step in source order). With reuse=false a step chosen in another slot is disabled here.
 * Extras: up/down buttons swap a filled slot with its neighbour, "Clear" empties a slot. All keyboard operable.
 */
export function OrderingControl({ hotspot, value, onChange, disabled, annotations }: OrderingControlProps) {
  const uid = useId();
  const slots: (string | null)[] = Array.from({ length: hotspot.slots }, (_, i) => value?.[i] ?? null);
  const set = (next: (string | null)[]) => onChange?.(next);

  const choose = (i: number, id: string) => {
    const next = [...slots];
    next[i] = id || null;
    set(next);
  };
  const swap = (i: number, j: number) => {
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };

  return (
    <div className="ordering" data-control="ordering">
      <p className="control-note">
        Select and order the steps. Step and row labels are added by this practice tool.
        {!hotspot.reuse && ' A step already used in another position is disabled.'}
      </p>
      <ol className="slot-list">
        {slots.map((cur, i) => {
          const selId = `${uid}-slot-${i}`;
          const step = hotspot.steps.find((s) => s.id === cur);
          const notes = annotations?.[i] ?? [];
          return (
            <li key={i} className="slot-row" data-slot={i + 1}>
              <div className="slot-head">
                <label htmlFor={selId} className="slot-label">
                  Step {i + 1}
                </label>
                <select
                  id={selId}
                  value={cur ?? ''}
                  disabled={disabled}
                  onChange={(e) => choose(i, e.target.value)}
                  aria-label={`Step ${i + 1}`}
                >
                  <option value="">Select…</option>
                  {hotspot.steps.map((s) => {
                    const usedAt = slots.findIndex((x, k) => x === s.id && k !== i);
                    const off = !hotspot.reuse && usedAt >= 0;
                    return (
                      <option key={s.id} value={s.id} disabled={off}>
                        {s.text}
                        {off ? ` (used in step ${usedAt + 1})` : ''}
                      </option>
                    );
                  })}
                </select>
                <div className="slot-actions">
                  <button
                    type="button"
                    onClick={() => swap(i, i - 1)}
                    disabled={disabled || !cur || i === 0}
                    aria-label={`Move step ${i + 1} up`}
                    title="Swap with the previous position"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => swap(i, i + 1)}
                    disabled={disabled || !cur || i === slots.length - 1}
                    aria-label={`Move step ${i + 1} down`}
                    title="Swap with the next position"
                  >
                    ▼
                  </button>
                  <button type="button" onClick={() => choose(i, '')} disabled={disabled || !cur} aria-label={`Clear step ${i + 1}`}>
                    Clear
                  </button>
                </div>
              </div>
              {step && <p className="slot-echo">{step.text}</p>}
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
