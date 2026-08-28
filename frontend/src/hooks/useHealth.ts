import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';

export type BackendStatus = 'checking' | 'online' | 'offline';

/** How often to re-check. Slow on purpose -- this is a status light, not a probe. */
const POLL_MS = 20_000;

/**
 * Liveness of the backend, for the status bar.
 *
 * `GET /health` is the only thing the API exposes about itself, so `version` is
 * all there is to report. Model name, embedding model and vector-store size are
 * not served by any endpoint today; the status bar leaves those out rather than
 * guessing at them.
 */
export function useHealth() {
  const [status, setStatus] = useState<BackendStatus>('checking');
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const health = await getHealth();
        if (cancelled) return;
        setVersion(health.version);
        setStatus('online');
      } catch {
        if (cancelled) return;
        setStatus('offline');
      }
    };

    void check();
    const timer = setInterval(() => void check(), POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return { status, version };
}
