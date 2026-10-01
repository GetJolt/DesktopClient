import type { Member, User } from '@jolt/protocol';

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const date = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const full = new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' });
const dayLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const startOfDay = (ms: number) => new Date(new Date(ms).toDateString()).getTime();

export function formatTimestamp(ms: number): string {
  const today = startOfDay(Date.now());
  const day = startOfDay(ms);
  if (day === today) return `Today at ${time.format(ms)}`;
  if (day === today - 86_400_000) return `Yesterday at ${time.format(ms)}`;
  return `${date.format(ms)}, ${time.format(ms)}`;
}

export const formatTime = (ms: number) => time.format(ms);
export const formatFull = (ms: number) => full.format(ms);
export const formatDay = (ms: number) => dayLabel.format(ms);
export const isSameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);

export function displayName(
  user: Pick<User, 'displayName' | 'handle'>,
  member?: Pick<Member, 'nickname'> | null,
): string {
  return member?.nickname || user.displayName || user.handle;
}

export const address = (user: Pick<User, 'handle' | 'instance'>) => `${user.handle}@${user.instance}`;

export function initials(name: string, max = 2): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return [...words[0]!].slice(0, 2).join('');
  // Avatars use first and last word ("Bob from B" → "BB"); guild icons may show up to three.
  const picked = max === 2 ? [words[0]!, words[words.length - 1]!] : words.slice(0, max);
  return picked.map((w) => [...w][0]!.toUpperCase()).join('');
}

const AVATAR_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#ea580c',
  '#d97706',
  '#059669',
  '#0d9488',
  '#0284c7',
  '#2563eb',
];

/** A stable colour per user. FNV-1a, because sequential snowflake ids cluster under simpler hashes. */
export function avatarColor(seed: string): string {
  let hash = 0x811c9dc5;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length]!;
}

export function avatarGradient(seed: string): string {
  const color = avatarColor(seed);
  return `linear-gradient(140deg, color-mix(in srgb, ${color} 78%, white), ${color} 55%, color-mix(in srgb, ${color} 80%, black))`;
}

export function roleColor(color: number | null): string | undefined {
  return color === null ? undefined : `#${color.toString(16).padStart(6, '0')}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
