import type { User } from '@getjolt/protocol';
import { Globe } from 'lucide-react';
import { address, avatarColor, displayName, formatFull, roleColor } from '@/lib/format';
import type { GuildState } from '@/store/data';
import { Avatar, StatusIcon, statusLabel } from '../ui/Avatar';

export function ProfileCard({
  guild,
  user,
  ring = 'var(--elevated)',
}: {
  guild: GuildState;
  user: User;
  ring?: string;
}) {
  const member = guild.members[user.id];
  const status = guild.presences[user.id] ?? 'offline';
  const name = displayName(user, member);
  const roles = (member?.roleIds ?? [])
    .map((id) => guild.roles[id])
    .filter((r) => r !== undefined)
    .sort((a, b) => b.position - a.position);
  const banner = avatarColor(user.id);

  return (
    <div>
      <div
        className="h-[4.5rem]"
        style={{ background: `linear-gradient(135deg, ${banner}, color-mix(in srgb, ${banner} 55%, black))` }}
        aria-hidden="true"
      />
      <div className="px-4 pb-4">
        <div className="-mt-10 flex items-end justify-between">
          <span className="rounded-full p-1" style={{ background: ring }}>
            <Avatar name={name} seed={user.id} url={user.avatarUrl} size={76} status={status} ring={ring} />
          </span>
          {!user.local && (
            <span className="mb-1 flex items-center gap-1 rounded-full border border-line bg-raised px-2 py-0.5 text-[0.6875rem] font-medium text-fg-muted">
              <Globe className="size-3" aria-hidden="true" /> {user.instance}
            </span>
          )}
        </div>

        <div className="mt-2.5 rounded-[var(--radius-md)] border border-line bg-sunken p-3">
          <h2 className="text-lg leading-tight font-bold">{name}</h2>
          <p data-selectable className="text-[0.8125rem] text-fg-muted">
            {address(user)}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-fg-subtle">
            <StatusIcon status={status} size={9} /> {statusLabel(status)}
          </p>

          {user.bio && (
            <section className="mt-3 border-t border-line pt-3">
              <h3 className="eyebrow">About</h3>
              <p data-selectable className="mt-1 text-[0.8125rem] whitespace-pre-wrap text-fg-muted">
                {user.bio}
              </p>
            </section>
          )}
          {member && (
            <section className="mt-3 border-t border-line pt-3">
              <h3 className="eyebrow">Member since</h3>
              <p className="mt-1 text-[0.8125rem] text-fg-muted">{formatFull(member.joinedAt)}</p>
            </section>
          )}
          {roles.length > 0 && (
            <section className="mt-3 border-t border-line pt-3">
              <h3 className="eyebrow">Roles</h3>
              <ul className="mt-2 flex flex-wrap gap-1">
                {roles.map((role) => (
                  <li
                    key={role.id}
                    className="flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pr-2 pl-1.5 text-xs font-medium"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: roleColor(role.color) ?? 'var(--fg-subtle)' }}
                      aria-hidden="true"
                    />
                    {role.name}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
