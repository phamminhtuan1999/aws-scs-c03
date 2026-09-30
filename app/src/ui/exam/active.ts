import { useEffect, useRef } from 'react';
import { expireIfDue, submitSession } from '../../session/exam';
import type { ExamSession } from '../../session/types';
import { activeSlot, getActiveSessionId, loadSession, saveSession, sessionSlot, setActiveSessionId } from '../../storage/slots';
import { getClock } from '../../time/clock';
import { useSlot } from '../hooks';

let lastSeenActiveId: string | null = null;
/** Id of the most recent in-progress exam this tab has displayed (used to reach its results after it ends). */
export const getLastSeenActiveId = () => lastSeenActiveId;

/** The in-progress exam, if any (null when none, or when the stored session is already submitted). */
export function useActiveExam(): ExamSession | null {
  const active = useSlot(activeSlot);
  const s = useSlot(sessionSlot(active.id ?? '__none__'));
  if (!active.id || !s || s.status !== 'in_progress') return null;
  lastSeenActiveId = s.id;
  return s;
}

/**
 * Apply a mutation to the LATEST stored copy of the active session (so a second tab can never be
 * overwritten by stale state) and persist it. A submitted session is final and is never modified.
 */
export function commitActive(fn: (s: ExamSession) => ExamSession): ExamSession | null {
  const id = getActiveSessionId();
  if (!id) return null;
  const latest = loadSession(id);
  if (!latest) return null;
  if (latest.status === 'submitted') {
    setActiveSessionId(null);
    return latest;
  }
  const next = fn(latest);
  if (next === latest) return latest;
  const saved = saveSession(next);
  if (saved.status === 'submitted') setActiveSessionId(null);
  return saved;
}

export function submitActive(reason: 'user' | 'timeout' | 'expired_on_load'): ExamSession | null {
  return commitActive((s) => submitSession(s, getClock().now(), reason));
}

/**
 * Grades an expired in-progress session exactly once (timeout while open, or expired_on_load when found after
 * the app was closed). Calls onSubmitted with the submitted session.
 */
export function useExamExpiry(session: ExamSession | null, now: number, onSubmitted?: (s: ExamSession) => void) {
  const first = useRef(true);
  const cb = useRef(onSubmitted);
  cb.current = onSubmitted;
  useEffect(() => {
    if (!session) return;
    const reason = first.current ? 'expired_on_load' : 'timeout';
    first.current = false;
    const out = commitActive((s) => expireIfDue(s, getClock().now(), reason));
    if (out && out.status === 'submitted') cb.current?.(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, now]);
}
