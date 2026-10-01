import { useEffect } from 'react';
import { session } from '@/lib/client';
import { useCurrentChannel, useCurrentGuild } from '@/hooks/useGuild';
import { useGlobalHotkeys } from '@/hooks/useHotkeys';
import { openFirstChannel, sortedTextChannels } from '@/store/actions';
import { useUi } from '@/store/ui';
import { ChannelSidebar } from '../channels/ChannelSidebar';
import { ChatView } from '../chat/ChatView';
import { GuildRail } from '../guilds/GuildRail';
import { MemberList } from '../members/MemberList';
import { FeedSidebar } from '../social/FeedSidebar';
import { HomeArea } from '../social/HomeArea';
import { ConnectionBanner } from './ConnectionBanner';
import { Dialogs } from './Dialogs';
import { UserPanel } from './UserPanel';

export function AppShell() {
  useGlobalHotkeys();
  const guild = useCurrentGuild();
  const channel = useCurrentChannel(guild);
  const showMembers = useUi((s) => s.showMemberList);
  const guildKey = useUi((s) => s.guildKey);

  // The notification badge needs a count before the user ever opens Notifications.
  useEffect(() => {
    void session.social.loadNotifications().catch(() => {});
    void session.social.loadLinks().catch(() => {});
  }, []);

  // Land on a channel when a guild is opened without one, or the remembered one was deleted.
  useEffect(() => {
    if (guild && !channel) openFirstChannel(guild.key);
  }, [guild, channel]);

  useEffect(() => {
    const step = (event: Event) => {
      if (!guild || !channel) return;
      const list = sortedTextChannels(guild.channels);
      const index = list.findIndex((c) => c.id === channel.id);
      const next = list[(index + (event as CustomEvent<number>).detail + list.length) % list.length];
      if (next) useUi.getState().openChannel(guild.key, next.id);
    };
    document.addEventListener('jolt:step-channel', step);
    return () => document.removeEventListener('jolt:step-channel', step);
  }, [guild, channel]);

  return (
    <div className="flex h-full bg-canvas">
      <a
        href="#composer"
        className="sr-only focus:not-sr-only focus:fixed focus:top-10 focus:left-24 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-on-accent"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('composer')?.focus();
        }}
      >
        Skip to message composer
      </a>

      <GuildRail />

      <div className="flex min-w-0 flex-1 overflow-hidden rounded-tl-[var(--radius-xl)] border-t border-l border-line bg-sunken shadow-[var(--highlight)]">
        <div className="flex w-68 shrink-0 flex-col">
          {guild ? <ChannelSidebar guild={guild} activeChannelId={channel?.id ?? null} /> : <FeedSidebar />}
          <UserPanel />
        </div>

        <main
          className="relative flex min-w-0 flex-1 flex-col border-l border-line bg-panel"
          aria-label={channel ? `#${channel.name}` : 'Home'}
        >
          <ConnectionBanner instance={guild?.instance} />
          {guild && channel ? (
            <ChatView key={`${guildKey}:${channel.id}`} guild={guild} channel={channel} />
          ) : guild ? (
            <EmptyGuild />
          ) : (
            <HomeArea />
          )}
        </main>

        {guild && channel && showMembers && <MemberList guild={guild} channel={channel} />}
      </div>

      <Dialogs />
    </div>
  );
}

function EmptyGuild() {
  return (
    <div className="flex flex-1 items-center justify-center p-8 text-center text-fg-muted">
      <p>This server has no text channels you can see yet.</p>
    </div>
  );
}
