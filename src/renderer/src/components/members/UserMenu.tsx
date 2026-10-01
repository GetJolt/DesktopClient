import {
  computeBasePermissions,
  hasPermission,
  highestRolePosition,
  outranks,
  Permission,
  type User,
} from '@getjolt/protocol';
import { permissionContext } from '@getjolt/sdk';
import { AtSign, Ban, Copy, Fingerprint, IdCard, PenLine, Shield, UserMinus } from 'lucide-react';
import type { ReactNode } from 'react';
import { announce } from '@/lib/announcer';
import { address, roleColor } from '@/lib/format';
import { errorMessage, rest } from '@/store/actions';
import { useData, type GuildState } from '@/store/data';
import { useUi } from '@/store/ui';
import { ContextMenuArea, type MenuEntry } from '../ui/Menu';

/** Asks the open composer to insert text at the caret. */
export function insertIntoComposer(text: string) {
  document.dispatchEvent(new CustomEvent('jolt:insert-text', { detail: text }));
}

function mentionToken(guild: GuildState, user: User): string {
  const sameHandle = Object.values(guild.members).filter((m) => m.user.handle === user.handle).length;
  return sameHandle > 1 ? `@${address(user)}` : `@${user.handle}`;
}

/** Everything you can do to a member, from a right click on their name, avatar or member list row. */
export function useUserMenu(guild: GuildState, user: User): MenuEntry[] {
  const me = useData((s) => s.me[guild.instance]);
  const openDialog = useUi((s) => s.openDialog);
  const actor = permissionContext(guild, me?.id);
  const member = guild.members[user.id];
  const isSelf = me?.id === user.id;

  const perms = actor ? computeBasePermissions(actor) : 0n;
  const has = (bit: bigint) => hasPermission(perms, bit);
  const canActOn = Boolean(
    actor &&
    member &&
    !isSelf &&
    outranks(
      actor,
      { userId: actor.userId, roleIds: actor.memberRoleIds },
      { userId: user.id, roleIds: member.roleIds },
    ),
  );

  const canNick = isSelf
    ? has(Permission.CHANGE_NICKNAME) || has(Permission.MANAGE_NICKNAMES)
    : has(Permission.MANAGE_NICKNAMES) && canActOn;
  const canRoles = Boolean(member) && has(Permission.MANAGE_ROLES) && (isSelf || canActOn);
  const ceiling = actor && actor.userId === actor.ownerId ? Infinity : actor ? highestRolePosition(actor) : 0;
  const assignable = Object.values(guild.roles)
    .filter((r) => r.id !== guild.guild.id && r.position < ceiling)
    .sort((a, b) => b.position - a.position);

  const toggleRole = (roleId: string, on: boolean) => {
    if (!member) return;
    const roleIds = on
      ? [...new Set([...member.roleIds, roleId])]
      : member.roleIds.filter((r) => r !== roleId);
    rest(guild.instance)
      .updateMember(guild.guild.id, user.id, { roleIds })
      .catch((e) => announce(errorMessage(e), 'assertive'));
  };

  const copy = (text: string, what: string) => {
    void navigator.clipboard.writeText(text);
    announce(`${what} copied`);
  };

  return [
    {
      label: 'View profile',
      icon: <IdCard />,
      onSelect: () => openDialog({ type: 'profile', guildKey: guild.key, userId: user.id }),
    },
    !isSelf && {
      label: 'Mention',
      icon: <AtSign />,
      onSelect: () => insertIntoComposer(`${mentionToken(guild, user)} `),
    },
    canNick && {
      label: isSelf ? 'Change nickname' : 'Edit nickname',
      icon: <PenLine />,
      onSelect: () => openDialog({ type: 'nickname', guildKey: guild.key, userId: user.id }),
    },
    canRoles &&
      assignable.length > 0 && {
        type: 'submenu',
        label: 'Roles',
        icon: <Shield />,
        items: assignable.map((role) => ({
          type: 'checkbox' as const,
          label: role.name,
          swatch: roleColor(role.color) ?? 'var(--fg-subtle)',
          checked: member?.roleIds.includes(role.id) ?? false,
          onCheckedChange: (on: boolean) => toggleRole(role.id, on),
        })),
      },
    'separator',
    canActOn &&
      has(Permission.KICK_MEMBERS) && {
        label: `Kick ${member?.nickname || user.displayName}`,
        icon: <UserMinus />,
        danger: true,
        onSelect: () =>
          openDialog({ type: 'moderate', guildKey: guild.key, userId: user.id, action: 'kick' }),
      },
    canActOn &&
      has(Permission.BAN_MEMBERS) && {
        label: `Ban ${member?.nickname || user.displayName}`,
        icon: <Ban />,
        danger: true,
        onSelect: () => openDialog({ type: 'moderate', guildKey: guild.key, userId: user.id, action: 'ban' }),
      },
    'separator',
    {
      label: 'Copy address',
      icon: <Copy />,
      hint: address(user).length > 22 ? undefined : address(user),
      onSelect: () => copy(address(user), 'Address'),
    },
    { label: 'Copy user ID', icon: <Fingerprint />, onSelect: () => copy(user.id, 'User ID') },
  ];
}

export function UserContextMenu({
  guild,
  user,
  children,
}: {
  guild: GuildState;
  user: User;
  children: ReactNode;
}) {
  const items = useUserMenu(guild, user);
  return (
    <ContextMenuArea items={items} wrap>
      {children}
    </ContextMenuArea>
  );
}
