import { Limits, type User } from '@getjolt/protocol';
import clsx from 'clsx';
import { Camera, ImageUp, Minus, Plus, Trash2 } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { announce } from '@/lib/announcer';
import { session } from '@/lib/client';
import { errorMessage } from '@/store/actions';
import { Avatar } from '../ui/Avatar';
import { Button, IconButton } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const STAGE = 288;
const OUTPUT = 512;
const MAX_ZOOM = 4;

export function AvatarPicker({ me, name, children }: { me: User; name: string; children?: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setError('Choose a PNG, JPEG, WebP or GIF image.');
    if (file.size > MAX_SOURCE_BYTES) return setError('That image is too big. Try one under 25 MB.');
    setSource(URL.createObjectURL(file));
  };

  const closeCropper = () => {
    if (source) URL.revokeObjectURL(source);
    setSource(null);
  };

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      await session.setAvatar(null);
      announce('Avatar removed.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files[0]);
  };

  return (
    <div
      className="flex items-center gap-5"
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={me.avatarUrl ? 'Change avatar' : 'Upload an avatar'}
        className={clsx(
          'group relative shrink-0 rounded-full outline-offset-4',
          dragging && 'ring-2 ring-accent ring-offset-4 ring-offset-sunken',
        )}
      >
        <Avatar name={name} seed={me.id} url={me.avatarUrl} size={72} />
        <span
          className={clsx(
            'absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/55 text-[0.6875rem] font-semibold text-white transition-opacity duration-150',
            dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
          )}
          aria-hidden="true"
        >
          <Camera className="size-5" />
          {dragging ? 'Drop' : 'Change'}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="min-w-0 flex-1">
        {children}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            icon={<ImageUp className="size-4" />}
            onClick={() => input.current?.click()}
          >
            {me.avatarUrl ? 'Change avatar' : 'Upload avatar'}
          </Button>
          {me.avatarUrl && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="size-4" />}
              loading={removing}
              onClick={remove}
            >
              Remove
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      {source && <CropDialog key={source} src={source} onClose={closeCropper} />}
    </div>
  );
}

interface Crop {
  zoom: number;
  x: number;
  y: number;
}

/** Keeps the image covering the whole crop circle, whatever the zoom. */
function clamp(crop: Crop, natural: { w: number; h: number }): Crop {
  const scale = coverScale(natural) * crop.zoom;
  const limitX = (natural.w * scale - STAGE) / 2;
  const limitY = (natural.h * scale - STAGE) / 2;
  return {
    zoom: crop.zoom,
    x: Math.max(-limitX, Math.min(limitX, crop.x)),
    y: Math.max(-limitY, Math.min(limitY, crop.y)),
  };
}

const coverScale = (natural: { w: number; h: number }) => STAGE / Math.min(natural.w, natural.h);

/** Zooming scales the offset too, so whatever is under the centre of the circle stays there. */
function zoomed(crop: Crop, zoom: number, natural: { w: number; h: number }): Crop {
  const next = Math.max(1, Math.min(MAX_ZOOM, zoom));
  return clamp({ zoom: next, x: (crop.x * next) / crop.zoom, y: (crop.y * next) / crop.zoom }, natural);
}

