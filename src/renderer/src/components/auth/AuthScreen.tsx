import { isValidInstance, normalizeInstance, type InstanceInfo } from '@jolt/protocol';
import { JoltApiError } from '@jolt/sdk';
import { ArrowLeft, Globe, Server, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { client, DEFAULT_INSTANCE } from '@/lib/client';
import { errorMessage, signIn } from '@/store/actions';
import { Button, Spinner } from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { Logo } from '../ui/Logo';

type Mode = 'login' | 'register';
type InstanceStatus =
  { state: 'checking' } | { state: 'ok'; info: InstanceInfo } | { state: 'error'; message: string };

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [instance, setInstance] = useState(DEFAULT_INSTANCE);
  const [editingInstance, setEditingInstance] = useState(false);
  const [probe, setProbe] = useState<{ instance: string; status: InstanceStatus } | null>(null);
  const status: InstanceStatus = probe && probe.instance === instance ? probe.status : { state: 'checking' };

  useEffect(() => {
    let cancelled = false;
    client
      .probe(instance)
      .instanceInfo()
      .then((info) => !cancelled && setProbe({ instance, status: { state: 'ok', info } }))
      .catch(
        () =>
          !cancelled &&
          setProbe({
            instance,
            status: {
              state: 'error',
              message: `Couldn't reach ${instance}. Check the address or try again later.`,
            },
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [instance]);

  return (
    <main className="flex h-full bg-panel">
      <aside className="relative hidden w-[44%] max-w-2xl flex-col justify-between overflow-hidden border-r border-line bg-canvas p-10 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage: 'radial-gradient(var(--line-strong) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse at 30% 40%, black 20%, transparent 75%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 -left-40 size-[38rem] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, var(--accent), transparent 62%)' }}
        />

        <div className="relative flex items-center gap-2.5">
          <Logo size={32} />
          <span className="text-lg font-bold tracking-tight">Jolt</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-[2.5rem] leading-[1.1] font-bold tracking-tight text-balance">
            Your communities, on servers you can trust.
          </h1>
          <p className="mt-4 max-w-sm text-fg-muted">
            Chat on the main instance or run your own. One account works everywhere.
          </p>
          <ConversationPreview />
        </div>

        <ul className="relative flex flex-wrap gap-2 text-[0.8125rem] text-fg-muted">
          <Feature icon={<Users className="size-3.5" />} text="Familiar servers and roles" />
          <Feature icon={<Server className="size-3.5" />} text="Self-hostable" />
          <Feature icon={<Globe className="size-3.5" />} text="Federated" />
          <Feature icon={<ShieldCheck className="size-3.5" />} text="Open source, no tracking" />
        </ul>
      </aside>

      <section className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="animate-pop w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={32} />
            <span className="text-lg font-bold">Jolt</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1.5 text-fg-muted">
            {mode === 'login' ? 'Sign in to pick up where you left off.' : 'It takes less than a minute.'}
          </p>

          <InstancePicker
            instance={instance}
            status={status}
            editing={editingInstance}
            onEdit={setEditingInstance}
            onChange={(value) => {
              setInstance(value);
              setEditingInstance(false);
            }}
          />

          {!editingInstance && (
            <AuthForm
              key={`${mode}-${instance}`}
              mode={mode}
              instance={instance}
              info={status.state === 'ok' ? status.info : null}
              disabled={status.state !== 'ok'}
            />
          )}

          <p className="mt-6 text-sm text-fg-muted">
            {mode === 'login' ? 'New here?' : 'Already have an account?'}{' '}
            <Button variant="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </Button>
          </p>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 shadow-highlight">
      <span className="text-accent-text" aria-hidden="true">
        {icon}
      </span>
      {text}
    </li>
  );
}

const PREVIEW = [
  {
    name: 'Alice Rivera',
    address: 'alice@jolt.chat',
    color: '#15803d',
    text: 'Design review in 10? Bringing the new mockups.',
  },
  {
    name: 'Bea Kim',
    address: 'bea@home.lan',
    color: '#a21caf',
    text: 'Joining from my own server. Feels just like home ⚡',
    foreign: true,
  },
  { name: 'Kai', address: 'kai@jolt.chat', color: '#1d4ed8', text: 'Nice! Saving you a seat in #general' },
];

/** Decorative: a glimpse of a conversation between people on different instances. */
function ConversationPreview() {
  return (
    <div aria-hidden="true" className="mt-10 max-w-md space-y-2.5">
      {PREVIEW.map((m, i) => (
        <div
          key={m.address}
          className="animate-rise card flex gap-3 p-3.5"
          style={{
            animationDelay: `${120 + i * 90}ms`,
            animationFillMode: 'backwards',
            marginLeft: i === 1 ? 28 : 0,
          }}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold text-white"
            style={{ background: m.color }}
          >
            {m.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)}
          </span>
          <div className="min-w-0">
            <p className="flex items-baseline gap-2 text-[0.8125rem]">
              <span className="font-semibold">{m.name}</span>
              <span className="truncate text-fg-subtle">{m.address}</span>
              {m.foreign && (
                <span className="flex items-center gap-1 rounded-full bg-accent-soft px-1.5 text-[0.6875rem] font-medium text-accent-text">
                  <Globe className="size-3" /> federated
                </span>
              )}
            </p>
            <p className="mt-0.5 text-sm text-fg-muted">{m.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function InstancePicker({
  instance,
  status,
  editing,
  onEdit,
  onChange,
}: {
  instance: string;
  status: InstanceStatus;
  editing: boolean;
  onEdit: (editing: boolean) => void;
  onChange: (instance: string) => void;
}) {
  const [draft, setDraft] = useState(instance);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      const value = normalizeInstance(draft);
      if (!isValidInstance(value)) return setError('Enter an address like jolt.chat or chat.example.org');
      onChange(value);
    };
    return (
      <form onSubmit={submit} className="card mt-6 p-4">
        <Field
          label="Instance address"
          error={error}
          hint="The server your account lives on. Self-hosters, enter yours here."
        >
          {(props) => (
            <Input
              ref={inputRef}
              {...props}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="jolt.chat"
              autoComplete="url"
              spellCheck={false}
            />
          )}
        </Field>
        <div className="mt-4 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="size-4" />}
            onClick={() => onEdit(false)}
          >
            Back
          </Button>
          <Button type="submit" size="sm" className="ml-auto">
            Use this instance
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="card mt-6 flex items-center gap-3 px-4 py-3" aria-live="polite">
      <Server className="size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {status.state === 'ok' ? status.info.name : instance}
        </p>
        <p className="truncate text-xs text-fg-subtle">
          {status.state === 'checking' && (
            <span className="inline-flex items-center gap-1.5">
              <Spinner /> Connecting to {instance}…
            </span>
          )}
          {status.state === 'ok' && instance}
          {status.state === 'error' && <span className="text-danger">{status.message}</span>}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(true)}
        aria-label={`Change instance, currently ${instance}`}
      >
        Change
      </Button>
    </div>
  );
}

function AuthForm({
  mode,
  instance,
  info,
  disabled,
}: {
  mode: Mode;
  instance: string;
  info: InstanceInfo | null;
  disabled: boolean;
}) {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const registrationClosed = mode === 'register' && info?.registration === 'closed';

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await signIn(mode, instance, handle, password, {
        displayName: displayName.trim() || undefined,
        inviteCode: inviteCode.trim() || undefined,
      });
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof JoltApiError) setFields(err.fields);
    } finally {
      setBusy(false);
    }
  };

  if (registrationClosed) {
    return (
      <p className="card mt-6 p-4 text-sm text-fg-muted">
        {info?.name} isn't accepting new accounts right now. You can pick a different instance above.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius-md)] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <Field
        label="Handle"
        error={fields.handle}
        hint={mode === 'register' ? `People will find you as handle@${instance}` : undefined}
      >
        {(props) => (
          <Input
            {...props}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            autoFocus
            spellCheck={false}
            required
          />
        )}
      </Field>
      {mode === 'register' && (
        <Field label="Display name" error={fields.displayName} hint="Optional. You can change it any time.">
          {(props) => (
            <Input
              {...props}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          )}
        </Field>
      )}
      <Field
        label="Password"
        error={fields.password}
        hint={mode === 'register' ? 'At least 8 characters.' : undefined}
      >
        {(props) => (
          <Input
            {...props}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
          />
        )}
      </Field>
      {mode === 'register' && info?.registration === 'invite' && (
        <Field label="Invite code" error={fields.inviteCode} hint="This instance is invite-only.">
          {(props) => (
            <Input {...props} value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
          )}
        </Field>
      )}
      <Button
        type="submit"
        size="lg"
        loading={busy}
        disabled={disabled || !handle || !password}
        className="mt-2 w-full"
      >
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  );
}
