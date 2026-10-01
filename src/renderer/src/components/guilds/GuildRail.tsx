import clsx from 'clsx';
import { ArrowDown, ArrowUp, Check, Globe, LogOut, Plus, Settings, UserPlus } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { guildActivity } from '@jolt/sdk';
import { client, session } from '@/lib/client';
import { initials, pluralize } from '@/lib/format';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import {
  leaveGuild,
  markGuildRead,
  openFirstChannel,
  saveGuildOrder,
  sortedTextChannels,
} from '@/store/actions';
import { useData, type GuildState } from '@/store/data';
import { useUi } from '@/store/ui';
import { ConfirmDialog } from '../ui/Dialog';
import { LogoMark } from '../ui/Logo';
import { ContextMenuArea } from '../ui/Menu';
import { Tooltip } from '../ui/Tooltip';

export function GuildRail() {
  const order = useData((s) => s.guildOrder);
  const guilds = useData((s) => s.guilds);
  const activeKey = useUi((s) => s.guildKey);
  const openDialog = useUi((s) => s.openDialog);
  const onKeyDown = useRovingFocus('vertical');
  const [dragging, setDragging] = useState<string | null>(null);

  const visible = order.filter((key) => guilds[key]);

  const move = (key: string, to: number) => {
    const next = visible.filter((k) => k !== key);
    next.splice(Math.max(0, Math.min(next.length, to)), 0, key);
    void saveGuildOrder(next);
  };

  return (
    <nav
      aria-label="Servers"
      data-region="servers"
      className="scroll-hidden flex w-[4.5rem] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-canvas pt-1 pb-3"
      onKeyDown={onKeyDown}
    >
      <RailItem
        label="Home"
        variant="home"
        active={activeKey === null}
        onClick={() => useUi.getState().openGuild(null)}
        tabIndex={activeKey === null ? 0 : -1}
      >
        <LogoMark size={26} />
      </RailItem>

      <div className="my-0.5 h-px w-8 shrink-0 bg-line-strong" role="separator" />

      <ul className="flex w-full flex-col gap-2" aria-label="Your servers">
        {visible.map((key, index) => (
          <li
            key={key}
            draggable
            onDragStart={(e: DragEvent) => {
              setDragging(key);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => dragging && dragging !== key && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging && dragging !== key) move(dragging, index);
              setDragging(null);
            }}
            className={clsx('w-full', dragging === key && 'opacity-40')}
          >
            <GuildButton
              guild={guilds[key]!}
              active={activeKey === key}
              tabIndex={activeKey === key ? 0 : -1}
              canMoveUp={index > 0}
              canMoveDown={index < visible.length - 1}
              onMove={(delta) => move(key, index + delta)}
            />
          </li>
        ))}
      </ul>

      <RailItem
        label="Add a server"
        variant="action"
        onClick={() => openDialog({ type: 'addGuild' })}
        tabIndex={-1}
      >
        <Plus className="size-6" aria-hidden="true" />
      </RailItem>
    </nav>
  );
}

interface RailItemProps {
  label: string;
  active?: boolean;
  unread?: boolean;
  mentions?: number;
  variant?: 'guild' | 'home' | 'action';
  onClick: () => void;
  tabIndex: number;
  children: React.ReactNode;
  description?: string;
}

