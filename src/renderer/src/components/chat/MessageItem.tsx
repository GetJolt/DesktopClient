import type { Message } from '@getjolt/protocol';
import { findInviteLinks } from '@getjolt/sdk';
import clsx from 'clsx';
import { AlertCircle, Copy, CornerUpLeft, Fingerprint, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { displayName, formatDay, formatFull, formatTime, formatTimestamp, roleColor } from '@/lib/format';
import type { ScopedKey } from '@/lib/keys';
import { discardMessage, editMessage, errorMessage, retryMessage } from '@/store/actions';
import type { ChatMessage, GuildState } from '@/store/data';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { ContextMenuArea, Dropdown, type MenuEntry } from '../ui/Menu';
import { Tooltip } from '../ui/Tooltip';
import { UserPopover } from '../members/UserPopover';
import { InviteEmbed } from './InviteEmbed';
import { Markdown } from './Markdown';

interface Props {
  guild: GuildState;
  channelKey: ScopedKey;
  message: ChatMessage;
  index: number;
  continuation: boolean;
  showDayDivider: boolean;
  showNewDivider: boolean;
  mentioned: boolean;
  own: boolean;
  canManage: boolean;
  canReply: boolean;
  compact: boolean;
  editing: boolean;
  focusable: boolean;
  onEdit: (id: string | null) => void;
  onReply: (message: Message) => void;
  onDelete: (message: ChatMessage) => void;
}

function useAuthor(guild: GuildState, message: Message) {
  const member = guild.members[message.author.id];
  const user = member?.user ?? message.author;
  const topRole = member?.roleIds
    .map((id) => guild.roles[id])
    .filter((r) => r && r.color !== null)
    .sort((a, b) => b!.position - a!.position)[0];
  const color = roleColor(topRole?.color ?? null);
  // Role colours are user-chosen, so `.role-text` adjusts their lightness per theme to stay readable.
  const style = color ? ({ '--role-color': color } as CSSProperties) : undefined;
  return { user, name: displayName(user, member), style, colored: Boolean(color) };
}

export const MessageItem = memo(function MessageItem(props: Props) {
  const {
    guild,
    message,
    index,
    continuation,
    showDayDivider,
    showNewDivider,
    mentioned,
    own,
    canManage,
    canReply,
  } = props;
  const { compact, editing, focusable, onEdit, onReply, onDelete } = props;
  const { user, name, style, colored } = useAuthor(guild, message);
  const actionable = !message.pending && !message.failed;
  const canDelete = actionable && (own || canManage);
  const grouped = continuation && !showDayDivider;
  const time = new Date(message.createdAt).toISOString();

  const menu: MenuEntry[] = [
    actionable &&
      canReply && { label: 'Reply', icon: <CornerUpLeft />, hint: 'R', onSelect: () => onReply(message) },
    actionable &&
      own && { label: 'Edit message', icon: <Pencil />, hint: 'E', onSelect: () => onEdit(message.id) },
    {
      label: 'Copy text',
      icon: <Copy />,
      onSelect: () => void navigator.clipboard.writeText(message.content),
    },
    actionable && {
      label: 'Copy message ID',
      icon: <Fingerprint />,
      onSelect: () => void navigator.clipboard.writeText(message.id),
    },
    'separator',
    canDelete && {
      label: 'Delete message',
      icon: <Trash2 />,
      hint: 'Del',
      danger: true,
      onSelect: () => onDelete(message),
    },
  ];

  const label = [
    name,
    formatTimestamp(message.createdAt),
    message.editedAt && 'edited',
    message.replyTo && `replying to ${message.replyTo.author?.displayName ?? 'a deleted message'}`,
  ]
    .filter(Boolean)
    .join(', ');

  const nameButton = (
    <UserPopover guild={guild} user={user}>
      <button
        type="button"
        tabIndex={-1}
        className={clsx('truncate font-semibold hover:underline', colored && 'role-text')}
        style={style}
      >
        {name}
      </button>
    </UserPopover>
  );

  return (
    <div>
      {showDayDivider && <DayDivider ms={message.createdAt} />}
      {showNewDivider && <NewDivider />}
      <ContextMenuArea items={menu}>
        <article
          data-message-index={index}
          tabIndex={focusable ? 0 : -1}
          aria-label={label}
          aria-setsize={-1}
          className={clsx(
            'group relative mx-2 rounded-[var(--radius-md)] pr-16 transition-colors duration-100 focus-visible:bg-hover focus-visible:outline-offset-[-2px]',
            compact ? 'py-[3px] pl-3' : grouped ? 'py-0.5 pl-[4rem]' : 'mt-3 pt-1 pb-0.5 pl-[4rem]',
            mentioned ? 'bg-mention shadow-[inset_3px_0_0_var(--accent)]' : 'hover:bg-hover',
            message.pending && 'opacity-60',
          )}
        >
          {compact ? (
            <div className="flex items-baseline gap-3">
              <time
                dateTime={time}
                className="w-11 shrink-0 text-right text-[0.6875rem] text-fg-subtle tabular-nums"
              >
                {formatTime(message.createdAt)}
              </time>
              <span className="flex max-w-44 shrink-0 text-[0.9375rem]">{nameButton}</span>
              <div className="min-w-0 flex-1">
                {message.replyTo && <ReplyPreview guild={guild} reply={message.replyTo} compact />}
                <Body {...props} />
              </div>
            </div>
          ) : (
            <>
              {message.replyTo && <ReplyPreview guild={guild} reply={message.replyTo} />}
              {grouped ? (
                <time
                  dateTime={time}
                  className="absolute top-1 left-0 w-[4rem] pr-3 text-right text-[0.6875rem] leading-[1.375rem] text-fg-subtle tabular-nums opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {formatTime(message.createdAt)}
                </time>
              ) : (
                <>
                  <UserPopover guild={guild} user={user}>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={`View profile of ${name}`}
                      className={clsx(
                        'press absolute left-3 rounded-full',
                        message.replyTo ? 'top-7' : 'top-1.5',
                      )}
                    >
                      <Avatar name={name} seed={user.id} url={user.avatarUrl} size={40} />
                    </button>
                  </UserPopover>
                  <h3 className="flex min-w-0 items-baseline gap-2 leading-[1.375rem]">
                    {nameButton}
                    {!user.local && (
                      <span
                        className="shrink-0 text-xs text-fg-subtle"
                        title={`${user.handle}@${user.instance}`}
                      >
                        @{user.instance}
                      </span>
                    )}
                    <Tooltip content={formatFull(message.createdAt)}>
                      <time dateTime={time} className="shrink-0 text-xs text-fg-subtle">
                        {formatTimestamp(message.createdAt)}
                      </time>
                    </Tooltip>
                  </h3>
                </>
              )}
              <Body {...props} />
            </>
          )}

          {actionable && !editing && (
            <div
              role="toolbar"
              aria-label="Message actions"
              className="absolute -top-4 right-3 z-10 hidden items-center gap-0.5 rounded-[var(--radius-md)] border border-line bg-elevated p-0.5 shadow-pop group-focus-within:flex group-hover:flex has-[[data-state=open]]:flex"
            >
              {canReply && (
                <IconButton
                  label="Reply"
                  size="sm"
                  tooltipSide="top"
                  tabIndex={-1}
                  onClick={() => onReply(message)}
                >
                  <CornerUpLeft className="size-4" aria-hidden="true" />
                </IconButton>
              )}
              {own && (
                <IconButton
                  label="Edit"
                  size="sm"
                  tooltipSide="top"
                  tabIndex={-1}
                  onClick={() => onEdit(message.id)}
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </IconButton>
              )}
              <Dropdown
                align="end"
                items={menu}
                trigger={
                  <IconButton label="More" size="sm" tooltipSide="top" tabIndex={-1}>
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </IconButton>
                }
              />
            </div>
          )}

          {message.failed && <FailedNotice {...props} />}
        </article>
      </ContextMenuArea>
    </div>
  );
});

function FailedNotice({ channelKey, message }: Props) {
  return (
    <p role="alert" className="mt-1 flex items-center gap-2 text-sm text-danger">
      <AlertCircle className="size-4" aria-hidden="true" /> Not sent.
      <Button variant="link" size="sm" onClick={() => void retryMessage(channelKey, message)}>
        Retry
      </Button>
      <Button
        variant="link"
        size="sm"
        className="text-fg-muted!"
        onClick={() => discardMessage(channelKey, message)}
      >
        Discard
      </Button>
    </p>
  );
}

function Body({ guild, channelKey, message, editing, onEdit }: Props) {
  const invites = useMemo(() => findInviteLinks(message.content).slice(0, 3), [message.content]);
  // Invite links become cards, so their raw text is hidden from the message itself.
  const text = useMemo(
    () => invites.reduce((content, invite) => content.split(invite.match).join(''), message.content).trim(),
    [invites, message.content],
  );

  if (editing) return <EditBox channelKey={channelKey} message={message} onDone={() => onEdit(null)} />;
  return (
    <div className="text-[0.9375rem]">
      {text && <Markdown content={text} guild={guild} />}
      {message.editedAt && (
        <Tooltip content={`Edited ${formatFull(message.editedAt)}`}>
          <span className="ml-1 text-[0.6875rem] text-fg-subtle select-none" tabIndex={-1}>
            (edited)
          </span>
        </Tooltip>
      )}
      {invites.map((invite) => (
        <InviteEmbed key={`${invite.instance}/${invite.code}`} invite={invite} />
      ))}
    </div>
  );
}

function EditBox({
  channelKey,
  message,
  onDone,
}: {
  channelKey: ScopedKey;
  message: Message;
  onDone: () => void;
}) {
  const [value, setValue] = useState(message.content);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [value]);

  const save = async () => {
    const content = value.trim();
    if (!content || content === message.content) return onDone();
    setSaving(true);
    try {
      await editMessage(channelKey, message.id, content);
      onDone();
      requestAnimationFrame(() => document.getElementById('composer')?.focus());
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      onDone();
      document.getElementById('composer')?.focus();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void save();
    }
  };

  return (
    <div className="mt-1">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Edit message"
        aria-describedby={`edit-hint-${message.id}`}
        disabled={saving}
        rows={1}
        className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-sunken px-3 py-2 text-[0.9375rem] leading-[1.375] focus-visible:border-[var(--focus)] focus-visible:outline-none"
      />
      <p id={`edit-hint-${message.id}`} className="mt-1 text-xs text-fg-subtle">
        Escape to{' '}
        <button type="button" className="text-accent-text hover:underline" onClick={onDone}>
          cancel
        </button>{' '}
        · Enter to{' '}
        <button type="button" className="text-accent-text hover:underline" onClick={() => void save()}>
          save
        </button>
        {error && <span className="ml-2 text-danger">{error}</span>}
      </p>
    </div>
  );
}

