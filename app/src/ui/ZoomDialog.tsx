import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

interface ZoomTarget {
  src: string;
  alt: string;
  width: number;
  height: number;
}
interface ZoomApi {
  open: (t: ZoomTarget) => void;
}
const ZoomContext = createContext<ZoomApi>({ open: () => {} });
export const useZoom = () => useContext(ZoomContext);

export function ZoomProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<ZoomTarget | null>(null);
  const open = useCallback((t: ZoomTarget) => setTarget(t), []);
  const api = useMemo(() => ({ open }), [open]);
  return (
    <ZoomContext.Provider value={api}>
      {children}
      {target && <ZoomDialog target={target} onClose={() => setTarget(null)} />}
    </ZoomContext.Provider>
  );
}

const STEPS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];

function ZoomDialog({ target, onClose }: { target: ZoomTarget; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const area = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; sl: number; st: number } | null>(null);
  const fitWidth = () => {
    const w = area.current?.clientWidth ?? 800;
    return Math.min(target.width, Math.max(200, w - 4));
  };
  const widthPx = Math.round(fitWidth() * zoom) || target.width;
  const idx = STEPS.indexOf(zoom);
  const zoomIn = () => setZoom(STEPS[Math.min(STEPS.length - 1, (idx < 0 ? 3 : idx) + 1)]);
  const zoomOut = () => setZoom(STEPS[Math.max(0, (idx < 0 ? 3 : idx) - 1)]);

  return (
    <Modal title="Image viewer" onClose={onClose} wide className="zoom-modal">
      <div className="zoom-toolbar" role="toolbar" aria-label="Zoom controls">
        <button type="button" onClick={zoomOut} disabled={zoom <= STEPS[0]} aria-label="Zoom out">
          &minus;
        </button>
        <button type="button" onClick={zoomIn} disabled={zoom >= STEPS[STEPS.length - 1]} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom">
          Reset
        </button>
        <span className="zoom-level" aria-live="polite">
          {Math.round(zoom * 100)}%
        </span>
        <button type="button" onClick={onClose} className="zoom-close" data-autofocus>
          Close
        </button>
      </div>
      <div
        ref={area}
        className="zoom-area"
        tabIndex={0}
        aria-label="Image, scrollable. Drag or use the arrow keys to pan."
        onPointerDown={(e) => {
          const el = area.current;
          if (!el) return;
          drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop };
          el.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const el = area.current;
          const d = drag.current;
          if (!el || !d) return;
          el.scrollLeft = d.sl - (e.clientX - d.x);
          el.scrollTop = d.st - (e.clientY - d.y);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) zoomIn();
            else zoomOut();
          }
        }}
      >
        <img src={target.src} alt={target.alt} style={{ width: `${widthPx}px`, maxWidth: 'none' }} draggable={false} />
      </div>
    </Modal>
  );
}
