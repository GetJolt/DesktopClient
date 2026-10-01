import type { Post, User } from '@getjolt/protocol';
import type { SocialPost } from '@getjolt/sdk';
import clsx from 'clsx';
import {
  Copy,
  ExternalLink,
  Heart,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Quote,
  Repeat2,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import {
  forwardRef,
  memo,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { session } from '@/lib/client';
import { displayName, formatAge, formatCount, formatFull } from '@/lib/format';
import { copyPostLink, deletePost, openProfile, openThread, toggleLike, toggleRepost } from '@/store/social';
import { useUi } from '@/store/ui';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dropdown, type MenuEntry } from '../ui/Menu';
import { Tooltip } from '../ui/Tooltip';
import { RichText } from './RichText';

type Variant = 'feed' | 'focus' | 'ancestor';

interface Props {
  post: SocialPost;
  repostedBy?: User | null;
  variant?: Variant;
  /** Position in the feed, for screen readers (WAI-ARIA feed pattern). */
  position?: number;
  setSize?: number;
  /** Draws the thread line down to the next post. */
  connectBelow?: boolean;
}

/** Bluesky handles are already domains; everyone else is shown with their server. */
const handleOf = (user: User) =>
  user.local || user.id.startsWith('bsky:') ? `@${user.handle}` : `@${user.handle}@${user.instance}`;

const isExternal = (post: Post) => post.source === 'bluesky' || post.source === 'mastodon';

/** Everyone opens in the app, including Bluesky and Mastodon people (read through the linked account). */
const openAuthor = (user: User) => openProfile(user.id);

/** Clicking empty space opens the thread, but not when the click was on a control or ended a text selection. */
function onCardClick(event: MouseEvent, post: Post) {
  if ((event.target as HTMLElement).closest('button, a, [role="menuitem"], input, textarea')) return;
  if (window.getSelection()?.toString()) return;
  openThread(post.id);
}

export const PostItem = memo(function PostItem({
  post,
  repostedBy,
  variant = 'feed',
  position,
  setSize,
  connectBelow,
}: Props) {
  const name = displayName(post.author);
  const focus = variant === 'focus';
  const titleId = `post-${post.id}-title`;

  return (
    <article
      tabIndex={-1}
      data-post-index={position}
      aria-posinset={position}
      aria-setsize={setSize}
      aria-labelledby={titleId}
      aria-busy={post.pending || undefined}
      onClick={focus ? undefined : (e) => onCardClick(e, post)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' && e.target === e.currentTarget && !focus) openThread(post.id);
      }}
      className={clsx(
        'group relative px-5 outline-none',
        focus
          ? 'pt-4 pb-1'
          : 'cursor-pointer py-3.5 transition-colors hover:bg-hover/50 focus-visible:bg-hover',
        variant === 'feed' && 'border-b border-line',
        post.pending && 'opacity-60',
      )}
    >
      {repostedBy && (
        <p className="mb-1.5 flex items-center gap-1.5 pl-[3.25rem] text-xs font-medium text-fg-subtle">
          <Repeat2 className="size-3.5" aria-hidden="true" />
          <button type="button" className="hover:underline" onClick={() => openAuthor(repostedBy)}>
            {isMe(repostedBy) ? 'You' : displayName(repostedBy)}
          </button>
          reposted
        </p>
      )}

      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            aria-label={`View ${name}'s profile`}
            onClick={() => openAuthor(post.author)}
            className="press rounded-full"
          >
            <Avatar name={name} seed={post.author.id} url={post.author.avatarUrl} size={focus ? 48 : 40} />
          </button>
          {connectBelow && (
            <span aria-hidden="true" className="mt-1.5 w-0.5 flex-1 rounded-full bg-line-strong" />
          )}
        </div>

        <div className={clsx('min-w-0 flex-1', connectBelow && 'pb-3')}>
          <header
            className={clsx('flex min-w-0 gap-1.5', focus ? 'flex-col items-start gap-0' : 'items-baseline')}
          >
            <button
              id={titleId}
              type="button"
              onClick={() => openAuthor(post.author)}
              className="max-w-full truncate text-left font-semibold text-fg hover:underline"
            >
              {name}
            </button>
            <span className="truncate text-sm text-fg-subtle">{handleOf(post.author)}</span>
            {!focus && (
              <>
                <span aria-hidden="true" className="text-fg-subtle">
                  ·
                </span>
                <Tooltip content={formatFull(post.createdAt)}>
                  <time
                    dateTime={new Date(post.createdAt).toISOString()}
                    className="shrink-0 text-sm text-fg-subtle"
                  >
                    {post.pending ? 'posting…' : formatAge(post.createdAt)}
                  </time>
                </Tooltip>
              </>
            )}
            {post.visibility !== 'public' && !focus && <VisibilityBadge post={post} />}
          </header>

          {post.replyToAuthor && variant !== 'ancestor' && (
            <p className="mt-0.5 text-sm text-fg-subtle">
              Replying to{' '}
              <button
                type="button"
                className="text-accent-text hover:underline"
                onClick={() => openAuthor(post.replyToAuthor!)}
              >
                {handleOf(post.replyToAuthor)}
              </button>
            </p>
          )}

          <ContentWarning cw={post.cw}>
            <RichText
              text={post.text}
              facets={post.facets}
              className={clsx('mt-1 text-fg', focus ? 'text-[1.1875rem] leading-relaxed' : 'leading-[1.45]')}
            />
            {post.media.length > 0 && <MediaGrid post={post} />}
            {post.quote && <QuoteCard post={post.quote} />}
          </ContentWarning>

          {focus && <FocusMeta post={post} />}
          {post.failed ? <FailedNotice post={post} /> : <Actions post={post} focus={focus} />}
        </div>
      </div>
    </article>
  );
});