function CropDialog({ src, onClose }: { src: string; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ x: number; y: number; crop: Crop } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<Crop>({ zoom: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (next: (current: Crop) => Crop) => {
    if (natural) setCrop((current) => clamp(next(current), natural));
  };

  const zoomTo = (zoom: number) => update((c) => zoomed(c, zoom, natural!));

  // React's wheel listener is passive, so it can't stop the dialog from scrolling underneath.
  useEffect(() => {
    const el = stage.current;
    if (!el || !natural) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setCrop((c) => zoomed(c, c.zoom * Math.exp(-e.deltaY * 0.0015), natural));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [natural]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, crop };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    update(() => ({
      ...start.crop,
      x: start.crop.x + e.clientX - start.x,
      y: start.crop.y + e.clientY - start.y,
    }));
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 32 : 8;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    if (moves[e.key]) {
      const [dx, dy] = moves[e.key]!;
      update((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
    } else if (e.key === '+' || e.key === '=') {
      zoomTo(crop.zoom + 0.25);
    } else if (e.key === '-') {
      zoomTo(crop.zoom - 0.25);
    } else {
      return;
    }
    e.preventDefault();
  };

  const save = async () => {
    if (!natural || !image.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await render(image.current, natural, crop);
      await session.setAvatar(blob);
      announce('Avatar updated.');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title="Position your avatar"
      size="lg"
      description="Drag to move it and scroll to zoom. Arrow keys and plus or minus work too."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} loading={busy} disabled={!natural}>
            Save avatar
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div
          ref={stage}
          tabIndex={0}
          role="group"
          aria-roledescription="crop area"
          aria-label="Avatar crop. Use the arrow keys to move the image and plus or minus to zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={onKeyDown}
          className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-[var(--radius-lg)] bg-sunken outline-offset-2 select-none active:cursor-grabbing"
          style={{ width: STAGE, height: STAGE }}
        >
          <CropView
            src={src}
            natural={natural}
            crop={crop}
            size={STAGE}
            imageRef={image}
            onLoad={(img) => setNatural({ w: img.naturalWidth, h: img.naturalHeight })}
            onError={() => setError("That image couldn't be opened. Try a different file.")}
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0/0.6)] ring-2 ring-white/80"
            aria-hidden="true"
          />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-5">
          <div>
            <p className="mb-2.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase">Preview</p>
            <div className="flex items-end gap-3" aria-hidden="true">
              {[72, 40, 24].map((size) => (
                <span
                  key={size}
                  className="relative shrink-0 overflow-hidden rounded-full bg-sunken"
                  style={{ width: size, height: size }}
                >
                  <CropView src={src} natural={natural} crop={crop} size={size} />
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              label="Zoom out"
              size="sm"
              onClick={() => zoomTo(crop.zoom - 0.25)}
              disabled={crop.zoom <= 1}
            >
              <Minus className="size-4" />
            </IconButton>
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={crop.zoom}
              onChange={(e) => zoomTo(Number(e.target.value))}
              aria-label="Zoom"
              aria-valuetext={`${Math.round(crop.zoom * 100)} percent`}
              className="min-w-0 flex-1 accent-[var(--accent)]"
              disabled={!natural}
            />
            <IconButton
              label="Zoom in"
              size="sm"
              onClick={() => zoomTo(crop.zoom + 0.25)}
              disabled={crop.zoom >= MAX_ZOOM}
            >
              <Plus className="size-4" />
            </IconButton>
          </div>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </Dialog>
  );
}

/** The cropped image at any size, so the previews match the editor exactly. */
function CropView({
  src,
  natural,
  crop,
  size,
  imageRef,
  onLoad,
  onError,
}: {
  src: string;
  natural: { w: number; h: number } | null;
  crop: Crop;
  size: number;
  imageRef?: RefObject<HTMLImageElement | null>;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: () => void;
}) {
  const factor = size / STAGE;
  const scale = natural ? coverScale(natural) * crop.zoom * factor : 0;
  return (
    <img
      ref={imageRef}
      src={src}
      alt=""
      draggable={false}
      onLoad={(e) => onLoad?.(e.currentTarget)}
      onError={onError}
      className="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
      style={
        natural
          ? {
              width: natural.w * scale,
              height: natural.h * scale,
              transform: `translate(-50%, -50%) translate(${crop.x * factor}px, ${crop.y * factor}px)`,
            }
          : { opacity: 0 }
      }
    />
  );
}

/** Draws the area inside the circle to a square canvas and encodes it small enough to upload. */
async function render(img: HTMLImageElement, natural: { w: number; h: number }, crop: Crop): Promise<Blob> {
  const scale = coverScale(natural) * crop.zoom;
  const side = STAGE / scale;
  const sx = natural.w / 2 - crop.x / scale - side / 2;
  const sy = natural.h / 2 - crop.y / scale - side / 2;
  const out = Math.round(Math.max(128, Math.min(OUTPUT, side)));

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = out;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);

  for (const quality of [0.9, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (blob && blob.size <= Limits.avatarBytes) return blob;
  }
  throw new Error("That image couldn't be made small enough. Try a different one.");
}
