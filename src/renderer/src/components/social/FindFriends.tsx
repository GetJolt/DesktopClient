import type { FriendSuggestion, LinkedAccount } from '@getjolt/protocol';
import { errorMessage } from '@getjolt/sdk';
import { useState } from 'react';
import { announce } from '@/lib/announcer';
import { session } from '@/lib/client';
import { useSocial } from '@/store/data';
import { openProfile } from '@/store/social';
import { Avatar } from '../ui/Avatar';
import { Button, Spinner } from '../ui/Button';

const VIA: Record<FriendSuggestion['via'], string> = {
  jolt: 'On Jolt',
  activitypub: 'On the fediverse',
  bridge: 'Through Bridgy Fed, if they opted in',
};

/** People you follow on a linked account, each with a way to follow them from Jolt. */
export function FindFriends() {
  const links = useSocial((s) => s.linkedAccounts);
  const [active, setActive] = useState<LinkedAccount | null>(null);
  const [friends, setFriends] = useState<FriendSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (links.length === 0) return null;

  const load = async (link: LinkedAccount) => {
    setActive(link);
    setFriends(null);
    setError(null);
    try {
      setFriends(await session.social.findFriends(link.id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className="mt-10" aria-labelledby="find-friends">
      <h2 id="find-friends" className="text-lg font-semibold">
        People you follow elsewhere
      </h2>
      <p className="mt-1 text-sm text-fg-muted">
        Look through who you follow on a linked account and follow them here too.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <Button
            key={link.id}
            size="sm"
            variant={active?.id === link.id ? 'primary' : 'secondary'}
            onClick={() => void load(link)}
          >
            {link.provider === 'bluesky' ? 'Bluesky' : 'Mastodon'} · {link.handle}
          </Button>
        ))}
      </div>

      {active && !friends && !error && (
        <div className="flex justify-center py-8">
          <Spinner label="Looking through who you follow" />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 text-danger">
          {error}
        </p>
      )}
      {friends && friends.length === 0 && (
        <p className="mt-4 text-fg-muted">You don't follow anyone there yet.</p>
      )}
      {friends && friends.length > 0 && (
        <ul className="mt-4 divide-y divide-line rounded-[var(--radius-lg)] border border-line">
          {friends.map((friend) => (
            <FriendRow key={friend.handle} friend={friend} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FriendRow({ friend }: { friend: FriendSuggestion }) {
  const known = useSocial((s) => (friend.user ? s.relationships[friend.user.id] : undefined));
  const [state, setState] = useState<'idle' | 'busy' | 'following' | 'failed'>(
    known?.following && known.following !== 'none' ? 'following' : 'idle',
  );

  const follow = async () => {
    setState('busy');
    try {
      const userId = friend.user?.id ?? (await session.social.lookup(friend.address!)).user.id;
      await session.social.setFollowing(userId, true);
      setState('following');
      announce(`Following ${friend.name}`);
    } catch {
      // Most often a Bluesky account that hasn't opted in to Bridgy Fed.
      setState('failed');
    }
  };

  return (
    <li className="flex items-center gap-3 p-3">
      <Avatar name={friend.name} seed={friend.handle} url={friend.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        {friend.user ? (
          <button
            type="button"
            onClick={() => openProfile(friend.user!.id)}
            className="block truncate font-semibold hover:underline"
          >
            {friend.name}
          </button>
        ) : (
          <p className="truncate font-semibold">{friend.name}</p>
        )}
        <p className="truncate text-sm text-fg-subtle">
          {friend.handle} · {VIA[friend.via]}
        </p>
      </div>
      {state === 'failed' ? (
        <span className="text-sm text-fg-subtle">Not reachable from here</span>
      ) : (
        <Button
          size="sm"
          variant={state === 'following' ? 'secondary' : 'primary'}
          loading={state === 'busy'}
          disabled={state === 'following' || (!friend.user && !friend.address)}
          onClick={() => void follow()}
        >
          {state === 'following' ? 'Following' : 'Follow'}
        </Button>
      )}
    </li>
  );
}