function VisibilityBadge({ post }: { post: Post }) {
  const label = post.visibility === 'followers' ? 'Followers only' : 'Unlisted';
  return (
    <Tooltip content={label}>
      <span className="shrink-0 self-center text-fg-subtle" aria-label={label}>
        <Lock className="size-3.5" aria-hidden="true" />
      </span>
    </Tooltip>
  );
}

function ContentWarning({ cw, children }: { cw: string | null; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!cw) return <>{children}</>;
  return (
    <div className="mt-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-[var(--radius-md)] border border-line bg-sunken px-3 py-2 text-left text-sm hover:border-line-strong"
      >
        <TriangleAlert className="size-4 shrink-0 text-idle" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium">{cw}</span>
        <span className="shrink-0 text-xs font-semibold text-fg-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="animate-fade">{children}</div>}
    </div>
  );
}

function MediaGrid({ post }: { post: Post }) {
  const media = post.media;
  const one = media.length === 1;
  const ratio = one && media[0]!.width && media[0]!.height ? media[0]!.width / media[0]!.height : undefined;
  return (
    <div
      className={clsx(
        'mt-2.5 grid gap-1 overflow-hidden rounded-[var(--radius-lg)] border border-line',
        one ? 'grid-cols-1' : 'aspect-[16/10] grid-cols-2',
        media.length > 2 && 'grid-rows-2',
      )}
    >
      {media.map((m, index) => (
        <button
          key={m.url + index}
          type="button"
          aria-label={m.alt ? `Image: ${m.alt}` : 'Image without a description'}
          onClick={() => useUi.getState().openDialog({ type: 'lightbox', postId: post.id, index })}
          className={clsx(
            'relative min-h-0 overflow-hidden bg-sunken',
            media.length === 3 && index === 0 && 'row-span-2',
          )}
        >
          <img
            src={m.url}
            alt={m.alt}
            loading="lazy"
            draggable={false}
            className={clsx('size-full object-cover', one && 'max-h-[30rem]')}
            style={one && ratio ? { aspectRatio: String(Math.max(0.6, Math.min(ratio, 2.2))) } : undefined}
          />
          {m.alt && (
            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[0.625rem] font-bold tracking-wide text-white">
              ALT
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function QuoteCard({ post }: { post: Post }) {
  const name = displayName(post.author);
  return (
    <button
      type="button"
      onClick={() => openThread(post.id)}
      className="mt-2.5 block w-full rounded-[var(--radius-lg)] border border-line p-3 text-left transition-colors hover:border-line-strong hover:bg-hover/50"
    >
      <span className="flex min-w-0 items-center gap-1.5 text-sm">
        <Avatar name={name} seed={post.author.id} url={post.author.avatarUrl} size={18} />
        <span className="truncate font-semibold">{name}</span>
        <span className="truncate text-fg-subtle">{handleOf(post.author)}</span>
        <span className="shrink-0 text-fg-subtle">· {formatAge(post.createdAt)}</span>
      </span>
      {post.cw ? (
        <span className="mt-1 block text-sm text-fg-muted">Content warning: {post.cw}</span>
      ) : (
        <span className="mt-1 line-clamp-4 block text-sm text-fg">{post.text}</span>
      )}
      {post.media.length > 0 && (
        <span className="mt-1 block text-xs text-fg-subtle">
          {post.media.length} {post.media.length === 1 ? 'image' : 'images'}
        </span>
      )}
    </button>
  );
}

function FocusMeta({ post }: { post: Post }) {
  const stats = [
    post.counts.reposts > 0 &&
      `${formatCount(post.counts.reposts)} ${post.counts.reposts === 1 ? 'repost' : 'reposts'}`,
    post.counts.likes > 0 &&
      `${formatCount(post.counts.likes)} ${post.counts.likes === 1 ? 'like' : 'likes'}`,
  ].filter(Boolean);
  return (
    <div className="mt-3 border-b border-line pb-3 text-sm text-fg-subtle">
      <time dateTime={new Date(post.createdAt).toISOString()}>{formatFull(post.createdAt)}</time>
      {post.visibility !== 'public' && (
        <span> · {post.visibility === 'followers' ? 'Followers only' : 'Unlisted'}</span>
      )}
      {stats.length > 0 && <p className="mt-2 font-medium text-fg-muted">{stats.join(' · ')}</p>}
    </div>
  );
}

function Actions({ post, focus }: { post: SocialPost; focus: boolean }) {
  const mine = isMe(post.author);
  const openDialog = useUi((s) => s.openDialog);
  const disabled = post.pending;
  const canRepost = post.visibility !== 'followers';

  const more: MenuEntry[] = [
    post.url && { label: 'Copy link', icon: <Copy />, onSelect: () => copyPostLink(post) },
    post.url && {
      label: 'Open in browser',
      icon: <ExternalLink />,
      onSelect: () => void window.jolt.openExternal(post.url!),
    },
    { label: 'Copy text', icon: <Copy />, onSelect: () => void navigator.clipboard.writeText(post.text) },
    mine && 'separator',
    mine && {
      label: 'Delete post',
      icon: <Trash2 />,
      danger: true,
      onSelect: () => void deletePost(post.id),
    },
  ];

  return (
    <div
      role="group"
      aria-label="Post actions"
      className={clsx('-ml-2 flex items-center', focus ? 'mt-1 gap-6 py-1' : 'mt-1.5 gap-1 sm:gap-6')}
    >
      <ActionButton
        label={`Reply${post.counts.replies ? `, ${post.counts.replies} replies` : ''}`}
        count={post.counts.replies}
        disabled={disabled}
        onClick={() => openDialog({ type: 'compose', replyToId: post.id })}
      >
        <MessageCircle className="size-[1.0625rem]" aria-hidden="true" />
      </ActionButton>

      <Dropdown
        items={[
          {
            label: post.viewer.reposted ? 'Undo repost' : 'Repost',
            icon: <Repeat2 />,
            onSelect: () => toggleRepost(post),
            disabled: !canRepost,
          },
          !isExternal(post) && {
            label: 'Quote post',
            icon: <Quote />,
            onSelect: () => openDialog({ type: 'compose', quoteId: post.id }),
            disabled: !canRepost,
          },
        ]}
        trigger={
          <ActionButton
            label={`Repost${post.counts.reposts ? `, ${post.counts.reposts} reposts` : ''}`}
            count={post.counts.reposts}
            active={post.viewer.reposted}
            tone="repost"
            disabled={disabled}
          >
            <Repeat2 className="size-[1.125rem]" aria-hidden="true" />
          </ActionButton>
        }
      />

      <ActionButton
        label={`${post.viewer.liked ? 'Unlike' : 'Like'}${post.counts.likes ? `, ${post.counts.likes} likes` : ''}`}
        count={post.counts.likes}
        active={post.viewer.liked}
        pressed={post.viewer.liked}
        tone="like"
        disabled={disabled}
        onClick={() => toggleLike(post)}
      >
        <Heart className={clsx('size-[1.0625rem]', post.viewer.liked && 'fill-current')} aria-hidden="true" />
      </ActionButton>

      <Dropdown
        align="end"
        items={more}
        trigger={
          <ActionButton label="More" disabled={disabled}>
            <MoreHorizontal className="size-[1.0625rem]" aria-hidden="true" />
          </ActionButton>
        }
      />
    </div>
  );
}

const isMe = (user: User) => {
  const home = session.state.homeInstance;
  return Boolean(home && session.state.me[home]?.id === user.id);
};

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  count?: number;
  active?: boolean;
  pressed?: boolean;
  tone?: 'like' | 'repost';
  children: ReactNode;
}

/** Forwards its ref and props so it can be a dropdown trigger too. */
const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(function ActionButton(
  { label, count, active, pressed, tone, disabled, onClick, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      {...rest}
      className={clsx(
        'press group/action flex h-8 min-w-14 items-center gap-1.5 rounded-full px-2 text-[0.8125rem] font-medium tabular-nums transition-colors disabled:opacity-40',
        active && tone === 'like' && 'text-danger',
        active && tone === 'repost' && 'text-online',
        !active && 'text-fg-subtle',
        tone === 'like'
          ? 'hover:bg-danger/10 hover:text-danger'
          : tone === 'repost'
            ? 'hover:bg-online/10 hover:text-online'
            : 'hover:bg-hover hover:text-fg',
        className,
      )}
    >
      {children}
      {count ? <span>{formatCount(count)}</span> : null}
    </button>
  );
});

function FailedNotice({ post }: { post: SocialPost }) {
  return (
    <div role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-danger">
      <span>This didn't post.</span>
      <Button size="sm" variant="secondary" onClick={() => void navigator.clipboard.writeText(post.text)}>
        Copy text
      </Button>
      <Button size="sm" variant="ghost" onClick={() => session.social.discardPost(post.id)}>
        Discard
      </Button>
    </div>
  );
}
