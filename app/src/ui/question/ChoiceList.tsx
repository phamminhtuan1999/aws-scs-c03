import { useId, type MouseEvent } from 'react';
import type { Question } from '../../data/schema';
import { Blocks } from './Blocks';

export interface ChoiceListProps {
  question: Question;
  /** multiple_choice: choice id | null; multiple_response: choice ids */
  value: string | null | string[];
  onChange?: (v: string | null | string[]) => void;
  disabled?: boolean;
  /** badges shown next to a choice after checking (text labels, never colour alone) */
  annotations?: Record<string, { text: string; tone: 'good' | 'bad' | 'info' }[]>;
}

export function ChoiceList({ question, value, onChange, disabled, annotations }: ChoiceListProps) {
  const multi = question.type === 'multiple_response';
  const selected = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const group = useId();

  const toggle = (id: string) => {
    if (disabled || !onChange) return;
    if (multi) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // keep the source choice order
      onChange(question.choices.filter((c) => next.has(c.id)).map((c) => c.id));
    } else onChange(id);
  };

  const rowClick = (e: MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest('button, input, a, select')) return;
    if (window.getSelection?.()?.toString()) return; // the user is selecting text, not choosing
    toggle(id);
  };

  return (
    <div className="choices" role={multi ? 'group' : 'radiogroup'} aria-label="Answer choices">
      {question.choices.map((c) => {
        const on = selected.has(c.id);
        const inputId = `${group}-${c.id}`;
        const notes = annotations?.[c.id] ?? [];
        return (
          <div
            key={c.id}
            className={`choice-row${on ? ' is-selected' : ''}${disabled ? ' is-disabled' : ''}`}
            data-choice-id={c.id}
            onClick={(e) => rowClick(e, c.id)}
          >
            <input
              id={inputId}
              type={multi ? 'checkbox' : 'radio'}
              name={group}
              checked={on}
              disabled={disabled}
              onChange={() => toggle(c.id)}
              aria-label={`Choice ${c.letter}`}
              aria-describedby={`${inputId}-body`}
            />
            <div className="choice-main">
              <span className="choice-letter" aria-hidden="true">
                {c.letter}.
              </span>
              <div id={`${inputId}-body`} className="choice-body">
                <Blocks blocks={c.blocks} />
                {notes.length > 0 && (
                  <div className="choice-notes">
                    {notes.map((n, i) => (
                      <span key={i} className={`badge badge-${n.tone}`}>
                        {n.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {multi && (
        <p className="selected-count" aria-live="polite">
          {selected.size} selected
        </p>
      )}
    </div>
  );
}
