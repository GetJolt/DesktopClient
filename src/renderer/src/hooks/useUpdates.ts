import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../../shared/bridge';
import { announce } from '@/lib/announcer';

export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'unsupported' });
  useEffect(() => {
    let alive = true;
    void window.jolt.updates.status().then((s) => alive && setStatus(s));
    const off = window.jolt.updates.onStatus((s) => {
      setStatus(s);
      if (s.state === 'ready') announce(`Jolt ${s.version} is ready. Restart to update.`);
    });
    return () => {
      alive = false;
      off();
    };
  }, []);
  return status;
}

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    void window.jolt.appVersion().then(setVersion);
  }, []);
  return version;
}