function RailItem({
  label,
  active,
  unread,
  mentions = 0,
  variant = 'guild',
  onClick,
  tabIndex,
  children,
  description,
}: RailItemProps) {
  const accessibleLabel = [
    label,
    mentions ? pluralize(mentions, 'mention') : null,
    unread && !mentions ? 'unread messages' : null,
    description,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="group relative flex w-full justify-center">
      <span
        aria-hidden="true"
        className={clsx(
          'absolute top-1/2 left-0 w-1 -translate-y-1/2 rounded-r-full bg-fg transition-[height] duration-200 ease-[var(--ease-out)]',
          active ? 'h-9' : unread ? 'h-2 group-hover:h-5' : 'h-0 group-hover:h-5',
        )}
      />
      <Tooltip
        content={
          description ? (
            <>
              <span className="block">{label}</span>
              <span className="block text-xs text-fg-subtle">{description}</span>
            </>
          ) : (
            label
          )
        }
        side="right"
      >
        <button
          type="button"
          data-roving-item
          tabIndex={tabIndex}
          aria-label={accessibleLabel}
          aria-current={active ? 'page' : undefined}
          onClick={onClick}
          className={clsx(
            'press relative flex size-12 items-center justify-center overflow-visible transition-[border-radius,background-color,color,box-shadow] duration-200 ease-[var(--ease-out)]',
            active ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]',
            variant === 'action'
              ? 'border border-dashed border-line-strong text-accent-text hover:border-transparent hover:bg-accent-soft'
              : active
                ? 'bg-accent text-on-accent shadow-[0_6px_20px_-6px_var(--accent-glow),inset_0_1px_0_rgb(255_255_255/0.35)]'
                : variant === 'home'
                  ? 'border border-line bg-raised text-accent-text shadow-highlight hover:bg-raised-strong'
                  : 'border border-line bg-raised text-fg shadow-highlight hover:bg-raised-strong',
          )}
        >
          {children}
          {mentions > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -bottom-1 flex h-5 min-w-5 items-center justify-center rounded-full border-[3px] border-canvas bg-danger-fill px-1 text-[0.6875rem] font-bold text-on-danger tabular-nums"
            >
              {mentions > 99 ? '99+' : mentions}
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  );
}

function useGuildActivity(guild: GuildState) {
  const readStates = useData((s) => s.readStates);
  const me = useData((s) => s.me);
  return useMemo(() => guildActivity({ ...session.state, readStates, me }, guild), [guild, readStates, me]);
}

function GuildButton({
  guild,
  active,
  tabIndex,
  canMoveUp,
  canMoveDown,
  onMove,
}: {
  guild: GuildState;
  active: boolean;
  tabIndex: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (delta: number) => void;
}) {
  const { unread, mentions } = useGuildActivity(guild);
  const openDialog = useUi((s) => s.openDialog);
  const channelByGuild = useUi((s) => s.channelByGuild);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const foreign = guild.instance !== client.homeDomain;
  const me = useData((s) => s.me[guild.instance]);
  const isOwner = me?.id === guild.guild.ownerId;
  const firstChannel = sortedTextChannels(guild.channels)[0];

  const open = () => {
    const remembered = channelByGuild[guild.key];
    if (remembered && guild.channels[remembered]) useUi.getState().openChannel(guild.key, remembered);
    else openFirstChannel(guild.key);
  };

  return (
    <>
      <ContextMenuArea
        items={[
          {
            label: 'Mark as read',
            icon: <Check className="size-4" />,
            onSelect: () => markGuildRead(guild.key),
            disabled: !unread,
          },
          firstChannel && {
            label: 'Invite people',
            icon: <UserPlus className="size-4" />,
            onSelect: () => openDialog({ type: 'invite', guildKey: guild.key, channelId: firstChannel.id }),
          },
          {
            label: 'Server settings',
            icon: <Settings className="size-4" />,
            onSelect: () => openDialog({ type: 'guildSettings', guildKey: guild.key }),
          },
          'separator',
          {
            label: 'Move up',
            icon: <ArrowUp className="size-4" />,
            onSelect: () => onMove(-1),
            disabled: !canMoveUp,
          },
          {
            label: 'Move down',
            icon: <ArrowDown className="size-4" />,
            onSelect: () => onMove(1),
            disabled: !canMoveDown,
          },
          !isOwner && 'separator',
          !isOwner && {
            label: 'Leave server',
            icon: <LogOut className="size-4" />,
            danger: true,
            onSelect: () => setConfirmLeave(true),
          },
        ]}
      >
        <div className="w-full">
          <RailItem
            label={guild.guild.name}
            description={foreign ? `Hosted on ${guild.instance}` : undefined}
            active={active}
            unread={unread}
            mentions={mentions}
            onClick={open}
            tabIndex={tabIndex}
          >
            {guild.guild.iconUrl ? (
              <img
                src={guild.guild.iconUrl}
                alt=""
                className="size-full rounded-[inherit] object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-[0.9375rem] font-semibold">{initials(guild.guild.name, 3)}</span>
            )}
            {foreign && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-canvas bg-raised-strong text-fg-muted"
              >
                <Globe className="size-3" />
              </span>
            )}
          </RailItem>
        </div>
      </ContextMenuArea>
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`Leave ${guild.guild.name}?`}
        description="You won't be able to rejoin unless you're invited again."
        confirmLabel="Leave server"
        danger
        onConfirm={() => leaveGuild(guild.key)}
      />
    </>
  );
}
