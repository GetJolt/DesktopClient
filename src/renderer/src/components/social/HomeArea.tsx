import type { Notification, Profile } from '@getjolt/protocol';
import { errorMessage } from '@getjolt/sdk';
import clsx from 'clsx';
import {
  ArrowLeft,
  AtSign,
  ExternalLink,
  Heart,
  MessageCircle,
  Quote,
  Repeat2,
  Search,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { session } from '@/lib/client';
import { avatarGradient, displayName, formatAge, formatCount } from '@/lib/format';
import { useData, useSocial } from '@/store/data';
import { feedKey, openPostByUrl, openProfile, openThread, setFollowing } from '@/store/social';
import { useUi } from '@/store/ui';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton, Spinner } from '../ui/Button';
import { Input } from '../ui/Field';
import { ComposeBox } from './ComposeBox';
import { FindFriends } from './FindFriends';
import { PostItem } from './PostItem';
import { RichText } from './RichText';
import { COLUMN } from './column';
import { Timeline } from './Timeline';

/** The main area while Home is selected: the social side of Jolt. */
export function HomeArea() {
  const route = useUi((s) => s.home);
  switch (route.view) {
    case 'timeline':
      return <TimelineView />;
    case 'notifications':
      return <NotificationsView />;
    case 'people':
      return <PeopleView />;
    case 'profile':
      return <ProfileView key={route.userId} userId={route.userId} />;
    case 'thread':
      return <ThreadView key={route.postId} postId={route.postId} />;
    case 'link':
      return <LinkView key={route.linkId} linkId={route.linkId} />;
  }
}

function Header({ title, subtitle, back }: { title: ReactNode; subtitle?: ReactNode; back?: boolean }) {
  const goBack = useUi((s) => s.goBack);
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
      {back && (
        <IconButton label="Back" onClick={goBack}>
          <ArrowLeft className="size-[1.125rem]" aria-hidden="true" />
        </IconButton>
      )}
      <div className={clsx('min-w-0', !back && 'pl-2')}>
        <h1 className="truncate font-semibold leading-tight">{title}</h1>
        {subtitle && <p className="truncate text-xs text-fg-subtle">{subtitle}</p>}
      </div>
    </header>
  );
}

function TimelineView() {
  return (
    <>
      <Header title="Timeline" />
      <Timeline
        feed={feedKey.home}
        label="Your timeline"
        header={
          <div className="border-b border-line px-5 pt-4 pb-3">
            <ComposeBox />
          </div>
        }
        empty={
          <EmptyState
            title="Your timeline is quiet"
            body="Follow people from any Jolt instance or the wider fediverse, and their posts will show up here."
            action={<Button onClick={() => useUi.getState().goHome({ view: 'people' })}>Find people</Button>}
          />
        }
      />
    </>
  );
}

