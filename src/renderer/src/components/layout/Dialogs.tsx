import { lazy, Suspense } from 'react';
import { useUi } from '@/store/ui';
import { ChannelDialog } from '../channels/ChannelDialog';
import { AddGuildDialog } from '../guilds/AddGuildDialog';
import { InviteDialog } from '../guilds/InviteDialog';
import { ModerateDialog, NicknameDialog, ProfileDialog } from '../members/MemberDialogs';
import { QuickSwitcher } from './QuickSwitcher';
import { ComposeDialog, Lightbox } from '../social/SocialDialogs';
import { ShortcutsDialog } from './ShortcutsDialog';

const UserSettings = lazy(() =>
  import('../settings/UserSettings').then((m) => ({ default: m.UserSettings })),
);
const GuildSettings = lazy(() =>
  import('../guilds/GuildSettings').then((m) => ({ default: m.GuildSettings })),
);

export function Dialogs() {
  const dialog = useUi((s) => s.dialog);
  const close = useUi((s) => s.closeDialog);
  const onOpenChange = (open: boolean) => !open && close();
  if (!dialog) return null;

  switch (dialog.type) {
    case 'addGuild':
      return <AddGuildDialog initialInvite={dialog.inviteLink} onOpenChange={onOpenChange} />;
    case 'invite':
      return (
        <InviteDialog guildKey={dialog.guildKey} channelId={dialog.channelId} onOpenChange={onOpenChange} />
      );
    case 'channel':
      return <ChannelDialog {...dialog} onOpenChange={onOpenChange} />;
    case 'compose':
      return (
        <ComposeDialog
          replyToId={dialog.replyToId}
          quoteId={dialog.quoteId}
          onClose={() => onOpenChange(false)}
        />
      );
    case 'lightbox':
      return <Lightbox postId={dialog.postId} index={dialog.index} onClose={() => onOpenChange(false)} />;
    case 'quickSwitcher':
      return <QuickSwitcher onOpenChange={onOpenChange} />;
    case 'shortcuts':
      return <ShortcutsDialog onOpenChange={onOpenChange} />;
    case 'profile':
      return <ProfileDialog guildKey={dialog.guildKey} userId={dialog.userId} onOpenChange={onOpenChange} />;
    case 'nickname':
      return <NicknameDialog guildKey={dialog.guildKey} userId={dialog.userId} onOpenChange={onOpenChange} />;
    case 'moderate':
      return (
        <ModerateDialog
          guildKey={dialog.guildKey}
          userId={dialog.userId}
          action={dialog.action}
          onOpenChange={onOpenChange}
        />
      );
    case 'settings':
      return (
        <Suspense fallback={null}>
          <UserSettings initialTab={dialog.tab} onOpenChange={onOpenChange} />
        </Suspense>
      );
    case 'guildSettings':
      return (
        <Suspense fallback={null}>
          <GuildSettings guildKey={dialog.guildKey} onOpenChange={onOpenChange} />
        </Suspense>
      );
  }
}
