import { useRef, useState } from 'react';
import { applyImport, buildExport, validateImport, type ImportCheck } from '../storage/exportImport';
import { useData } from './hooks';

export function DataTransfer() {
  const data = useData();
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const doExport = () => {
    const payload = buildExport();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scs-c03-trainer-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setDone(`Exported ${payload.data.sessions.length} exam(s), ${Object.keys(payload.data.study.attempts).length} studied question(s) and ${payload.data.tips.length} tip(s).`);
  };

  const onFile = async (f: File | undefined) => {
    setDone(null);
    setCheck(null);
    if (!f) return;
    setFileName(f.name);
    if (f.size > 5 * 1024 * 1024) {
      setCheck({ ok: false, error: `File is too large (${(f.size / 1048576).toFixed(1)} MB; limit is 5 MB).` });
      return;
    }
    const text = await f.text();
    setCheck(validateImport(text, new Set(data.allIds)));
  };

  const apply = (mode: 'merge' | 'replace') => {
    if (!check || !check.ok) return;
    applyImport(check.payload, mode);
    setDone(mode === 'replace' ? 'Import finished: your progress was replaced with the file contents.' : 'Import finished: the file was merged into your existing progress.');
    setCheck(null);
    setFileName('');
    if (input.current) input.current.value = '';
  };

  return (
    <div className="page">
      <h1>Export / Import progress</h1>
      <p className="muted">
        Progress (finished exams, study attempts, practice position, bookmarks, tips, settings) is stored only in this browser. Export it to a JSON
        file as a backup or to move it to another browser. Importing never changes the questions, answer keys or research.
      </p>

      <section>
        <h2 className="h3">Export</h2>
        <button type="button" className="primary" onClick={doExport}>
          Export progress (JSON)
        </button>
      </section>

      <section>
        <h2 className="h3">Import</h2>
        <div className="field">
          <label htmlFor="import-file">Choose a progress file exported by this app</label>
          <input id="import-file" ref={input} type="file" accept="application/json,.json" onChange={(e) => void onFile(e.target.files?.[0])} />
        </div>
        {check && !check.ok && (
          <p role="alert" className="error-text" data-testid="import-error">
            Import failed: {check.error} Your existing data was not changed.
          </p>
        )}
        {check && check.ok && (
          <div className="info-box" role="region" aria-label="Import preview">
            <p>
              <strong>{fileName}</strong> is a valid progress file (exported {check.summary.exportedAt}, app {check.summary.appVersion}).
            </p>
            <ul>
              <li>{check.summary.sessions} finished exam(s)</li>
              <li>{check.summary.attempts} study/practice attempt(s)</li>
              <li>{check.summary.bookmarks} bookmark/flag(s)</li>
              <li>{check.summary.tips} tip(s)</li>
              {check.summary.inProgressSkipped > 0 && <li>{check.summary.inProgressSkipped} unfinished exam(s) will not be imported</li>}
            </ul>
            <p>Choose how to apply it. Nothing has been changed yet.</p>
            <div className="action-row">
              <button type="button" className="primary" onClick={() => apply('merge')}>
                Merge into existing data
              </button>
              <button type="button" className="danger" onClick={() => apply('replace')}>
                Replace existing data
              </button>
              <button type="button" onClick={() => setCheck(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {done && (
          <p role="status" data-testid="transfer-status">
            {done}
          </p>
        )}
      </section>
    </div>
  );
}
