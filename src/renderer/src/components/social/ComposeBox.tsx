import { Limits, type Post, type PostVisibility } from '@getjolt/protocol';
import { errorMessage, linkOf, type UploadedMedia } from '@getjolt/sdk';
import clsx from 'clsx';
import { Globe, ImagePlus, Lock, LockOpen, TriangleAlert, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from 'react';
import { announce } from '@/lib/announcer';
import { session } from '@/lib/client';
import { displayName } from '@/lib/format';
import { useData, useSocial } from '@/store/data';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Dropdown } from '../ui/Menu';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

interface Attachment {
  key: string;
  preview: string;
  alt: string;
  uploaded?: UploadedMedia;
  error?: string;
}

const VISIBILITY: Record<PostVisibility, { label: string; hint: string; icon: typeof Globe }> = {
  public: { label: 'Public', hint: 'Anyone, on any server', icon: Globe },
  unlisted: { label: 'Unlisted', hint: 'Anyone with the link, kept out of public feeds', icon: LockOpen },
  followers: { label: 'Followers only', hint: 'Only people who follow you', icon: Lock },
};

interface Props {
  replyTo?: Post | null;
  quote?: Post | null;
  autoFocus?: boolean;
  onPosted?: () => void;
  placeholder?: string;
}

/** Shrinks images that are too big to upload; most phone photos are, and nobody needs 48 megapixels in a feed. */
async function fitForUpload(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const largest = Math.max(bitmap.width, bitmap.height);
  if (file.size <= Limits.mediaBytes && largest <= Limits.mediaPixels) return file;
  const scale = Math.min(1, 2560 / largest);
  const canvas = new OffscreenCanvas(Math.round(bitmap.width * scale), Math.round(bitmap.height * scale));
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.88 });
}

