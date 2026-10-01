import type { Channel, Message } from '@jolt/protocol';
import { ArrowDown, Hash } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { compareIds, type ScopedKey } from '@/lib/keys';
import { isSameDay } from '@/lib/format';
import { deleteMessage, loadMessages, markRead } from '@/store/actions';
import { emptyChannel, useData, type ChatMessage, type GuildState } from '@/store/data';
import { useUi } from '@/store/ui';
import { Spinner } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { MessageItem } from './MessageItem';

const START_INDEX = 1_000_000;
const GROUP_WINDOW_MS = 7 * 60 * 1000;

interface Props {
  guild: GuildState;
  channel: Channel;
  channelKey: ScopedKey;
  canManage: boolean;
  canSend: boolean;
  editingId: string | null;
  onEdit: (id: string | null) => void;
  onReply: (message: Message) => void;
  onExit: () => void;
}

export function isContinuation(prev: ChatMessage | undefined, message: ChatMessage): boolean {
  return Boolean(
    prev &&
    prev.author.id === message.author.id &&
    !message.replyTo &&
    !prev.failed &&
    message.createdAt - prev.createdAt < GROUP_WINDOW_MS &&
    isSameDay(prev.createdAt, message.createdAt),
  );
}

export function MessageList({
  guild,
  channel,
  channelKey,
  canManage,
  canSend,
  editingId,
  onEdit,
  onReply,
  onExit,
}: Props) {
  const state = useData((s) => s.messages[channelKey] ?? emptyChannel);
  const me = useData((s) => s.me[guild.instance]);
  const readState = useData((s) => s.readStates[channelKey]);
  const density = useUi((s) => s.density);
  const virtuoso = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const pinned = useRef(true);
  const scroller = useRef<HTMLElement | null>(null);

  // Content that loads after render (invite cards) grows the list; keep the newest message in view.
  const stickToBottom = useCallback(() => {
    if (!pinned.current) return;
    requestAnimationFrame(() => {
      const el = scroller.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    document.addEventListener('jolt:content-grew', stickToBottom);
    return () => document.removeEventListener('jolt:content-grew', stickToBottom);
  }, [stickToBottom]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);

  // Frozen when the channel opens, so the "new messages" line doesn't jump as we mark things read.
  const [unreadAnchor] = useState(() => readState?.lastReadMessageId ?? null);
  const firstUnreadId = useMemo(() => {
    if (!unreadAnchor) return null;
    return (
      state.messages.find((m) => !m.pending && compareIds(m.id, unreadAnchor) > 0 && m.author.id !== me?.id)
        ?.id ?? null
    );
  }, [state.messages, unreadAnchor, me]);

  const messages = state.messages;
  const latestId = [...messages].reverse().find((m) => !m.pending && !m.failed)?.id ?? null;

  useEffect(() => {
    if (!atBottom || !latestId) return;
    const ack = () => document.hasFocus() && markRead(channelKey, latestId);
    ack();
    window.addEventListener('focus', ack);
    return () => window.removeEventListener('focus', ack);
  }, [atBottom, latestId, channelKey]);

  const loadOlder = useCallback(() => {
    if (state.loaded && state.hasMoreBefore && !state.loading)
      void loadMessages(channelKey, 'older').catch(() => undefined);
  }, [state.loaded, state.hasMoreBefore, state.loading, channelKey]);

  const focusMessage = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(messages.length - 1, index));
      setFocusedIndex(clamped);
      virtuoso.current?.scrollIntoView({ index: clamped, behavior: 'auto' });
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(`[data-message-index="${clamped}"]`)
          ?.focus({ preventScroll: true }),
      );
    },
    [messages.length],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editingId) return;
    const target = event.target as HTMLElement;
    const indexAttr = target.closest<HTMLElement>('[data-message-index]')?.dataset.messageIndex;
    const index = indexAttr === undefined ? null : Number(indexAttr);
    const onMessage = index !== null && target.dataset.messageIndex !== undefined;

    if (event.key === 'Escape') {
      event.preventDefault();
      onExit();
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (!onMessage && index !== null) return;
      event.preventDefault();
      const delta = event.key === 'ArrowUp' ? -1 : 1;
      focusMessage(index === null ? messages.length - 1 : index + delta);
      return;
    }
    if (event.key === 'Home' && onMessage) {
      event.preventDefault();
      focusMessage(0);
      return;
    }
    if (event.key === 'End' && onMessage) {
      event.preventDefault();
      focusMessage(messages.length - 1);
      return;
    }
    if (!onMessage || index === null) return;
    const message = messages[index];
    if (!message || message.pending) return;
    const own = message.author.id === me?.id;
    if (event.key.toLowerCase() === 'r' && canSend) {
      event.preventDefault();
      onReply(message);
    } else if (event.key.toLowerCase() === 'e' && own) {
      event.preventDefault();
      onEdit(message.id);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && (own || canManage)) {
      event.preventDefault();
      setPendingDelete(message);
    }
  };

  const Scroller = useMemo(
    () =>
      forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Scroller(props, ref) {
        return (
          <div
            {...props}
            ref={ref}
            role="log"
            aria-label={`Messages in #${channel.name}`}
            aria-live="off"
            tabIndex={0}
            data-region-focus
            className="scroll-thin focus-visible:outline-offset-[-2px]"
          />
        );
      }),
    [channel.name],
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      data-region="messages"
      onKeyDown={(e) => {
        if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) pinned.current = false;
        onKeyDown(e);
      }}
      onWheel={(e) => {
        if (e.deltaY < 0) pinned.current = false;
      }}
      onPointerDown={(e) => {
        // Grabbing the scrollbar counts as taking control of the scroll position.
        if (e.target === e.currentTarget.querySelector('[role="log"]')) pinned.current = false;
      }}
    >
      {!state.loaded ? (
        <div className="flex flex-1 items-center justify-center text-fg-subtle">
          <Spinner label="Loading messages" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 flex-col justify-end pb-4">
          <ChannelIntro channel={channel} />
        </div>
      ) : (
        <Virtuoso
          ref={virtuoso}
          className="flex-1"
          data={messages}
          firstItemIndex={START_INDEX - messages.length}
          initialTopMostItemIndex={Math.max(0, messages.length - 1)}
          computeItemKey={(_, m) => (m.nonce && m.pending ? `n-${m.nonce}` : m.id)}
          followOutput={(bottom) => (bottom ? 'auto' : false)}
          atBottomStateChange={(bottom) => {
            if (bottom) pinned.current = true;
            setAtBottom(bottom);
          }}
          scrollerRef={(el) => (scroller.current = el instanceof HTMLElement ? el : null)}
          totalListHeightChanged={stickToBottom}
          atBottomThreshold={60}
          startReached={loadOlder}
          alignToBottom
          increaseViewportBy={{ top: 600, bottom: 300 }}
          components={{
            Scroller,
            Header: () =>
              state.hasMoreBefore ? (
                <div className="flex h-16 items-center justify-center text-fg-subtle">
                  {state.loading && <Spinner label="Loading older messages" />}
                </div>
              ) : null,
            Footer: () => <div className="h-4" />,
          }}
          itemContent={(virtualIndex, message) => {
            const index = virtualIndex - (START_INDEX - messages.length);
            const prev = messages[index - 1];
            // The intro sits with the first message rather than in the header, so alignToBottom
            // doesn't push it away from the conversation.
            const intro = index === 0 && !state.hasMoreBefore ? <ChannelIntro channel={channel} /> : null;
            return (
              <>
                {intro}
                <MessageItem
                  guild={guild}
                  channelKey={channelKey}
                  message={message}
                  index={index}
                  continuation={isContinuation(prev, message) && message.id !== firstUnreadId}
                  showDayDivider={!prev || !isSameDay(prev.createdAt, message.createdAt)}
                  showNewDivider={message.id === firstUnreadId}
                  mentioned={Boolean(me && (message.mentionIds.includes(me.id) || message.mentionEveryone))}
                  own={message.author.id === me?.id}
                  canManage={canManage}
                  canReply={canSend}
                  compact={density === 'compact'}
                  editing={editingId === message.id}
                  focusable={focusedIndex === index}
                  onEdit={onEdit}
                  onReply={onReply}
                  onDelete={setPendingDelete}
                />
              </>
            );
          }}
        />
      )}

      {!atBottom && state.loaded && (
        <button
          type="button"
          onClick={() => virtuoso.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' })}
          className="press animate-pop absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-elevated px-3.5 py-1.5 text-[0.8125rem] font-semibold shadow-pop hover:bg-raised-strong"
        >
          <ArrowDown className="size-4" aria-hidden="true" /> Jump to present
        </button>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete message?"
        description={
          <blockquote className="mt-2 line-clamp-4 rounded-[var(--radius-md)] border border-line bg-sunken p-3 text-fg">
            {pendingDelete?.content}
          </blockquote>
        }
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (pendingDelete) await deleteMessage(channelKey, pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function ChannelIntro({ channel }: { channel: Channel }) {
  return (
    <div className="animate-rise px-5 pt-10 pb-4">
      <div
        className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] border border-line bg-accent-soft text-accent-text shadow-highlight"
        aria-hidden="true"
      >
        <Hash className="size-7" strokeWidth={2.25} />
      </div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Welcome to #{channel.name}</h2>
      <p className="mt-1 max-w-prose text-fg-muted">
        This is the start of the #{channel.name} channel. {channel.topic}
      </p>
    </div>
  );
}