function LinkView({ linkId }: { linkId: string }) {
  const link = useSocial((s) => s.linkedAccounts.find((l) => l.id === linkId));
  if (!link) return <Header title="Linked timeline" back />;
  const network = link.provider === 'bluesky' ? 'Bluesky' : 'Mastodon';
  return (
    <>
      <Header title={network} subtitle={link.handle} />
      <Timeline
        feed={feedKey.link(linkId)}
        label={`${network} timeline for ${link.handle}`}
        header={
          <p className="border-b border-line px-5 py-3 text-sm text-fg-muted">
            Your {network} home timeline. Likes, reposts and replies here happen on {network} as {link.handle}
            .
          </p>
        }
        empty={<p className="text-fg-muted">Nothing on this timeline yet.</p>}
      />
    </>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-sm">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1.5 text-fg-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const PROFILE_TABS = [
  { id: 'posts', label: 'Posts' },
  { id: 'replies', label: 'Replies' },
  { id: 'media', label: 'Media' },
] as const;

function ProfileView({ userId }: { userId: string }) {
  const profile = useSocial((s) => s.profiles[userId]);
  const [tab, setTab] = useState<(typeof PROFILE_TABS)[number]['id']>('posts');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    session.social.loadProfile(userId).catch((e) => setError(errorMessage(e)));
  }, [userId]);

  if (!profile) {
    return (
      <>
        <Header title="Profile" back />
        <div className="flex flex-1 items-center justify-center text-fg-muted">
          {error ?? <Spinner label="Loading profile" />}
        </div>
      </>
    );
  }

  const name = displayName(profile.user);
  return (
    <>
      <Header title={name} subtitle={`${formatCount(profile.counts.posts)} posts`} back />
      <Timeline
        key={tab}
        feed={feedKey.profile(userId, tab)}
        label={`${name}'s ${tab}`}
        header={
          <>
            <ProfileHeader profile={profile} />
            <div role="tablist" aria-label="Profile sections" className="flex border-b border-line px-2">
              {PROFILE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    'relative px-4 py-3 text-sm font-semibold transition-colors',
                    tab === t.id ? 'text-fg' : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
                  )}
                </button>
              ))}
            </div>
          </>
        }
        empty={<p className="text-fg-muted">Nothing here yet.</p>}
      />
    </>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const relationship = useSocial((s) => s.relationships[profile.user.id] ?? profile.relationship);
  const isMe = useData((s) => (s.homeInstance ? s.me[s.homeInstance]?.id === profile.user.id : false));
  const user = profile.user;
  const name = displayName(user);
  const network = user.id.startsWith('bsky:') ? 'Bluesky' : user.id.startsWith('masto:') ? 'Mastodon' : null;
  const address =
    user.local || network === 'Bluesky' ? `@${user.handle}` : `@${user.handle}@${user.instance}`;
  const following = relationship?.following ?? 'none';

  return (
    <div className="border-b border-line">
      <div className="h-32" style={{ background: avatarGradient(user.id) }} aria-hidden="true" />
      <div className="px-5 pb-4">
        <div className="-mt-11 flex items-end justify-between gap-3">
          <span className="rounded-full ring-4 ring-panel">
            <Avatar name={name} seed={user.id} url={user.avatarUrl} size={88} />
          </span>
          <div className="flex items-center gap-2">
            {network && profile.url && (
              <Button
                variant="ghost"
                size="sm"
                icon={<ExternalLink className="size-4" />}
                onClick={() => void window.jolt.openExternal(profile.url!)}
              >
                Open on {network}
              </Button>
            )}
            {isMe ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => useUi.getState().openDialog({ type: 'settings', tab: 'account' })}
              >
                Edit profile
              </Button>
            ) : relationship ? (
              <Button
                size="sm"
                variant={following === 'none' ? 'primary' : 'secondary'}
                onClick={() => setFollowing(user.id, following === 'none', name)}
              >
                {following === 'following'
                  ? 'Following'
                  : following === 'pending'
                    ? 'Requested'
                    : `${relationship?.followedBy ? 'Follow back' : 'Follow'}${network ? ` on ${network}` : ''}`}
              </Button>
            ) : null}
          </div>
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight">{name}</h2>
        <p className="text-fg-subtle">
          {address}
          {relationship?.followedBy && (
            <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-xs font-medium text-fg-muted">
              Follows you
            </span>
          )}
        </p>
        {user.bio && <RichText text={user.bio} facets={[]} className="mt-3 text-fg" />}
        {profile.links.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {profile.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  onClick={(e) => {
                    e.preventDefault();
                    void window.jolt.openExternal(link.url);
                  }}
                  className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-line-strong"
                >
                  {link.provider === 'bluesky' ? 'Bluesky' : 'Mastodon'} · {link.handle}
                  {link.verified && (
                    <span className="text-online" aria-label="verified">
                      ✓
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex gap-4 text-sm text-fg-muted">
          <span>
            <b className="text-fg">{formatCount(profile.counts.following)}</b> following
          </span>
          <span>
            <b className="text-fg">{formatCount(profile.counts.followers)}</b>{' '}
            {profile.counts.followers === 1 ? 'follower' : 'followers'}
          </span>
        </p>
      </div>
    </div>
  );
}

function ThreadView({ postId }: { postId: string }) {
  const thread = useSocial((s) => s.threads[postId]);
  const posts = useSocial((s) => s.posts);
  const post = posts[postId];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    session.social.loadThread(postId).catch((e) => setError(errorMessage(e)));
  }, [postId]);

  return (
    <>
      <Header title="Post" back />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className={clsx(COLUMN, 'min-h-full')}>
          {!post ? (
            <div className="flex justify-center py-12 text-fg-muted">
              {error ?? <Spinner label="Loading post" />}
            </div>
          ) : (
            <>
              {thread?.ancestors.map((id) =>
                posts[id] ? <PostItem key={id} post={posts[id]} variant="ancestor" connectBelow /> : null,
              )}
              <PostItem post={post} variant="focus" />
              <div className="border-y border-line px-5 py-3">
                <ComposeBox replyTo={post} placeholder={`Reply to ${displayName(post.author)}`} />
              </div>
              {thread?.replies.map((id) => (posts[id] ? <PostItem key={id} post={posts[id]} /> : null))}
              {thread?.loading && (
                <div className="flex justify-center py-6">
                  <Spinner label="Loading replies" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

const NOTIFICATION_STYLE: Record<
  Notification['type'],
  { icon: typeof Heart; className: string; text: string }
> = {
  like: { icon: Heart, className: 'text-danger', text: 'liked your post' },
  repost: { icon: Repeat2, className: 'text-online', text: 'reposted your post' },
  reply: { icon: MessageCircle, className: 'text-accent-text', text: 'replied to you' },
  mention: { icon: AtSign, className: 'text-accent-text', text: 'mentioned you' },
  quote: { icon: Quote, className: 'text-accent-text', text: 'quoted your post' },
  follow: { icon: UserPlus, className: 'text-accent-text', text: 'followed you' },
};

function NotificationsView() {
  const state = useSocial((s) => s.notifications);

  useEffect(() => {
    void session.social
      .loadNotifications()
      .then(() => session.social.markNotificationsRead())
      .catch(() => {});
  }, []);

  return (
    <>
      <Header title="Notifications" />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className={clsx(COLUMN, 'min-h-full')}>
          {!state.loaded ? (
            <div className="flex justify-center py-12">
              <Spinner label="Loading notifications" />
            </div>
          ) : state.items.length === 0 ? (
            <div className="px-8 py-16 text-center">
              <EmptyState
                title="Nothing yet"
                body="Likes, reposts, replies and new followers will show up here."
              />
            </div>
          ) : (
            <ul>
              {state.items.map((n) => (
                <NotificationRow key={n.id} notification={n} />
              ))}
              {state.hasMore && (
                <li className="flex justify-center py-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void session.social.loadNotifications('older')}
                  >
                    Show older
                  </Button>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function NotificationRow({ notification: n }: { notification: Notification }) {
  const style = NOTIFICATION_STYLE[n.type];
  const Icon = style.icon;
  const name = displayName(n.actor);
  const open = () => (n.post ? openThread(n.post.id) : openProfile(n.actor.id));
  return (
    <li className={clsx('border-b border-line', !n.read && 'bg-accent-soft/40')}>
      <button
        type="button"
        onClick={open}
        className="flex w-full gap-3 px-5 py-3.5 text-left hover:bg-hover/50"
      >
        <Icon
          className={clsx('mt-1 size-5 shrink-0', style.className, n.type === 'like' && 'fill-current')}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <Avatar name={name} seed={n.actor.id} url={n.actor.avatarUrl} size={32} />
          <span className="mt-1.5 block">
            <b className="font-semibold">{name}</b> {style.text}
            <span className="text-fg-subtle"> · {formatAge(n.createdAt)}</span>
          </span>
          {n.post && n.type !== 'follow' && (
            <span className="mt-1 line-clamp-3 block text-sm text-fg-muted">{n.post.text || 'Image'}</span>
          )}
        </span>
      </button>
    </li>
  );
}

function PeopleView() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      // A pasted link to a post opens the post; anything else is looked up as an account.
      if (/^https?:\/\/\S+\/\S+/.test(query.trim()) && (await openPostByUrl(query.trim()))) return;
      setResult(await session.social.lookup(query));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Header title="Find people" />
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className={clsx(COLUMN, 'min-h-full px-5 py-5')}>
          <form onSubmit={search} className="flex gap-2">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="@name@server.example, or a link to a post"
                aria-label="Address to look up"
                className="pl-9"
                autoFocus
              />
            </div>
            <Button type="submit" loading={busy}>
              Look up
            </Button>
          </form>
          <p className="mt-2 text-sm text-fg-subtle">
            Works for anyone on a Jolt instance, Mastodon or anywhere else on the fediverse. Paste a link to a
            post to open it here.
          </p>

          {error && (
            <p role="alert" className="mt-6 text-danger">
              {error}
            </p>
          )}
          {result && <PersonCard profile={result} />}
          <FindFriends />
        </div>
      </div>
    </>
  );
}

function PersonCard({ profile }: { profile: Profile }) {
  const relationship = useSocial((s) => s.relationships[profile.user.id] ?? profile.relationship);
  const user = profile.user;
  const name = displayName(user);
  const following = relationship?.following ?? 'none';
  return (
    <div className="card mt-6 flex items-center gap-3 p-4">
      <button
        type="button"
        onClick={() => openProfile(user.id)}
        className="press rounded-full"
        aria-label={`View ${name}'s profile`}
      >
        <Avatar name={name} seed={user.id} url={user.avatarUrl} size={48} />
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => openProfile(user.id)}
          className="block truncate font-semibold hover:underline"
        >
          {name}
        </button>
        <p className="truncate text-sm text-fg-subtle">
          @{user.handle}@{user.instance}
        </p>
        {user.bio && <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{user.bio}</p>}
      </div>
      {relationship && (
        <Button
          size="sm"
          variant={following === 'none' ? 'primary' : 'secondary'}
          onClick={() => setFollowing(user.id, following === 'none', name)}
        >
          {following === 'following' ? 'Following' : following === 'pending' ? 'Requested' : 'Follow'}
        </Button>
      )}
    </div>
  );
}