export function ComposeBox({ replyTo, quote, autoFocus, onPosted, placeholder }: Props) {
  const me = useData((s) => (s.homeInstance ? s.me[s.homeInstance] : undefined));
  const links = useSocial((s) => s.linkedAccounts);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [cw, setCw] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>(
    replyTo?.visibility === 'followers' ? 'followers' : 'public',
  );
  const [crosspost, setCrosspost] = useState<string[]>(() =>
    replyTo ? [] : links.filter((l) => l.crosspostDefault).map((l) => l.id),
  );
  const [altFor, setAltFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const counterId = useId();

  // Replies to Bluesky or Mastodon posts are sent there as plain text, as the linked account.
  const replyLink = replyTo ? links.find((l) => l.id === linkOf(replyTo)) : undefined;
  const length = [...text.trim()].length;
  const over = length > Limits.postLength;
  const uploading = attachments.some((a) => !a.uploaded && !a.error);
  const canPost = !busy && !over && !uploading && (length > 0 || attachments.some((a) => a.uploaded));

  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
  }, [text]);

  useEffect(() => () => attachments.forEach((a) => URL.revokeObjectURL(a.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const attach = (list: Iterable<File>) => {
    setError(null);
    const images = [...list].filter((f) => ACCEPT.includes(f.type));
    const room = Limits.postImages - attachments.length;
    if (images.length > room) setError(`Posts can have up to ${Limits.postImages} images.`);
    for (const file of images.slice(0, Math.max(0, room))) {
      const key = `${file.name}-${file.size}-${Math.random()}`;
      setAttachments((current) => [...current, { key, preview: URL.createObjectURL(file), alt: '' }]);
      fitForUpload(file)
        .then((blob) => session.social.uploadMedia(blob))
        .then((uploaded) => setAttachments((c) => c.map((a) => (a.key === key ? { ...a, uploaded } : a))))
        .catch((err) =>
          setAttachments((c) => c.map((a) => (a.key === key ? { ...a, error: errorMessage(err) } : a))),
        );
    }
  };

  const remove = (key: string) =>
    setAttachments((current) => {
      const gone = current.find((a) => a.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return current.filter((a) => a.key !== key);
    });

  const submit = async () => {
    if (!canPost) return;
    setBusy(true);
    setError(null);
    try {
      const ready = attachments.filter((a) => a.uploaded);
      const pending = session.social.createPost({
        text,
        media: ready.map((a) => ({ ...a.uploaded!, alt: a.alt })),
        replyTo,
        quote,
        visibility,
        cw: cw?.trim() || null,
        crosspost,
      });
      // The post shows up straight away, so the box can clear before the server answers.
      setText('');
      setCw(null);
      attachments.forEach((a) => URL.revokeObjectURL(a.preview));
      setAttachments([]);
      onPosted?.();
      await pending;
      announce(replyTo ? 'Reply posted' : 'Posted');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const Visibility = VISIBILITY[visibility];
  const editing = attachments.find((a) => a.key === altFor);

  return (
    <div
      className="flex gap-3"
      onDragOver={(e) => e.dataTransfer.types.includes('Files') && e.preventDefault()}
      onDrop={(e: DragEvent) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        attach(e.dataTransfer.files);
      }}
    >
      {me && <Avatar name={displayName(me)} seed={me.id} url={me.avatarUrl} size={40} className="mt-0.5" />}
      <div className="min-w-0 flex-1">
        {cw !== null && (
          <div className="mb-2 flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-sunken px-3">
            <TriangleAlert className="size-4 shrink-0 text-idle" aria-hidden="true" />
            <input
              value={cw}
              onChange={(e) => setCw(e.target.value)}
              maxLength={Limits.contentWarning}
              placeholder="What's the content warning?"
              aria-label="Content warning"
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle"
            />
          </div>
        )}
        <textarea
          ref={input}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e: ClipboardEvent) => {
            const images = [...e.clipboardData.files].filter((f) => f.type.startsWith('image/'));
            if (images.length) {
              e.preventDefault();
              attach(images);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void submit();
            }
          }}
          rows={2}
          placeholder={placeholder ?? (replyTo ? 'Write your reply' : "What's happening?")}
          aria-label={replyTo ? `Reply to ${displayName(replyTo.author)}` : 'Write a post'}
          aria-describedby={counterId}
          className="block w-full resize-none bg-transparent py-1.5 text-[1.0625rem] leading-relaxed outline-none placeholder:text-fg-subtle"
        />

        {attachments.length > 0 && (
          <ul className={clsx('mt-2 grid gap-2', attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {attachments.map((a) => (
              <li
                key={a.key}
                className="relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-sunken"
              >
                <img
                  src={a.preview}
                  alt={a.alt}
                  className={clsx(
                    'w-full object-cover',
                    attachments.length === 1 ? 'max-h-80' : 'aspect-[4/3]',
                    !a.uploaded && 'opacity-60',
                  )}
                />
                <div className="absolute inset-x-1.5 top-1.5 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setAltFor(a.key)}
                    className={clsx(
                      'rounded-md px-2 py-1 text-xs font-bold backdrop-blur',
                      a.alt ? 'bg-black/70 text-white' : 'bg-accent text-on-accent',
                    )}
                  >
                    {a.alt ? 'ALT ✓' : '+ ALT'}
                  </button>
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => remove(a.key)}
                    className="flex size-7 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                {a.error && (
                  <p
                    role="alert"
                    className="absolute inset-x-0 bottom-0 bg-danger-fill px-2 py-1 text-xs text-on-danger"
                  >
                    {a.error}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {replyLink && (
          <p className="mt-1 text-xs text-fg-subtle">
            Replying on {replyLink.provider === 'bluesky' ? 'Bluesky' : 'Mastodon'} as {replyLink.handle}
          </p>
        )}

        {links.length > 0 && !replyTo && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Also post to">
            <span className="text-xs text-fg-subtle">Also post to</span>
            {links.map((link) => {
              const on = crosspost.includes(link.id);
              return (
                <button
                  key={link.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setCrosspost((c) => (on ? c.filter((id) => id !== link.id) : [...c, link.id]))
                  }
                  className={clsx(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    on
                      ? 'border-accent bg-accent-soft text-accent-text'
                      : 'border-line text-fg-muted hover:border-line-strong',
                  )}
                >
                  {link.provider === 'bluesky' ? 'Bluesky' : 'Mastodon'} · {link.handle}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1 border-t border-line pt-2">
          <input
            ref={files}
            type="file"
            accept={ACCEPT.join(',')}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) attach(e.target.files);
              e.target.value = '';
            }}
          />
          {!replyLink && (
            <>
              <ToolButton
                label="Add images"
                disabled={attachments.length >= Limits.postImages}
                onClick={() => files.current?.click()}
              >
                <ImagePlus className="size-[1.125rem]" aria-hidden="true" />
              </ToolButton>
              <ToolButton
                label={cw === null ? 'Add a content warning' : 'Remove the content warning'}
                pressed={cw !== null}
                onClick={() => setCw(cw === null ? '' : null)}
              >
                <TriangleAlert className="size-[1.125rem]" aria-hidden="true" />
              </ToolButton>
              <Dropdown
                items={(Object.keys(VISIBILITY) as PostVisibility[]).map((key) => {
                  const option = VISIBILITY[key];
                  return {
                    type: 'checkbox' as const,
                    label: `${option.label}. ${option.hint}`,
                    checked: visibility === key,
                    onCheckedChange: () => setVisibility(key),
                    disabled: !!replyTo && replyTo.visibility === 'followers' && key !== 'followers',
                  };
                })}
                trigger={
                  <button
                    type="button"
                    aria-label={`Who can see this: ${Visibility.label}`}
                    className="press flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium text-accent-text hover:bg-accent-soft"
                  >
                    <Visibility.icon className="size-4" aria-hidden="true" />
                    {Visibility.label}
                  </button>
                }
              />
            </>
          )}

          <div className="ml-auto flex items-center gap-3">
            <CharacterRing id={counterId} length={length} />
            <Button size="sm" onClick={() => void submit()} disabled={!canPost} loading={busy}>
              {replyTo ? 'Reply' : 'Post'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setAltFor(null)}
        title="Describe this image"
        description="Alt text is read aloud to people who can't see the image. Say what matters about it."
        footer={<Button onClick={() => setAltFor(null)}>Done</Button>}
      >
        {editing && (
          <>
            <img
              src={editing.preview}
              alt=""
              className="mb-3 max-h-56 w-full rounded-[var(--radius-md)] object-contain"
            />
            <textarea
              autoFocus
              value={editing.alt}
              maxLength={Limits.altText}
              onChange={(e) =>
                setAttachments((c) =>
                  c.map((a) => (a.key === editing.key ? { ...a, alt: e.target.value } : a)),
                )
              }
              rows={4}
              aria-label="Alt text"
              className="w-full resize-none rounded-[var(--radius-md)] border border-line bg-sunken p-3 text-sm outline-none focus:border-accent"
            />
          </>
        )}
      </Dialog>
    </div>
  );
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'press flex size-8 items-center justify-center rounded-full text-accent-text hover:bg-accent-soft disabled:opacity-40',
        pressed && 'bg-accent-soft',
      )}
    >
      {children}
    </button>
  );
}

/** A ring that fills as you approach the limit, and turns into a countdown near the end. */
function CharacterRing({ id, length }: { id: string; length: number }) {
  const max = Limits.postLength;
  const left = max - length;
  const progress = Math.min(1, length / max);
  const r = 9;
  const circumference = 2 * Math.PI * r;
  const tone = left < 0 ? 'var(--danger)' : left <= 20 ? 'var(--idle)' : 'var(--accent)';
  return (
    <span id={id} className="flex items-center gap-1.5" aria-live="polite">
      {left <= 20 && (
        <span
          className={clsx('text-xs font-semibold tabular-nums', left < 0 ? 'text-danger' : 'text-fg-muted')}
        >
          {left}
        </span>
      )}
      <span className="sr-only">
        {left < 0 ? `${-left} characters over the limit` : `${left} characters left`}
      </span>
      {length >= Limits.postLength * 0.5 && (
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="-rotate-90">
          <circle
            cx="11"
            cy="11"
            r={r}
            fill="none"
            stroke="var(--line-strong)"
            strokeWidth="2.5"
            opacity="0.9"
          />
          <circle
            cx="11"
            cy="11"
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
      )}
    </span>
  );
}
