import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { displayName } from '@/lib/format';
import type { ScopedKey } from '@/lib/keys';
import { errorMessage, rest } from '@/store/actions';
import { useData } from '@/store/data';
import { useUi } from '@/store/ui';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field, Input, Textarea } from '../ui/Field';
import { ProfileCard } from './ProfileCard';

interface Props {
  guildKey: ScopedKey;
  userId: string;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ guildKey, userId, onOpenChange }: Props) {
  const guild = useData((s) => s.guilds[guildKey]);
  const member = guild?.members[userId];
  if (!guild || !member) return null;
  return (
    <RadixDialog.Root open onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="animate-fade fixed inset-0 z-40 bg-overlay backdrop-blur-[3px]" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="animate-pop fixed top-1/2 left-1/2 z-50 w-[22rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-line bg-elevated shadow-modal"
        >
          <RadixDialog.Title className="sr-only">
            Profile of {displayName(member.user, member)}
          </RadixDialog.Title>
          <ProfileCard guild={guild} user={member.user} />
          <RadixDialog.Close
            aria-label="Close"
            className="press absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50"
          >
            <X className="size-4" aria-hidden="true" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function NicknameDialog({ guildKey, userId, onOpenChange }: Props) {
  const guild = useData((s) => s.guilds[guildKey]);
  const me = useData((s) => (guild ? s.me[guild.instance] : undefined));
  const member = guild?.members[userId];
  const [nickname, setNickname] = useState(member?.nickname ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useUi((s) => s.closeDialog);
  if (!guild || !member) return null;
  const isSelf = me?.id === userId;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await rest(guild.instance).updateMember(guild.guild.id, isSelf ? '@me' : userId, {
        nickname: nickname.trim() || null,
      });
      close();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      size="sm"
      title={isSelf ? 'Change your nickname' : `Nickname for ${member.user.displayName}`}
      description={`Only shown in ${guild.guild.name}.`}
      footer={
        <>
          {member.nickname && (
            <Button variant="ghost" className="mr-auto" onClick={() => setNickname('')}>
              Reset
            </Button>
          )}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="nickname-form" loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <form id="nickname-form" onSubmit={save}>
        <Field label="Nickname" error={error} hint={`Leave empty to use ${member.user.displayName}.`}>
          {(props) => (
            <Input
              {...props}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={member.user.displayName}
              maxLength={32}
              autoFocus
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}

export function ModerateDialog({
  guildKey,
  userId,
  action,
  onOpenChange,
}: Props & { action: 'kick' | 'ban' }) {
  const guild = useData((s) => s.guilds[guildKey]);
  const member = guild?.members[userId];
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useUi((s) => s.closeDialog);
  if (!guild || !member) return null;
  const name = displayName(member.user, member);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const api = rest(guild.instance);
      if (action === 'kick') await api.kickMember(guild.guild.id, userId);
      else await api.ban(guild.guild.id, userId, reason.trim() || undefined);
      close();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      size="sm"
      title={action === 'kick' ? `Kick ${name}?` : `Ban ${name}?`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" loading={busy} onClick={confirm}>
            {action === 'kick' ? 'Kick' : 'Ban'}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-sunken p-3">
        <Avatar name={name} seed={member.user.id} url={member.user.avatarUrl} size={40} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name}</p>
          <p className="truncate text-[0.8125rem] text-fg-subtle">
            {member.user.handle}@{member.user.instance}
          </p>
        </div>
      </div>
      <p className="mt-4 text-[0.9375rem] text-fg-muted">
        {action === 'kick'
          ? 'They will be removed from the server and can rejoin with a new invite.'
          : 'They will be removed and won’t be able to rejoin until you unban them.'}
      </p>
      {action === 'ban' && (
        <Field label="Reason" hint="Optional. Only moderators can see this." className="mt-4">
          {(props) => (
            <Textarea {...props} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={512} />
          )}
        </Field>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Dialog>
  );
}
