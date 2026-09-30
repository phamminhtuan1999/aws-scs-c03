import { COLOR_SCHEMES, COLOR_SCHEME_LABELS, settingsSlot } from '../storage/slots';
import { readSlot, writeSlot } from '../storage/store';
import { useSlot } from './hooks';

export const FONT_LABELS = ['Normal', 'Large', 'Larger', 'Largest'];

export function Settings() {
  const s = useSlot(settingsSlot);
  const set = (patch: Partial<typeof s>) => writeSlot(settingsSlot, { ...readSlot(settingsSlot), ...patch });
  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="muted">Stored on this device only.</p>

      <fieldset>
        <legend>Text size</legend>
        {FONT_LABELS.map((l, i) => (
          <div key={l} className="radio-line">
            <label>
              <input type="radio" name="font" checked={s.font_step === i} onChange={() => set({ font_step: i })} /> {l}
            </label>
          </div>
        ))}
      </fieldset>

      <div className="radio-line">
        <label>
          <input type="checkbox" checked={s.high_contrast} onChange={(e) => set({ high_contrast: e.target.checked })} /> High contrast
        </label>
      </div>

      <div className="field">
        <label htmlFor="scheme">Color scheme</label>
        <select id="scheme" value={s.color_scheme} onChange={(e) => set({ color_scheme: e.target.value as (typeof COLOR_SCHEMES)[number] })}>
          {COLOR_SCHEMES.map((c) => (
            <option key={c} value={c}>
              {COLOR_SCHEME_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <p className="sample">Sample: the quick brown fox jumps over the lazy dog.</p>
    </div>
  );
}
