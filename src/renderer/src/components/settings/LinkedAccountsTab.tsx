import type { LinkedAccount, LinkProvider } from '@getjolt/protocol';
import { errorMessage } from '@getjolt/sdk';
import { BadgeCheck, ExternalLink, Unlink } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { announce } from '@/lib/announcer';
import { session } from '@/lib/client';
import { useSocial } from '@/store/data';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { Field, Input, SwitchRow } from '../ui/Field';
import { SettingsSection } from './SettingsLayout';

const PROVIDERS: Record<LinkProvider, { name: string; label: string; placeholder: string; hint: string }> = {
  bluesky: {
    name: 'Bluesky',
    label: 'Your Bluesky handle',
    placeholder: 'name.bsky.social',
    hint: "You'll approve Jolt on Bluesky in your browser.",
  },
  mastodon: {
    name: 'Mastodon',
    label: 'Your Mastodon server',
    placeholder: 'mastodon.social',
    hint: 'Or any other Mastodon-compatible server. You approve Jolt there in your browser.',
  },
};

export function LinkedAccountsTab() {
  const links = useSocial((s) => s.linkedAccounts);
  const [unlinking, setUnlinking] = useState<LinkedAccount | null>(null);

  useEffect(() => {
    void session.social.loadLinks().catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl">
      <p className="mb-6 text-fg-muted">
        Link your Bluesky and Mastodon accounts to show them on your profile with a verified badge, post to
        them from Jolt, and read their timelines here. Jolt never sees your passwords, and you can unlink at
        any time.
      </p>

      {links.length > 0 && (
        <SettingsSection title="Linked">
          <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line">
            {links.map((link) => (
              <LinkRow key={link.id} link={link} onUnlink={() => setUnlinking(link)} />
            ))}
          </ul>
        </SettingsSection>
      )}

      <SettingsSection title="Add an account">
        <div className="grid gap-4 sm:grid-cols-2">
          <LinkForm provider="bluesky" />
          <LinkForm provider="mastodon" />
        </div>
      </SettingsSection>

      <ConfirmDialog
        open={!!unlinking}
        onOpenChange={(open) => !open && setUnlinking(null)}
        title={`Unlink ${unlinking?.handle ?? ''}?`}
        description="Jolt will forget its access to that account and stop showing it on your profile. Nothing you've posted is deleted."
        confirmLabel="Unlink"
        danger
        onConfirm={async () => {
          if (!unlinking) return;
          await session.social.unlink(unlinking.id);
          announce(`${unlinking.handle} unlinked`);
          setUnlinking(null);
        }}
      />
    </div>
  );
}

function LinkRow({ link, onUnlink }: { link: LinkedAccount; onUnlink: () => void }) {
  const set = (body: { crosspostDefault?: boolean; showTimeline?: boolean }) =>
    session.social.updateLink(link.id, body).catch((e) => announce(errorMessage(e), 'assertive'));
  return (
    <li className="p-4">
      <div className="flex items-center gap-3">
        <ProviderMark provider={link.provider} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-semibold">
            {link.handle}
            {link.verified && <BadgeCheck className="size-4 shrink-0 text-online" aria-label="Verified" />}
          </p>
          <p className="text-sm text-fg-subtle">{PROVIDERS[link.provider].name}</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={<ExternalLink className="size-4" />}
          onClick={() => void window.jolt.openExternal(link.url)}
        >
          View
        </Button>
        <Button size="sm" variant="ghost" icon={<Unlink className="size-4" />} onClick={onUnlink}>
          Unlink
        </Button>
      </div>
      <div className="mt-2 border-t border-line pt-1">
        <SwitchRow
          label="Post here too by default"
          description="New posts go to this account as well. You can still turn it off for any post."
          checked={link.crosspostDefault}
          onCheckedChange={(crosspostDefault) => void set({ crosspostDefault })}
        />
        <SwitchRow
          label="Show its timeline in Jolt"
          description="Adds this account's home timeline to the Home sidebar."
          checked={link.showTimeline}
          onCheckedChange={(showTimeline) => void set({ showTimeline })}
        />
      </div>
    </li>
  );
}

function LinkForm({ provider }: { provider: LinkProvider }) {
  const info = PROVIDERS[provider];
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const url = await session.social.linkAccount(provider, value.trim());
      await window.jolt.openExternal(url);
      setOpened(true);
      announce(`Opened ${info.name} in your browser`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <ProviderMark provider={provider} />
        <p className="font-semibold">{info.name}</p>
      </div>
      <Field
        label={info.label}
        hint={opened ? 'Finish in your browser, then come back here.' : info.hint}
        error={error ?? undefined}
      >
        {(props) => (
          <Input
            {...props}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={info.placeholder}
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </Field>
      <Button type="submit" variant="secondary" loading={busy} disabled={!value.trim()}>
        Link {info.name}
      </Button>
    </form>
  );
}

/** A small coloured mark for each network, so the two are easy to tell apart at a glance. */
function ProviderMark({ provider }: { provider: LinkProvider }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-sm font-bold text-white"
      style={{ background: provider === 'bluesky' ? '#1185fe' : '#6364ff' }}
    >
      {provider === 'bluesky' ? 'B' : 'M'}
    </span>
  );
}
