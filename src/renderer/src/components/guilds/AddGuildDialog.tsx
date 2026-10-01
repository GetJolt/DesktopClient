import type { Invite } from '@getjolt/protocol';
import { ArrowLeft, Globe, Link2, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { client } from '@/lib/client';
import { initials, pluralize } from '@/lib/format';
import { createGuild, errorMessage, joinInvite, parseInvite, previewInvite } from '@/store/actions';
import { useUi } from '@/store/ui';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field, Input } from '../ui/Field';

type Step = 'choose' | 'create' | 'join';

export function AddGuildDialog({
  initialInvite,
  onOpenChange,
}: {
  initialInvite?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState<Step>(initialInvite !== undefined ? 'join' : 'choose');

  const titles: Record<Step, string> = {
    choose: 'Add a server',
    create: 'Create your server',
    join: 'Join a server',
  };
  const descriptions: Record<Step, string> = {
    choose: 'Start your own, or join one with an invite.',
    create: `It will be hosted on ${client.homeDomain}. You can change its name later.`,
    join: 'Invites work across instances: your account comes with you.',
  };

  return (
    <Dialog open onOpenChange={onOpenChange} title={titles[step]} description={descriptions[step]}>
      {step === 'choose' && (
        <div className="grid gap-3">
          <Choice
            icon={<Plus className="size-5" />}
            title="Create a server"
            body="For your friends, team or community."
            onClick={() => setStep('create')}
          />
          <Choice
            icon={<Link2 className="size-5" />}
            title="Join with an invite"
            body="Paste an invite link from any Jolt instance."
            onClick={() => setStep('join')}
          />
        </div>
      )}
      {step === 'create' && <CreateForm onBack={() => setStep('choose')} />}
      {step === 'join' && <JoinForm initial={initialInvite ?? ''} onBack={() => setStep('choose')} />}
    </Dialog>
  );
}

function Choice({
  icon,
  title,
  body,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card press flex items-center gap-4 p-4 text-left transition-colors hover:border-line-strong hover:bg-raised-strong"
    >
      <span
        className="flex size-11 items-center justify-center rounded-[var(--radius-lg)] bg-accent text-on-accent"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-fg-muted">{body}</span>
      </span>
    </button>
  );
}

function CreateForm({ onBack }: { onBack: () => void }) {
  const me = client.homeDomain;
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useUi((s) => s.closeDialog);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createGuild(name.trim());
      close();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex justify-center">
        <span
          className="flex size-20 items-center justify-center rounded-3xl bg-raised-strong text-2xl font-semibold"
          aria-hidden="true"
        >
          {name.trim() ? initials(name, 3) : <Users className="size-8 text-fg-subtle" />}
        </span>
      </div>
      <Field label="Server name" error={error} hint={`Hosted on ${me}`}>
        {(props) => (
          <Input
            {...props}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={100}
            placeholder="My awesome server"
          />
        )}
      </Field>
      <div className="flex justify-between">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={onBack}>
          Back
        </Button>
        <Button type="submit" loading={busy} disabled={name.trim().length < 2}>
          Create server
        </Button>
      </div>
    </form>
  );
}

function JoinForm({ initial, onBack }: { initial: string; onBack: () => void }) {
  const [link, setLink] = useState(initial);
  const [lookup, setLookup] = useState<{ key: string; invite?: Invite; error?: string } | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const close = useUi((s) => s.closeDialog);
  const parsed = useMemo(() => parseInvite(link), [link]);
  const key = parsed ? `${parsed.instance}/${parsed.code}` : null;
  const current = lookup && lookup.key === key ? lookup : null;
  const preview = current?.invite ?? null;
  const checking = key !== null && !current;
  const error = joinError ?? current?.error ?? null;

  useEffect(() => {
    if (!parsed || !key) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      previewInvite(parsed)
        .then((invite) => !cancelled && setLookup({ key, invite }))
        .catch((e) => !cancelled && setLookup({ key, error: errorMessage(e) }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parsed, key]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed) return setJoinError('That doesn’t look like an invite link.');
    setJoining(true);
    setJoinError(null);
    try {
      await joinInvite(parsed);
      close();
    } catch (err) {
      setJoinError(errorMessage(err));
      setJoining(false);
    }
  };

  const foreign = parsed && parsed.instance !== client.homeDomain;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field
        label="Invite link"
        error={link && !parsed ? 'Paste a full invite link, like jolt://invite/joltapp.org/AbC123' : error}
        hint="Links look like jolt://invite/joltapp.org/AbC123 or https://joltapp.org/invite/AbC123"
      >
        {(props) => (
          <Input
            {...props}
            value={link}
            onChange={(e) => (setLink(e.target.value), setJoinError(null))}
            autoFocus
            spellCheck={false}
            placeholder="jolt://invite/joltapp.org/AbC123"
          />
        )}
      </Field>

      <div aria-live="polite">
        {checking && !preview && <p className="text-sm text-fg-subtle">Looking up invite…</p>}
        {preview && (
          <div className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-line bg-sunken p-4">
            <span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-raised-strong font-semibold"
              aria-hidden="true"
            >
              {initials(preview.guild.name, 3)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{preview.guild.name}</p>
              <p className="text-sm text-fg-muted">{pluralize(preview.guild.memberCount, 'member')}</p>
              {foreign && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-fg-subtle">
                  <Globe className="size-3.5" aria-hidden="true" /> Hosted on {preview.instance}. You'll join
                  with your {client.homeDomain} account.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={onBack}>
          Back
        </Button>
        <Button type="submit" loading={joining} disabled={!preview}>
          {preview ? `Join ${preview.guild.name}` : 'Join server'}
        </Button>
      </div>
    </form>
  );
}
