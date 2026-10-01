import { Permission, type Channel } from '@jolt/protocol';
import clsx from 'clsx';
import {
  Check,
  ChevronDown,
  Copy,
  FolderPlus,
  Hash,
  LogOut,
  Pencil,
  Plus,
  Settings,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { canSeeChannel, usePermissions } from '@/hooks/useGuild';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { scoped } from '@/lib/keys';
import { leaveGuild, markGuildRead, markRead, rest } from '@/store/actions';
import { isUnread, useData, type GuildState } from '@/store/data';
import { useUi } from '@/store/ui';
import { ConfirmDialog } from '../ui/Dialog';
import { IconButton } from '../ui/Button';
import { ContextMenuArea, Dropdown } from '../ui/Menu';

interface Group {
  category: Channel | null;
  channels: Channel[];
}

function groupChannels(guild: GuildState, userId: string | undefined): Group[] {
  const all = Object.values(guild.channels).sort((a, b) => a.position - b.position);
  const visible = all.filter((c) => c.type === 'text' && canSeeChannel(guild, c, userId));
  const groups: Group[] = [
    { category: null, channels: visible.filter((c) => !c.parentId || !guild.channels[c.parentId]) },
  ];
  for (const category of all.filter((c) => c.type === 'category')) {
    groups.push({ category, channels: visible.filter((c) => c.parentId === category.id) });
  }
  return groups.filter((g) => (g.category === null ? g.channels.length > 0 : true));
}

export function ChannelSidebar({
  guild,
  activeChannelId,
}: {
  guild: GuildState;
  activeChannelId: string | null;
}) {
  const me = useData((s) => s.me[guild.instance]);
  const perms = usePermissions(guild);
  const openDialog = useUi((s) => s.openDialog);
  const collapsed = useUi((s) => s.collapsedCategories);
  const toggleCategory = useUi((s) => s.toggleCategory);
  const onKeyDown = useRovingFocus('vertical');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const groups = useMemo(() => groupChannels(guild, me?.id), [guild, me]);
  const canManage = perms.can(Permission.MANAGE_CHANNELS);
  const firstChannelId = groups.flatMap((g) => g.channels)[0]?.id;
  const tabStop = activeChannelId ?? firstChannelId;

  return (
    <nav
      aria-label={`${guild.guild.name} channels`}
      data-region="channels"
      className="flex min-h-0 flex-1 flex-col"
    >
      <Dropdown
        trigger={
          <button
            type="button"
            className="group/header flex h-12 w-full shrink-0 items-center gap-2 border-b border-line px-4 text-left transition-colors hover:bg-hover data-[state=open]:bg-hover"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9375rem] leading-tight font-semibold">
                {guild.guild.name}
              </span>
              <span className="block truncate text-[0.6875rem] leading-tight text-fg-subtle">
                {guild.instance}
              </span>
            </span>
            <ChevronDown
              className="size-4 text-fg-muted transition-transform duration-200 group-data-[state=open]/header:rotate-180"
              aria-hidden="true"
            />
          </button>
        }
        items={[
          perms.can(Permission.CREATE_INVITE) &&
            activeChannelId && {
              label: 'Invite people',
              icon: <UserPlus className="size-4" />,
              onSelect: () => openDialog({ type: 'invite', guildKey: guild.key, channelId: activeChannelId }),
            },
          {
            label: 'Server settings',
            icon: <Settings className="size-4" />,
            onSelect: () => openDialog({ type: 'guildSettings', guildKey: guild.key }),
          },
          canManage && {
            label: 'Create channel',
            icon: <Plus className="size-4" />,
            onSelect: () => openDialog({ type: 'channel', guildKey: guild.key, kind: 'text' }),
          },
          canManage && {
            label: 'Create category',
            icon: <FolderPlus className="size-4" />,
            onSelect: () => openDialog({ type: 'channel', guildKey: guild.key, kind: 'category' }),
          },
          'separator',
          {
            label: 'Mark server as read',
            icon: <Check className="size-4" />,
            onSelect: () => markGuildRead(guild.key),
          },
          !perms.isOwner && 'separator',
          !perms.isOwner && {
            label: 'Leave server',
            icon: <LogOut className="size-4" />,
            danger: true,
            onSelect: () => setConfirmLeave(true),
          },
        ]}
      />

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pt-4 pb-2" onKeyDown={onKeyDown}>
        {groups.map(({ category, channels }) => {
          const key = category ? `${guild.key}:${category.id}` : `${guild.key}:root`;
          const isCollapsed = category ? collapsed[key] : false;
          return (
            <section key={key} className="mb-4" aria-label={category?.name}>
              {category && (
                <div className="group flex items-center pr-1">
                  <ContextMenuArea items={canManage ? categoryMenu(guild, category, openDialog) : []}>
                    <button
                      type="button"
                      data-roving-item
                      tabIndex={-1}
                      aria-expanded={!isCollapsed}
                      onClick={() => toggleCategory(key)}
                      className="eyebrow flex min-w-0 flex-1 items-center gap-1 px-1 py-1 transition-colors hover:text-fg"
                    >
                      <ChevronDown
                        className={clsx('size-3 shrink-0 transition-transform', isCollapsed && '-rotate-90')}
                        aria-hidden="true"
                      />
                      <span className="truncate">{category.name}</span>
                    </button>
                  </ContextMenuArea>
                  {canManage && (
                    <IconButton
                      label={`Create channel in ${category.name}`}
                      size="sm"
                      tooltipSide="top"
                      className="size-5! opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() =>
                        openDialog({
                          type: 'channel',
                          guildKey: guild.key,
                          kind: 'text',
                          parentId: category.id,
                        })
                      }
                    >
                      <Plus className="size-4" aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
              )}
              <ul className="mt-1 space-y-0.5">
                {channels
                  .filter((c) => !isCollapsed || c.id === activeChannelId)
                  .map((channel) => (
                    <li key={channel.id}>
                      <ChannelItem
                        guild={guild}
                        channel={channel}
                        active={channel.id === activeChannelId}
                        tabStop={channel.id === tabStop}
                        canManage={canManage}
                      />
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
        {groups.length === 0 && <p className="px-2 text-sm text-fg-subtle">No channels yet.</p>}
      </div>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`Leave ${guild.guild.name}?`}
        description="You won't be able to rejoin unless you're invited again."
        confirmLabel="Leave server"
        danger
        onConfirm={() => leaveGuild(guild.key)}
      />
    </nav>
  );
}

function categoryMenu(
  guild: GuildState,
  category: Channel,
  openDialog: ReturnType<typeof useUi.getState>['openDialog'],
) {
  return [
    {
      label: 'Edit category',
      icon: <Pencil className="size-4" />,
      onSelect: () => openDialog({ type: 'channel', guildKey: guild.key, channelId: category.id }),
    },
    {
      label: 'Create channel',
      icon: <Plus className="size-4" />,
      onSelect: () =>
        openDialog({ type: 'channel', guildKey: guild.key, kind: 'text', parentId: category.id }),
    },
  ];
}

function ChannelItem({
  guild,
  channel,
  active,
  tabStop,
  canManage,
}: {
  guild: GuildState;
  channel: Channel;
  active: boolean;
  tabStop: boolean;
  canManage: boolean;
}) {
  const channelKey = scoped(guild.instance, channel.id);
  const readState = useData((s) => s.readStates[channelKey]);
  const openChannel = useUi((s) => s.openChannel);
  const openDialog = useUi((s) => s.openDialog);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const unread = !active && isUnread(channel, readState);
  const mentions = active ? 0 : (readState?.mentionCount ?? 0);

  const label = [
    channel.name,
    mentions ? `${mentions} mentions` : null,
    unread && !mentions ? 'unread' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <>
      <ContextMenuArea
        items={[
          {
            label: 'Mark as read',
            icon: <Check className="size-4" />,
            onSelect: () => markRead(channelKey, channel.lastMessageId),
            disabled: !unread && !mentions,
          },
          canManage && 'separator',
          canManage && {
            label: 'Edit channel',
            icon: <Pencil className="size-4" />,
            onSelect: () => openDialog({ type: 'channel', guildKey: guild.key, channelId: channel.id }),
          },
          canManage && {
            label: 'Delete channel',
            icon: <Trash2 className="size-4" />,
            danger: true,
            onSelect: () => setConfirmDelete(true),
          },
          'separator',
          {
            label: 'Copy channel ID',
            icon: <Copy className="size-4" />,
            onSelect: () => void navigator.clipboard.writeText(channel.id),
          },
        ]}
      >
        <button
          type="button"
          data-roving-item
          data-region-focus={active ? '' : undefined}
          tabIndex={tabStop ? 0 : -1}
          aria-current={active ? 'page' : undefined}
          aria-label={label}
          onClick={() => openChannel(guild.key, channel.id)}
          className={clsx(
            'group relative flex h-[2.125rem] w-full items-center gap-2 rounded-[var(--radius-sm)] border px-2 text-left text-[0.9375rem] transition-colors duration-150',
            active
              ? 'border-line bg-panel text-fg shadow-1'
              : unread
                ? 'border-transparent text-fg hover:bg-hover'
                : 'border-transparent text-fg-subtle hover:bg-hover hover:text-fg-muted',
          )}
        >
          <Hash
            className={clsx('size-[1.125rem] shrink-0', active ? 'text-accent-text' : 'opacity-70')}
            aria-hidden="true"
          />
          <span className={clsx('min-w-0 flex-1 truncate', (unread || active) && 'font-semibold')}>
            {channel.name}
          </span>
          {mentions > 0 && (
            <span
              aria-hidden="true"
              className="flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-danger-fill px-1 text-[0.6875rem] font-bold text-on-danger tabular-nums"
            >
              {mentions}
            </span>
          )}
          {unread && !mentions && (
            <span aria-hidden="true" className="mr-1 size-1.5 shrink-0 rounded-full bg-fg" />
          )}
        </button>
      </ContextMenuArea>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete #${channel.name}?`}
        description="This permanently deletes the channel and every message in it."
        confirmLabel="Delete channel"
        danger
        onConfirm={() => rest(guild.instance).deleteChannel(channel.id)}
      />
    </>
  );
}