/** Reply previews are a single line, so markdown and mention tokens are flattened to plain text. */
function previewText(content: string, guild: GuildState): string {
  return content
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/<@(\d+)>/g, (_, id: string) => {
      const member = guild.members[id];
      return `@${member ? displayName(member.user, member) : 'unknown'}`;
    })
    .replace(/<#(\d+)>/g, (_, id: string) => `#${guild.channels[id]?.name ?? 'unknown'}`)
    .replace(/(\*\*|__|~~|\|\||`|^> ?)/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ReplyPreview({
  guild,
  reply,
  compact,
}: {
  guild: GuildState;
  reply: NonNullable<Message['replyTo']>;
  compact?: boolean;
}) {
  const member = reply.author ? guild.members[reply.author.id] : undefined;
  const name = reply.author ? displayName(reply.author, member) : null;
  return (
    <div className="relative mb-0.5 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-fg-subtle">
      {!compact && (
        <span
          aria-hidden="true"
          className="absolute top-[0.6875rem] -left-[2.125rem] h-2.5 w-7 rounded-tl-[6px] border-t-2 border-l-2 border-line-strong"
        />
      )}
      {reply.deleted || !reply.author ? (
        <span className="italic">Original message was deleted</span>
      ) : (
        <>
          <Avatar name={name!} seed={reply.author.id} url={reply.author.avatarUrl} size={16} />
          <span className="shrink-0 font-semibold whitespace-nowrap text-fg-muted">{name}</span>
          <span className="min-w-0 truncate">{previewText(reply.content, guild)}</span>
        </>
      )}
    </div>
  );
}

function DayDivider({ ms }: { ms: number }) {
  return (
    <div
      role="separator"
      aria-label={formatDay(ms)}
      className="mx-4 mt-6 mb-1 flex items-center gap-3 text-[0.6875rem] font-semibold text-fg-subtle"
    >
      <span className="h-px flex-1 bg-line" />
      <span aria-hidden="true" className="rounded-full border border-line bg-panel px-2.5 py-0.5">
        {formatDay(ms)}
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function NewDivider() {
  return (
    <div role="separator" aria-label="New messages" className="mx-4 mt-3 flex items-center gap-2">
      <span className="h-px flex-1 bg-danger/70" />
      <span
        aria-hidden="true"
        className="rounded-full bg-danger-fill px-2 py-px text-[0.625rem] font-bold tracking-wider text-on-danger uppercase"
      >
        New
      </span>
    </div>
  );
}
