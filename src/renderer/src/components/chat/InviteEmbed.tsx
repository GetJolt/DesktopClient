import type { Invite } from '@jolt/protocol';
import type { FoundInvite } from '@jolt/sdk';
import { Globe, Link2Off } from 'lucide-react';
import { useEffect, useState } from 'react';
import { client } from '@/lib/client';
import { initials, pluralize } from '@/lib/format';
import { scoped } from '@/lib/keys';
import { errorMessage, joinInvite, openFirstChannel, previewInvite } from '@/store/actions';
import { useData } from '@/store/data';
import { Button } from '../ui/Button';

// Shared across messages so the same link posted twice is only looked up once.
const previews = new Map<string, Promise<Invite>>();

function lookup(invite: FoundInvite): Promise<Invite> {
  const key = `${invite.instance}/${invite.code}`;
  let pending = previews.get(key);
  if (!pending) {
    pending = previewInvite(invite);
    pending.catch(() => setTimeout(() => previews.delete(key), 30_000));
    previews.set(key, pending);
  }
  return pending;
}

type State = { status: 'loading' } | { status: 'ready'; invite: Invite } | { status: 'invalid' };

export function InviteEmbed({ invite }: { invite: FoundInvite }) {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guildKey = state.status === 'ready' ? scoped(state.invite.instance, state.invite.guild.id) : null;
  const joined = useData((s) => (guildKey ? Boolean(s.guilds[guildKey]) : false));

  useEffect(() => {
    if (state.status !== 'loading') document.dispatchEvent(new Event('jolt:content-grew'));
  }, [state.status]);

  useEffect(() => {
    let cancelled = false;
    lookup(invite)
      .then((result) => !cancelled && setState({ status: 'ready', invite: result }))
      .catch(() => !cancelled && setState({ status: 'invalid' }));
    return () => {
      cancelled = true;
    };
  }, [invite]);

  const join = async () => {
    if (joined && guildKey) return openFirstChannel(guildKey);
    setJoining(true);
    setError(null);
    try {
      await joinInvite(invite);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setJoining(false);
    }
  };

  if (state.status === 'invalid') {
    return (
      <Shell eyebrow="Invite">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-line-strong text-fg-subtle">
            <Link2Off className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-fg-muted">Invite unavailable</p>
            <p className="text-[0.8125rem] text-fg-subtle">It may have expired, or the server is offline.</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (state.status === 'loading') {
    return (
      <Shell eyebrow="Invite" busy>
        <div className="flex items-center gap-3" aria-hidden="true">
          <span className="size-12 shrink-0 animate-pulse rounded-[var(--radius-lg)] bg-raised-strong" />
          <div className="flex-1 space-y-2">
            <span className="block h-3.5 w-40 animate-pulse rounded-full bg-raised-strong" />
            <span className="block h-3 w-24 animate-pulse rounded-full bg-raised-strong" />
          </div>
        </div>
      </Shell>
    );
  }

  const { guild, instance } = state.invite;
  const foreign = instance !== client.homeDomain;

  return (
    <Shell eyebrow={joined ? 'Invite to a server you’re in' : 'You’ve been invited to join a server'}>
      <div className="flex items-center gap-3.5">
        {guild.iconUrl ? (
          <img
            src={guild.iconUrl}
            alt=""
            className="size-12 shrink-0 rounded-[var(--radius-lg)] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-accent font-semibold text-on-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.35)]"
            aria-hidden="true"
          >
            {initials(guild.name, 3)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{guild.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.8125rem] text-fg-subtle">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-fg-subtle" aria-hidden="true" />
              {pluralize(guild.memberCount, 'member')}
            </span>
            {foreign && (
              <span className="flex items-center gap-1">
                <Globe className="size-3" aria-hidden="true" /> {instance}
              </span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant={joined ? 'secondary' : 'primary'}
          loading={joining}
          onClick={join}
          aria-label={joined ? `Open ${guild.name}` : `Join ${guild.name}`}
          className="min-w-[4.5rem]"
        >
          {joined ? 'Open' : 'Join'}
        </Button>
      </div>
      {guild.description && (
        <p className="mt-2.5 line-clamp-2 text-[0.8125rem] text-fg-muted">{guild.description}</p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[0.8125rem] text-danger">
          {error}
        </p>
      )}
    </Shell>
  );
}

function Shell({ eyebrow, busy, children }: { eyebrow: string; busy?: boolean; children: React.ReactNode }) {
  return (
    <section
      aria-label="Server invite"
      aria-busy={busy || undefined}
      className="mt-1.5 w-full max-w-[26rem] rounded-[var(--radius-lg)] border border-line bg-sunken p-3.5 shadow-[var(--highlight)]"
    >
      <p className="eyebrow mb-2.5">{eyebrow}</p>
      {children}
    </section>
  );
}
