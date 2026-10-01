import type { PresenceStatus } from '@getjolt/protocol';
import { Settings } from 'lucide-react';
import { client } from '@/lib/client';
import { address } from '@/lib/format';
import { setStatus } from '@/store/actions';
import { useData } from '@/store/data';
import { useUi } from '@/store/ui';
import { Avatar, StatusIcon, statusLabel } from '../ui/Avatar';
import { IconButton } from '../ui/Button';
import { Dropdown } from '../ui/Menu';

const STATUSES: PresenceStatus[] = ['online', 'idle', 'dnd', 'offline'];
const statusHints: Partial<Record<PresenceStatus, string>> = {
  dnd: 'Mutes notifications',
  offline: 'Appear offline',
};

export function UserPanel() {
  const home = client.homeDomain;
  const me = useData((s) => (home ? s.me[home] : undefined));
  const status = useUi((s) => s.status);
  const openDialog = useUi((s) => s.openDialog);
  if (!me) return <div className="m-2 h-14" />;

  return (
    <section
      aria-label="Your account"
      className="m-2 flex h-14 shrink-0 items-center gap-1 rounded-[var(--radius-lg)] border border-line bg-raised px-1.5 shadow-[var(--highlight),var(--shadow-1)]"
    >
      <Dropdown
        side="top"
        trigger={
          <button
            type="button"
            className="press flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] px-1.5 py-1 text-left hover:bg-hover"
            aria-label={`${me.displayName}, ${statusLabel(status)}. Change status`}
          >
            <Avatar
              name={me.displayName}
              seed={me.id}
              url={me.avatarUrl}
              size={32}
              status={status}
              ring="var(--raised)"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm leading-tight font-semibold">{me.displayName}</span>
              <span className="block truncate text-xs leading-tight text-fg-subtle">{address(me)}</span>
            </span>
          </button>
        }
        items={STATUSES.map((s) => ({
          label: statusLabel(s) + (s === status ? ' (current)' : ''),
          hint: statusHints[s],
          icon: <StatusIcon status={s} size={10} />,
          onSelect: () => setStatus(s),
        }))}
      />
      <IconButton
        label="User settings"
        tooltipSide="top"
        onClick={() => openDialog({ type: 'settings', tab: 'account' })}
      >
        <Settings className="size-[1.125rem]" aria-hidden="true" />
      </IconButton>
    </section>
  );
}
