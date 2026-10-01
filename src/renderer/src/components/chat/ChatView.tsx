import { Permission, type Channel, type Message } from '@getjolt/protocol';
import { Hash, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/useGuild';
import { scoped } from '@/lib/keys';
import { errorMessage, loadMessages } from '@/store/actions';
import { useData, type GuildState } from '@/store/data';
import { useUi } from '@/store/ui';
import { IconButton } from '../ui/Button';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { TypingIndicator } from './TypingIndicator';

export function ChatView({ guild, channel }: { guild: GuildState; channel: Channel }) {
  const channelKey = scoped(guild.instance, channel.id);
  const loaded = useData((s) => s.messages[channelKey]?.loaded ?? false);
  const perms = usePermissions(guild, channel);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) loadMessages(channelKey).catch((e) => setLoadError(errorMessage(e)));
  }, [channelKey, loaded]);

  const focusComposer = useCallback(() => document.getElementById('composer')?.focus(), []);

  return (
    <>
      <ChannelHeader guild={guild} channel={channel} canInvite={perms.can(Permission.CREATE_INVITE)} />
      {loadError && !loaded ? (
        <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-fg-muted">{loadError}</p>
          <button
            type="button"
            className="font-medium text-accent-text hover:underline"
            onClick={() => {
              setLoadError(null);
              loadMessages(channelKey).catch((e) => setLoadError(errorMessage(e)));
            }}
          >
            Try again
          </button>
        </div>
      ) : (
        <MessageList
          guild={guild}
          channel={channel}
          channelKey={channelKey}
          canManage={perms.can(Permission.MANAGE_MESSAGES)}
          canSend={perms.can(Permission.SEND_MESSAGES)}
          editingId={editingId}
          onEdit={setEditingId}
          onReply={(m) => {
            setReplyTo(m);
            focusComposer();
          }}
          onExit={focusComposer}
        />
      )}
      <div className="shrink-0 px-4 pt-1 pb-1.5">
        <Composer
          guild={guild}
          channel={channel}
          channelKey={channelKey}
          canSend={perms.can(Permission.SEND_MESSAGES)}
          canMentionEveryone={perms.can(Permission.MENTION_EVERYONE)}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          onEditLast={setEditingId}
        />
        <TypingIndicator guild={guild} channelKey={channelKey} />
      </div>
    </>
  );
}

function ChannelHeader({
  guild,
  channel,
  canInvite,
}: {
  guild: GuildState;
  channel: Channel;
  canInvite: boolean;
}) {
  const showMembers = useUi((s) => s.showMemberList);
  const set = useUi((s) => s.set);
  const openDialog = useUi((s) => s.openDialog);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
      <Hash className="size-5 shrink-0 text-fg-subtle" strokeWidth={2.25} aria-hidden="true" />
      <h1 className="shrink-0 text-[0.9375rem] font-semibold">{channel.name}</h1>
      {channel.topic && (
        <>
          <span className="h-5 w-px shrink-0 bg-line-strong" aria-hidden="true" />
          <p className="min-w-0 truncate text-sm text-fg-muted" title={channel.topic}>
            {channel.topic}
          </p>
        </>
      )}
      <div className="ml-auto flex items-center gap-0.5">
        {canInvite && (
          <IconButton
            label="Invite people"
            onClick={() => openDialog({ type: 'invite', guildKey: guild.key, channelId: channel.id })}
          >
            <UserPlus className="size-5" aria-hidden="true" />
          </IconButton>
        )}
        <IconButton
          label={showMembers ? 'Hide member list' : 'Show member list'}
          aria-pressed={showMembers}
          active={showMembers}
          onClick={() => set({ showMemberList: !showMembers })}
        >
          <Users className="size-5" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
