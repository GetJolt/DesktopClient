import { Limits, type Channel, type Member, type Message } from '@getjolt/protocol';
import clsx from 'clsx';
import { Lock, SendHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { session } from '@/lib/client';
import { address, displayName } from '@/lib/format';
import type { ScopedKey } from '@/lib/keys';
import { notifyTyping, sendMessage } from '@/store/actions';
import type { GuildState } from '@/store/data';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/Button';

interface Props {
  guild: GuildState;
  channel: Channel;
  channelKey: ScopedKey;
  canSend: boolean;
  canMentionEveryone: boolean;
  replyTo: Message | null;
  onClearReply: () => void;
  onEditLast: (messageId: string) => void;
}

interface Suggestion {
  key: string;
  label: string;
  detail: string;
  insert: string;
  member?: Member;
}

const drafts = new Map<ScopedKey, string>();
const MENTION_QUERY = /(^|\s)@([\w.-]{0,32})$/;

/**
 * Mentions are typed as `@handle` (or `@handle@instance` when two members share a handle) and turned into
 * `<@id>` tokens on send, so the text box stays readable.
 */
function encodeMentions(text: string, guild: GuildState): string {
  const tokens = new Map<string, string>();
  const handles = new Map<string, number>();
  for (const m of Object.values(guild.members))
    handles.set(m.user.handle, (handles.get(m.user.handle) ?? 0) + 1);
  for (const m of Object.values(guild.members)) {
    tokens.set(`@${address(m.user)}`, m.user.id);
    if (handles.get(m.user.handle) === 1) tokens.set(`@${m.user.handle}`, m.user.id);
  }
  return text.replace(/(^|[\s(])(@[\w.-]+(?:@[\w.:-]+)?)/g, (match, lead: string, token: string) => {
    const id = tokens.get(token.toLowerCase());
    return id ? `${lead}<@${id}>` : match;
  });
}

export function Composer({
  guild,
  channel,
  channelKey,
  canSend,
  canMentionEveryone,
  replyTo,
  onClearReply,
  onEditLast,
}: Props) {
  const [value, setValue] = useState(() => drafts.get(channelKey) ?? '');
  const [query, setQuery] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    drafts.set(channelKey, value);
  }, [channelKey, value]);

  useEffect(() => {
    if (canSend) ref.current?.focus();
  }, [channelKey, canSend]);

  useEffect(() => {
    if (replyTo) ref.current?.focus();
  }, [replyTo]);

  useEffect(() => {
    const insert = (event: Event) => {
      const el = ref.current;
      if (!el) return;
      const text = (event as CustomEvent<string>).detail;
      const start = el.selectionStart;
      const before = el.value.slice(0, start);
      const spacer = before && !/\s$/.test(before) ? ' ' : '';
      const next = before + spacer + text + el.value.slice(el.selectionEnd);
      setValue(next);
      requestAnimationFrame(() => {
        el.focus();
        const caret = before.length + spacer.length + text.length;
        el.setSelectionRange(caret, caret);
      });
    };
    document.addEventListener('jolt:insert-text', insert);
    return () => document.removeEventListener('jolt:insert-text', insert);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, window.innerHeight * 0.4)}px`;
  }, [value]);

  const suggestions = useMemo<Suggestion[]>(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    const handles = new Map<string, number>();
    const members = Object.values(guild.members);
    for (const m of members) handles.set(m.user.handle, (handles.get(m.user.handle) ?? 0) + 1);

    const matches: Suggestion[] = members
      .filter((m) =>
        [m.user.handle, m.user.displayName, m.nickname ?? ''].some((s) => s.toLowerCase().includes(q)),
      )
      .sort((a, b) => Number(!a.user.handle.startsWith(q)) - Number(!b.user.handle.startsWith(q)))
      .slice(0, 8)
      .map((m) => ({
        key: m.user.id,
        label: displayName(m.user, m),
        detail: address(m.user),
        insert: handles.get(m.user.handle) === 1 ? `@${m.user.handle}` : `@${address(m.user)}`,
        member: m,
      }));
    if (canMentionEveryone) {
      for (const special of ['everyone', 'here']) {
        if (special.startsWith(q)) {
          matches.push({
            key: special,
            label: `@${special}`,
            detail: special === 'everyone' ? 'Notify everyone in this channel' : 'Notify everyone online',
            insert: `@${special}`,
          });
        }
      }
    }
    return matches;
  }, [query, guild.members, canMentionEveryone]);

  const updateQuery = (text: string, caret: number) => {
    const match = MENTION_QUERY.exec(text.slice(0, caret));
    setQuery(match ? match[2]! : null);
    setSelected(0);
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const el = ref.current;
    if (!el) return;
    const caret = el.selectionStart;
    const before = value.slice(0, caret).replace(/@[\w.-]*$/, `${suggestion.insert} `);
    const next = before + value.slice(caret);
    setValue(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(before.length, before.length);
    });
  };

  const send = () => {
    const content = value.trim();
    if (!content || content.length > Limits.messageLength) return;
    void sendMessage(channelKey, encodeMentions(content, guild), replyTo);
    setValue('');
    setQuery(null);
    onClearReply();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        setSelected((s) => (s + delta + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[selected]!);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    } else if (e.key === 'Escape' && replyTo) {
      e.preventDefault();
      onClearReply();
    } else if (e.key === 'ArrowUp' && value === '') {
      const me = session.state.me[guild.instance];
      const mine = [...(session.state.messages[channelKey]?.messages ?? [])]
        .reverse()
        .find((m) => m.author.id === me?.id && !m.pending && !m.failed);
      if (mine) {
        e.preventDefault();
        onEditLast(mine.id);
      }
    }
  };

  if (!canSend) {
    return (
      <div
        className="flex h-12 items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 text-sm text-fg-subtle"
        data-region="composer"
      >
        <Lock className="size-4" aria-hidden="true" />
        You don't have permission to send messages in #{channel.name}.
      </div>
    );
  }

  const remaining = Limits.messageLength - value.length;
  const replyName = replyTo ? displayName(replyTo.author, guild.members[replyTo.author.id]) : '';
  const listboxId = `mentions-${channel.id}`;

  return (
    <div className="relative" data-region="composer">
      {suggestions.length > 0 && (
        <div className="animate-pop absolute right-0 bottom-full left-0 mb-2 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-elevated shadow-pop">
          <p className="eyebrow px-3 pt-2.5 pb-1">Members</p>
          <ul id={listboxId} role="listbox" aria-label="Mention suggestions" className="p-1">
            {suggestions.map((s, i) => (
              <li
                key={s.key}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === selected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s);
                }}
                onMouseEnter={() => setSelected(i)}
                className={clsx(
                  'flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-sm',
                  i === selected && 'bg-active',
                )}
              >
                {s.member ? (
                  <Avatar name={s.label} seed={s.member.user.id} url={s.member.user.avatarUrl} size={24} />
                ) : (
                  <span
                    className="flex size-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-text"
                    aria-hidden="true"
                  >
                    @
                  </span>
                )}
                <span className="font-medium">{s.label}</span>
                <span className="ml-auto truncate text-xs text-fg-subtle">{s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-raised shadow-[var(--highlight),0_6px_20px_-12px_rgb(0_0_0/0.5)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--focus)] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--focus)_20%,transparent)]">
        {replyTo && (
          <div className="flex items-center gap-2 border-b border-line bg-accent-soft px-4 py-1.5 text-[0.8125rem] text-fg-muted">
            <span className="min-w-0 flex-1 truncate">
              Replying to <strong className="font-semibold text-fg">{replyName}</strong>
            </span>
            <IconButton label="Cancel reply (Esc)" size="sm" tooltipSide="top" onClick={onClearReply}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </div>
        )}
        <div className="flex items-end gap-2 pr-1.5">
          <textarea
            id="composer"
            ref={ref}
            value={value}
            rows={1}
            spellCheck
            placeholder={`Message #${channel.name}`}
            aria-label={replyTo ? `Reply to ${replyName} in #${channel.name}` : `Message #${channel.name}`}
            aria-autocomplete="list"
            aria-controls={suggestions.length ? listboxId : undefined}
            aria-activedescendant={suggestions.length ? `${listboxId}-${selected}` : undefined}
            aria-expanded={suggestions.length > 0}
            role="combobox"
            onChange={(e) => {
              setValue(e.target.value);
              updateQuery(e.target.value, e.target.selectionStart);
              if (e.target.value) notifyTyping(channelKey);
            }}
            onKeyDown={onKeyDown}
            onClick={(e) => updateQuery(value, e.currentTarget.selectionStart)}
            onBlur={() => setQuery(null)}
            className="max-h-[40vh] min-h-11 flex-1 resize-none bg-transparent py-[0.6875rem] pl-4 text-[0.9375rem] leading-[1.375] placeholder:text-fg-subtle focus-visible:outline-none"
          />
          {remaining < 500 && (
            <span
              className={clsx('pb-3 text-xs tabular-nums', remaining < 0 ? 'text-danger' : 'text-fg-subtle')}
            >
              {remaining}
            </span>
          )}
          <IconButton
            label="Send message (Enter)"
            tooltipSide="top"
            className={clsx(
              'mb-[0.4375rem]',
              value.trim() &&
                remaining >= 0 &&
                'bg-accent! text-on-accent! shadow-[0_4px_14px_-4px_var(--accent-glow)]',
            )}
            disabled={!value.trim() || remaining < 0}
            onClick={send}
          >
            <SendHorizontal className="size-[1.125rem]" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
