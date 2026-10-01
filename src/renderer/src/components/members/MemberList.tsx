import { type Channel, type Member, type Role } from '@jolt/protocol';
import { canSeeChannel } from '@jolt/sdk';
import clsx from 'clsx';
import { useMemo, type CSSProperties } from 'react';
import { useRovingFocus } from '@/hooks/useRovingFocus';
import { displayName, pluralize, roleColor } from '@/lib/format';
import type { GuildState } from '@/store/data';
import { Avatar } from '../ui/Avatar';
import { UserPopover } from './UserPopover';

interface Section {
  key: string;
  title: string;
  members: Member[];
}

function buildSections(guild: GuildState, channel: Channel): Section[] {
  const hoisted = Object.values(guild.roles)
    .filter((r) => r.hoist && r.id !== guild.guild.id)
    .sort((a, b) => b.position - a.position);
  const members = Object.values(guild.members)
    .filter((m) => canSeeChannel(guild, channel, m.user.id))
    .sort((a, b) => displayName(a.user, a).localeCompare(displayName(b.user, b)));

  const online = members.filter((m) => (guild.presences[m.user.id] ?? 'offline') !== 'offline');
  const offline = members.filter((m) => (guild.presences[m.user.id] ?? 'offline') === 'offline');

  const sections: Section[] = [];
  const placed = new Set<string>();
  for (const role of hoisted) {
    const inRole = online.filter((m) => !placed.has(m.user.id) && topHoisted(m, hoisted)?.id === role.id);
    inRole.forEach((m) => placed.add(m.user.id));
    if (inRole.length) sections.push({ key: role.id, title: role.name, members: inRole });
  }
  const rest = online.filter((m) => !placed.has(m.user.id));
  if (rest.length) sections.push({ key: 'online', title: 'Online', members: rest });
  if (offline.length) sections.push({ key: 'offline', title: 'Offline', members: offline });
  return sections;
}

function topHoisted(member: Member, hoisted: Role[]): Role | undefined {
  return hoisted.find((r) => member.roleIds.includes(r.id));
}

export function MemberList({ guild, channel }: { guild: GuildState; channel: Channel }) {
  const sections = useMemo(() => buildSections(guild, channel), [guild, channel]);
  const onKeyDown = useRovingFocus('vertical');
  const firstId = sections[0]?.members[0]?.user.id;

  return (
    <aside
      aria-label="Members"
      data-region="members"
      className="scroll-thin w-68 shrink-0 overflow-y-auto border-l border-line bg-sunken px-2.5 pt-4 pb-4"
      onKeyDown={onKeyDown}
    >
      {sections.map((section) => (
        <section
          key={section.key}
          aria-label={`${section.title}, ${pluralize(section.members.length, 'member')}`}
          className="mb-5"
        >
          <h2 className="eyebrow mb-1.5 px-2" aria-hidden="true">
            {section.title} — {section.members.length}
          </h2>
          <ul>
            {section.members.map((member) => (
              <li key={member.user.id}>
                <MemberRow
                  guild={guild}
                  member={member}
                  offline={section.key === 'offline'}
                  tabIndex={member.user.id === firstId ? 0 : -1}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </aside>
  );
}

function MemberRow({
  guild,
  member,
  offline,
  tabIndex,
}: {
  guild: GuildState;
  member: Member;
  offline: boolean;
  tabIndex: number;
}) {
  const name = displayName(member.user, member);
  const status = guild.presences[member.user.id] ?? 'offline';
  const color = roleColor(
    member.roleIds
      .map((id) => guild.roles[id])
      .filter((r) => r && r.color !== null)
      .sort((a, b) => b!.position - a!.position)[0]?.color ?? null,
  );

  return (
    <UserPopover guild={guild} user={member.user} side="left">
      <button
        type="button"
        data-roving-item
        tabIndex={tabIndex}
        className={clsx(
          'press flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors hover:bg-hover data-[state=open]:bg-active',
          offline && 'opacity-50 hover:opacity-100',
        )}
      >
        <Avatar
          name={name}
          seed={member.user.id}
          url={member.user.avatarUrl}
          size={32}
          status={status}
          ring="var(--sunken)"
        />
        <span className="min-w-0">
          <span
            className={clsx(
              'block truncate text-[0.9375rem] leading-tight font-medium',
              color && 'role-text',
            )}
            style={color ? ({ '--role-color': color } as CSSProperties) : undefined}
          >
            {name}
          </span>
          {guild.guild.ownerId === member.user.id ? (
            <span className="block text-xs text-fg-subtle">Server owner</span>
          ) : (
            !member.user.local && (
              <span className="block truncate text-xs text-fg-subtle">@{member.user.instance}</span>
            )
          )}
        </span>
      </button>
    </UserPopover>
  );
}
