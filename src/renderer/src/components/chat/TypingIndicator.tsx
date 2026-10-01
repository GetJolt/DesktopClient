import { Fragment, useMemo } from 'react';
import { displayName } from '@/lib/format';
import type { ScopedKey } from '@/lib/keys';
import { useData, type GuildState } from '@/store/data';

/** Visual only: announcing every typing burst to screen readers would be noise. */
export function TypingIndicator({ guild, channelKey }: { guild: GuildState; channelKey: ScopedKey }) {
  const typing = useData((s) => s.typing[channelKey]);
  // Expired entries are swept out of the store by the SDK every few seconds.
  const names = useMemo(() => {
    return Object.entries(typing ?? {})
      .sort(([, a], [, b]) => a - b)
      .map(([id]) => {
        const member = guild.members[id];
        return member ? displayName(member.user, member) : 'Someone';
      });
  }, [typing, guild.members]);

  return (
    <div className="flex h-6 items-center gap-1.5 px-1 text-xs text-fg-muted" aria-hidden="true">
      {names.length > 0 && (
        <>
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot size-1 rounded-full bg-fg-muted"
                style={{ animationDelay: `${i * 160}ms` }}
              />
            ))}
          </span>
          <span className="truncate">
            {names.length > 3 ? (
              'Several people are typing…'
            ) : (
              <>
                {names.map((name, i) => (
                  <Fragment key={i}>
                    {i > 0 && (i === names.length - 1 ? ' and ' : ', ')}
                    <strong className="font-semibold text-fg">{name}</strong>
                  </Fragment>
                ))}
                {names.length === 1 ? ' is typing…' : ' are typing…'}
              </>
            )}
          </span>
        </>
      )}
    </div>
  );
}
