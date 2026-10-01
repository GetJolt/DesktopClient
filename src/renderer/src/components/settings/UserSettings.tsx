import type { SessionInfo } from '@jolt/protocol';
import { LogOut, Monitor } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { client, session } from '@/lib/client';
import { address, avatarGradient, formatTimestamp } from '@/lib/format';
import { errorMessage, signOut } from '@/store/actions';
import { useData } from '@/store/data';
import { useUi, type SettingsTab, type ThemePref } from '@/store/ui';
import { Avatar } from '../ui/Avatar';
import { Button, Spinner } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { Field, Input, SwitchRow, Textarea } from '../ui/Field';
import { AboutTab } from './AboutTab';
import { RadioCards, SettingsLayout, SettingsSection } from './SettingsLayout';

export function UserSettings({
  initialTab,
  onOpenChange,
}: {
  initialTab: SettingsTab;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<string>(initialTab);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  return (
    <>
      <SettingsLayout
        title="User settings"
        heading="User settings"
        tab={tab}
        onTabChange={setTab}
        onOpenChange={onOpenChange}
        tabs={[
          { id: 'account', label: 'My account', content: <AccountTab /> },
          { id: 'appearance', label: 'Appearance', content: <AppearanceTab /> },
          { id: 'accessibility', label: 'Accessibility', content: <AccessibilityTab /> },
          { id: 'devices', label: 'Devices', content: <DevicesTab /> },
          { id: 'instances', label: 'Connected instances', content: <InstancesTab /> },
          { id: 'about', label: 'About & updates', content: <AboutTab /> },
        ]}
        footer={
          <Button
            variant="ghost"
            className="w-full justify-start text-danger!"
            icon={<LogOut className="size-4" />}
            onClick={() => setConfirmSignOut(true)}
          >
            Sign out
          </Button>
        }
      />
      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out?"
        description="You'll need your password to sign back in on this device."
        confirmLabel="Sign out"
        danger
        onConfirm={async () => {
          useUi.getState().closeDialog();
          await signOut();
        }}
      />
    </>
  );
}

function AccountTab() {
  const home = client.homeDomain!;
  const me = useData((s) => s.me[home]);
  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  if (!me) return null;
  const dirty = displayName !== me.displayName || bio !== me.bio;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await session.updateProfile({ displayName: displayName.trim(), bio });
      setMessage({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="max-w-xl">
      <div className="mb-8 flex items-center gap-4 rounded-[var(--radius-lg)] bg-sunken p-5">
        <Avatar name={displayName || me.handle} seed={me.id} url={me.avatarUrl} size={72} />
        <div className="min-w-0">
          <p className="truncate text-xl font-bold">{displayName || me.handle}</p>
          <p className="truncate text-fg-muted">{address(me)}</p>
          <p className="mt-1 text-xs text-fg-subtle">Your address works on every Jolt instance.</p>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <Field label="Display name" hint="Shown next to your messages everywhere.">
          {(props) => (
            <Input
              {...props}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={32}
            />
          )}
        </Field>
        <Field label="About me" hint={`${190 - bio.length} characters left`}>
          {(props) => (
            <Textarea {...props} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={190} />
          )}
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy} disabled={!dirty || !displayName.trim()}>
            Save changes
          </Button>
          {message && (
            <p role="status" className={message.ok ? 'text-sm text-online' : 'text-sm text-danger'}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

const PREVIEW_PEOPLE = [
  { seed: 'preview-a', name: '#e879f9', lines: ['78%', '52%'] },
  { seed: 'preview-b', name: '#38bdf8', lines: ['64%'] },
  { seed: 'preview-c', name: '#c8f04b', lines: ['86%', '40%'] },
];

/** A miniature of the message list in each density, drawn with the live theme tokens. */
function DensityPreview({ compact }: { compact: boolean }) {
  return (
    <span
      className="flex h-[5.5rem] flex-col justify-center overflow-hidden border-b border-line bg-panel px-3.5"
      aria-hidden="true"
    >
      {compact ? (
        <span className="flex flex-col gap-[7px]">
          {PREVIEW_PEOPLE.flatMap((p) =>
            p.lines.map((width, i) => ({ ...p, width, key: `${p.seed}-${i}` })),
          ).map((row) => (
            <span key={row.key} className="flex items-center gap-1.5">
              <span className="h-1 w-3 shrink-0 rounded-full bg-fg-subtle/50" />
              <span className="h-1.5 w-7 shrink-0 rounded-full" style={{ background: row.name }} />
              <span className="h-1.5 rounded-full bg-fg-muted/45" style={{ width: row.width }} />
            </span>
          ))}
        </span>
      ) : (
        <span className="flex flex-col gap-2.5">
          {PREVIEW_PEOPLE.slice(0, 2).map((p) => (
            <span key={p.seed} className="flex gap-2">
              <span className="size-5 shrink-0 rounded-full" style={{ background: avatarGradient(p.seed) }} />
              <span className="flex flex-1 flex-col gap-[5px] pt-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-9 rounded-full" style={{ background: p.name }} />
                  <span className="h-1 w-5 rounded-full bg-fg-subtle/50" />
                </span>
                {p.lines.map((width) => (
                  <span key={width} className="h-1.5 rounded-full bg-fg-muted/45" style={{ width }} />
                ))}
              </span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function ThemePreview({ bg, side, fg, accent }: { bg: string; side: string; fg: string; accent: string }) {
  return (
    <span className="flex h-16" style={{ background: bg }} aria-hidden="true">
      <span className="w-5" style={{ background: side }} />
      <span className="flex flex-1 flex-col justify-center gap-1.5 px-2">
        <span className="h-1.5 w-3/4 rounded-full" style={{ background: fg }} />
        <span className="h-1.5 w-1/2 rounded-full" style={{ background: fg, opacity: 0.5 }} />
        <span className="h-1.5 w-1/3 rounded-full" style={{ background: accent }} />
      </span>
    </span>
  );
}

function AppearanceTab() {
  const { theme, density, fontScale, set } = useUi();
  return (
    <div className="max-w-2xl">
      <SettingsSection title="Theme">
        <RadioCards<ThemePref>
          name="Theme"
          value={theme}
          onChange={(value) => set({ theme: value })}
          options={[
            {
              value: 'system',
              label: 'Match system',
              preview: (
                <ThemePreview
                  bg="linear-gradient(135deg,#1b1c20 50%,#fff 50%)"
                  side="#0d0e10"
                  fg="#8f929c"
                  accent="#c8f04b"
                />
              ),
            },
            {
              value: 'dark',
              label: 'Dark',
              preview: <ThemePreview bg="#1b1c20" side="#0d0e10" fg="#ececf1" accent="#c8f04b" />,
            },
            {
              value: 'light',
              label: 'Light',
              preview: <ThemePreview bg="#ffffff" side="#e4e5ea" fg="#17181c" accent="#456300" />,
            },
            {
              value: 'contrast',
              label: 'High contrast',
              preview: <ThemePreview bg="#000" side="#000" fg="#fff" accent="#e4ff5c" />,
            },
          ]}
        />
      </SettingsSection>
      <SettingsSection title="Message display">
        <RadioCards
          name="Message display"
          value={density}
          onChange={(value) => set({ density: value })}
          columns={2}
          options={[
            {
              value: 'cozy',
              label: 'Cozy',
              description: 'Avatars and names on every group',
              preview: <DensityPreview compact={false} />,
            },
            {
              value: 'compact',
              label: 'Compact',
              description: 'More messages on screen',
              preview: <DensityPreview compact />,
            },
          ]}
        />
      </SettingsSection>
      <SettingsSection title="Text size" description="Scales all text and spacing in the app.">
        <div className="flex items-center gap-4">
          <span className="text-sm text-fg-subtle" aria-hidden="true">
            A
          </span>
          <input
            type="range"
            min={0.85}
            max={1.5}
            step={0.05}
            value={fontScale}
            onChange={(e) => set({ fontScale: Number(e.target.value) })}
            aria-label="Text size"
            aria-valuetext={`${Math.round(fontScale * 100)} percent`}
            className="flex-1 accent-[var(--accent)]"
          />
          <span className="text-xl text-fg-subtle" aria-hidden="true">
            A
          </span>
          <span className="w-12 text-right text-sm tabular-nums">{Math.round(fontScale * 100)}%</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => set({ fontScale: 1 })}
            disabled={fontScale === 1}
          >
            Reset
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}

function AccessibilityTab() {
  const { reducedMotion, announceMessages, underlineLinks, theme, set } = useUi();
  return (
    <div className="max-w-2xl divide-y divide-line">
      <SwitchRow
        label="Reduce motion"
        description={
          reducedMotion === 'system'
            ? 'Following your system setting.'
            : 'Turns off animations and smooth scrolling.'
        }
        checked={
          reducedMotion === 'on' ||
          (reducedMotion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        }
        onCheckedChange={(on) => set({ reducedMotion: on ? 'on' : 'off' })}
      />
      <SwitchRow
        label="High contrast"
        description="Maximum contrast colours with stronger outlines."
        checked={theme === 'contrast'}
        onCheckedChange={(on) => set({ theme: on ? 'contrast' : 'system' })}
      />
      <SwitchRow
        label="Always underline links"
        description="Makes links easier to spot without relying on colour."
        checked={underlineLinks}
        onCheckedChange={(on) => set({ underlineLinks: on })}
      />
      <SwitchRow
        label="Announce new messages"
        description="Screen readers read out new messages in the channel you're viewing."
        checked={announceMessages}
        onCheckedChange={(on) => set({ announceMessages: on })}
      />
      {reducedMotion !== 'system' && (
        <div className="py-3">
          <Button variant="link" onClick={() => set({ reducedMotion: 'system' })}>
            Follow system motion setting again
          </Button>
        </div>
      )}
    </div>
  );
}

function DevicesTab() {
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<SessionInfo | null>(null);

  const load = () =>
    client.home.rest
      .sessions()
      .then(setSessions)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    void load();
  }, []);

  if (error)
    return (
      <p role="alert" className="text-danger">
        {error}
      </p>
    );
  if (!sessions) return <Spinner label="Loading devices" />;

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-fg-muted">
        Devices signed in to your account. Signing one out also stops it reaching servers on other instances.
      </p>
      <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-4 p-4">
            <Monitor className="size-6 shrink-0 text-fg-subtle" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {s.deviceName}{' '}
                {s.current && (
                  <span className="ml-1 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent-text">
                    This device
                  </span>
                )}
              </p>
              <p className="text-sm text-fg-subtle">Last active {formatTimestamp(s.lastUsedAt)}</p>
            </div>
            {!s.current && (
              <Button variant="secondary" size="sm" onClick={() => setRevoking(s)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title="Sign out this device?"
        description={`${revoking?.deviceName} will need to sign in again.`}
        confirmLabel="Sign out device"
        danger
        onConfirm={async () => {
          if (revoking) await client.home.rest.revokeSession(revoking.id);
          await load();
        }}
      />
    </div>
  );
}

function InstancesTab() {
  const connections = useData((s) => s.connections);
  const home = client.homeDomain;
  const labels: Record<string, string> = {
    ready: 'Connected',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    idle: 'Idle',
    closed: 'Disconnected',
  };
  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-fg-muted">
        Your account lives on <strong className="text-fg">{home}</strong>. Jolt signs you in to other
        instances automatically when you join their servers.
      </p>
      <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line">
        {Object.entries(connections).map(([instance, state]) => (
          <li key={instance} className="flex items-center gap-3 p-4">
            <span
              className={
                state === 'ready' ? 'size-2.5 rounded-full bg-online' : 'size-2.5 rounded-full bg-idle'
              }
              aria-hidden="true"
            />
            <span className="flex-1 font-medium">{instance}</span>
            {instance === home && (
              <span className="rounded bg-raised-strong px-1.5 py-0.5 text-xs font-semibold">Home</span>
            )}
            <span className="text-sm text-fg-subtle">{labels[state] ?? state}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
