import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { client } from '@/lib/client';
import { useData } from '@/store/data';
import { Spinner } from '../ui/Button';

/** Shown when the home instance, or the instance hosting the open server, loses its realtime connection. */
export function ConnectionBanner({ instance }: { instance?: string }) {
  const home = client.homeDomain;
  const homeState = useData((s) => (home ? s.connections[home] : undefined));
  const guildState = useData((s) => (instance ? s.connections[instance] : undefined));
  const broken = [
    { instance: home, state: homeState },
    { instance, state: guildState },
  ].find((c) => c.instance && (c.state === 'reconnecting' || c.state === 'connecting'));

  // Brief blips are normal; only show the banner if it lasts.
  const brokenKey = broken ? `${broken.instance}:${broken.state}` : null;
  const [shownKey, setShownKey] = useState<string | null>(null);
  useEffect(() => {
    if (!brokenKey) return;
    const timer = setTimeout(() => setShownKey(brokenKey), 1500);
    return () => clearTimeout(timer);
  }, [brokenKey]);

  if (!broken || shownKey !== brokenKey) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-idle/15 px-4 py-1.5 text-sm font-medium text-fg"
    >
      {broken.state === 'reconnecting' ? <WifiOff className="size-4" aria-hidden="true" /> : <Spinner />}
      {broken.state === 'reconnecting'
        ? `Reconnecting to ${broken.instance}…`
        : `Connecting to ${broken.instance}…`}
    </div>
  );
}
