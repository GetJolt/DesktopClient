import clsx from 'clsx';
import { ArrowDownToLine, RotateCw } from 'lucide-react';
import { useCurrentChannel, useCurrentGuild } from '@/hooks/useGuild';
import { useUpdateStatus } from '@/hooks/useUpdates';
import { useData } from '@/store/data';
import { Logo } from '../ui/Logo';
import { Tooltip } from '../ui/Tooltip';

const isMac = window.jolt.platform === 'darwin';

export function TitleBar() {
  const signedIn = useData((s) => s.status === 'signedIn');
  const guild = useCurrentGuild();
  const channel = useCurrentChannel(guild);
  const update = useUpdateStatus();
  const location = !signedIn
    ? null
    : guild
      ? `${guild.guild.name}${channel ? ` · #${channel.name}` : ''}`
      : 'Home';

  return (
    <header
      className={clsx(
        'drag-region flex h-8 shrink-0 items-center gap-2 bg-canvas text-[0.75rem] font-medium text-fg-subtle',
        isMac ? 'pl-20' : 'pl-3',
      )}
      style={{ paddingRight: isMac ? 12 : 140 }}
    >
      <Logo size={16} />
      <span className="text-fg-muted">Jolt</span>
      {location && (
        <>
          <span aria-hidden="true">/</span>
          <span className="truncate">{location}</span>
        </>
      )}

      <div className="ml-auto flex items-center">
        {update.state === 'downloading' && (
          <Tooltip content={`Downloading Jolt ${update.version} (${update.percent}%)`} side="bottom">
            <span className="no-drag flex items-center gap-1.5 px-2 text-fg-subtle" role="status">
              <ArrowDownToLine className="size-3.5 animate-pulse" aria-hidden="true" />
              <span className="sr-only">Downloading update, {update.percent} percent</span>
            </span>
          </Tooltip>
        )}
        {update.state === 'ready' && (
          <button
            type="button"
            onClick={() => window.jolt.updates.install()}
            className="press no-drag animate-pop flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[0.75rem] font-semibold text-on-accent shadow-[0_2px_10px_-2px_var(--accent-glow)] hover:bg-accent-hover"
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            Restart to update
          </button>
        )}
      </div>
    </header>
  );
}
