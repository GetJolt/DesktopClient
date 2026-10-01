import type { PresenceStatus } from '@jolt/protocol';
import clsx from 'clsx';
import { useState } from 'react';
import { avatarGradient, initials } from '@/lib/format';

interface AvatarProps {
  name: string;
  seed: string;
  url?: string | null;
  size?: number;
  status?: PresenceStatus | null;
  /** Colour behind the status badge so it reads as cut out of the avatar. */
  ring?: string;
  className?: string;
}

export function Avatar({
  name,
  seed,
  url,
  size = 40,
  status,
  ring = 'var(--panel)',
  className,
}: AvatarProps) {
  const [broken, setBroken] = useState(false);
  const badge = Math.max(10, Math.round(size * 0.32));

  return (
    <span
      className={clsx('relative inline-flex shrink-0', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className="size-full rounded-full object-cover"
          onError={() => setBroken(true)}
          referrerPolicy="no-referrer"
          draggable={false}
        />
      ) : (
        <span
          className="flex size-full items-center justify-center rounded-full font-semibold text-white select-none"
          style={{
            background: avatarGradient(seed),
            fontSize: size * 0.38,
            textShadow: '0 1px 1px rgb(0 0 0 / 0.18)',
          }}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className="absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full"
          style={{ width: badge + 4, height: badge + 4, background: ring }}
        >
          <StatusIcon status={status} size={badge} />
        </span>
      )}
    </span>
  );
}

const statusLabels: Record<PresenceStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do not disturb',
  offline: 'Offline',
};

export const statusLabel = (status: PresenceStatus) => statusLabels[status];

/** Each status has a distinct shape as well as colour, so it doesn't rely on colour vision. */
export function StatusIcon({
  status,
  size = 10,
  className,
}: {
  status: PresenceStatus;
  size?: number;
  className?: string;
}) {
  const color = `var(--${status === 'dnd' ? 'dnd' : status})`;
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" className={className} aria-hidden="true">
      {status === 'online' && <circle cx="5" cy="5" r="5" fill={color} />}
      {status === 'idle' && (
        <path d="M5 0a5 5 0 1 0 5 5 3.6 3.6 0 0 1-5-5Z" fill={color} transform="rotate(-20 5 5)" />
      )}
      {status === 'dnd' && (
        <>
          <circle cx="5" cy="5" r="5" fill={color} />
          <rect x="2" y="4" width="6" height="2" rx="1" fill="var(--panel)" />
        </>
      )}
      {status === 'offline' && <circle cx="5" cy="5" r="3.5" fill="none" stroke={color} strokeWidth="2.6" />}
    </svg>
  );
}
