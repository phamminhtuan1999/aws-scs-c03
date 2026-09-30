import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openCount = 0;
function setBackgroundInert(on: boolean) {
  const root = document.getElementById('root');
  if (!root) return;
  if (on) {
    openCount += 1;
    root.setAttribute('inert', '');
    root.setAttribute('aria-hidden', 'true');
  } else {
    openCount = Math.max(0, openCount - 1);
    if (openCount === 0) {
      root.removeAttribute('inert');
      root.removeAttribute('aria-hidden');
    }
  }
}

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** "alertdialog" for confirmations */
  role?: 'dialog' | 'alertdialog';
  wide?: boolean;
  /** Escape closes the dialog (default true) */
  escapeCloses?: boolean;
  className?: string;
}

/** Accessible modal: portal, focus trap, Esc, focus restored to the opener, page behind made inert. */
export function Modal({ title, onClose, children, role = 'dialog', wide, escapeCloses = true, className }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    setBackgroundInert(true);
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('[data-autofocus]') ?? el?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el)?.focus();
    return () => {
      setBackgroundInert(false);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && escapeCloses) {
      e.stopPropagation();
      closeRef.current();
      return;
    }
    if (e.key !== 'Tab') return;
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (items.length === 0) {
      e.preventDefault();
      el.focus();
      return;
    }
    const firstEl = items[0];
    const lastEl = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === firstEl || active === el)) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && active === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  };

  return createPortal(
    <div className="modal-backdrop" data-modal="true">
      <div
        ref={ref}
        className={`modal ${wide ? 'modal-wide' : ''} ${className ?? ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
      >
        <h2 id={titleId} className="modal-title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
