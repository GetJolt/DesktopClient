import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { session } from '@/lib/client';
import { displayName } from '@/lib/format';
import { useSocial } from '@/store/data';
import { Dialog } from '../ui/Dialog';
import { ComposeBox } from './ComposeBox';
import { PostItem } from './PostItem';

/** The post being replied to or quoted, fetched if it isn't in the store yet. */
function usePost(postId: string | undefined) {
  const post = useSocial((s) => (postId ? s.posts[postId] : undefined));
  useEffect(() => {
    if (postId && !post) void session.social.loadThread(postId).catch(() => {});
  }, [postId, post]);
  return post;
}

export function ComposeDialog({
  replyToId,
  quoteId,
  onClose,
}: {
  replyToId?: string;
  quoteId?: string;
  onClose: () => void;
}) {
  const replyTo = usePost(replyToId);
  const quote = usePost(quoteId);
  const title = replyToId ? 'Reply' : quoteId ? 'Quote post' : 'New post';
  const waiting = (replyToId && !replyTo) || (quoteId && !quote);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={title} hideTitle size="lg">
      {replyTo && (
        <div className="-mx-6 -mt-2 mb-3 max-h-64 overflow-y-auto">
          <PostItem post={replyTo} variant="ancestor" connectBelow />
        </div>
      )}
      {!waiting && (
        <ComposeBox
          autoFocus
          replyTo={replyTo}
          quote={quote}
          onPosted={onClose}
          placeholder={replyTo ? `Reply to ${displayName(replyTo.author)}` : undefined}
        />
      )}
      {quote && (
        <div className="pointer-events-none mt-3 rounded-[var(--radius-lg)] border border-line">
          <PostItem post={quote} variant="ancestor" />
        </div>
      )}
    </Dialog>
  );
}

/** Full-size images from a post, with their alt text, and arrow keys to move between them. */
export function Lightbox({
  postId,
  index: start,
  onClose,
}: {
  postId: string;
  index: number;
  onClose: () => void;
}) {
  const post = useSocial((s) => s.posts[postId]);
  const [index, setIndex] = useState(start);
  const media = post?.media ?? [];
  const current = media[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(media.length - 1, i + 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [media.length]);

  if (!current) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title="Image" hideTitle size="lg">
      <div className="relative -mx-6 -my-5 flex flex-col items-center bg-black">
        <img src={current.url} alt={current.alt} className="max-h-[72vh] w-full object-contain" />
        {media.length > 1 && (
          <>
            <NavButton
              side="left"
              label="Previous image"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            />
            <NavButton
              side="right"
              label="Next image"
              disabled={index === media.length - 1}
              onClick={() => setIndex(index + 1)}
            />
          </>
        )}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 flex size-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
        {current.alt && (
          <p className="w-full bg-black/80 px-5 py-3 text-sm text-white/90">
            <span className="mr-2 rounded bg-white/15 px-1.5 py-0.5 text-[0.625rem] font-bold">ALT</span>
            {current.alt}
          </p>
        )}
      </div>
    </Dialog>
  );
}

function NavButton({
  side,
  label,
  disabled,
  onClick,
}: {
  side: 'left' | 'right';
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 ${side === 'left' ? 'left-3' : 'right-3'} flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black disabled:opacity-30`}
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}
