import type { FeedEntry } from '@getjolt/sdk';
import clsx from 'clsx';
import { ArrowUp } from 'lucide-react';
import {
  forwardRef,
  useEffect,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { session } from '@/lib/client';
import { useSocial } from '@/store/data';
import { entryKey, loadFeed, openThread, showFresh, toggleLike, toggleRepost } from '@/store/social';
import { useUi } from '@/store/ui';
import { Spinner } from '../ui/Button';
import { COLUMN } from './column';
import { PostItem } from './PostItem';

interface Props {
  feed: string;
  /** Shown above the first post, e.g. the composer or a profile header. */
  header?: ReactNode;
  empty: ReactNode;
  label: string;
}

/**
 * A feed of posts, newest first, following the WAI-ARIA feed pattern. J and K move between posts; on the focused
 * post, L likes, R replies, T reposts and Enter opens the thread.
 */
export function Timeline({ feed, header, empty, label }: Props) {
  const state = useSocial((s) => s.feeds[feed]);
  const posts = useSocial((s) => s.posts);
  const list = useRef<VirtuosoHandle>(null);
  const entries = (state?.entries ?? []).filter((e) => posts[e.postId]);

  useEffect(() => {
    if (!session.social.feed(feed).loaded) loadFeed(feed);
  }, [feed]);

  const focusPost = (index: number) => {
    const clamped = Math.max(0, Math.min(entries.length - 1, index));
    list.current?.scrollIntoView({ index: clamped, behavior: 'auto' });
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(`[data-feed="${feed}"] [data-post-index="${clamped + 1}"]`)
        ?.focus(),
    );
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest('input, textarea, [contenteditable]') ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const article = target.closest<HTMLElement>('[data-post-index]');
    const index = article ? Number(article.dataset.postIndex) - 1 : -1;
    const entry = index >= 0 ? entries[index] : undefined;
    const post = entry ? posts[entry.postId] : undefined;

    switch (event.key.toLowerCase()) {
      case 'j':
        focusPost(index + 1);
        break;
      case 'k':
        focusPost(index - 1);
        break;
      case 'l':
        if (post) toggleLike(post);
        break;
      case 't':
        if (post) toggleRepost(post);
        break;
      case 'r':
        if (post) useUi.getState().openDialog({ type: 'compose', replyToId: post.id });
        break;
      case 'enter':
        if (post && target === article) openThread(post.id);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const fresh = state?.fresh.length ?? 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" data-feed={feed} onKeyDown={onKeyDown}>
      {fresh > 0 && (
        <button
          type="button"
          onClick={() => {
            showFresh(feed);
            list.current?.scrollToIndex({ index: 0 });
          }}
          className="animate-rise press absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-on-accent shadow-pop"
        >
          <ArrowUp className="size-4" aria-hidden="true" />
          {fresh} new {fresh === 1 ? 'post' : 'posts'}
        </button>
      )}
      <Virtuoso<FeedEntry>
        ref={list}
        className="scroll-thin"
        data={entries}
        computeItemKey={(_, entry) => entryKey(entry)}
        endReached={() => loadFeed(feed, 'older')}
        increaseViewportBy={{ top: 400, bottom: 800 }}
        components={{
          List: FeedList,
          Header: () => <div className={COLUMN}>{header}</div>,
          Footer: () => (
            <div className={clsx(COLUMN, 'min-h-24')}>
              {state?.loading || !state?.loaded ? (
                <div className="flex justify-center py-8">
                  <Spinner label="Loading posts" />
                </div>
              ) : entries.length === 0 ? (
                <div className="px-8 py-16 text-center">{empty}</div>
              ) : !state.hasMore ? (
                <p className="py-10 text-center text-sm text-fg-subtle">You're all caught up.</p>
              ) : null}
            </div>
          ),
        }}
        itemContent={(index, entry) => (
          <PostItem
            post={posts[entry.postId]!}
            repostedBy={entry.repostedBy}
            position={index + 1}
            setSize={state?.hasMore ? -1 : entries.length}
          />
        )}
        aria-label={label}
      />
    </div>
  );
}

const FeedList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function FeedList(props, ref) {
  return <div {...props} ref={ref} role="feed" className={COLUMN} />;
});
