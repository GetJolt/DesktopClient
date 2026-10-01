import type { User } from '@jolt/protocol';
import * as Popover from '@radix-ui/react-popover';
import type { ReactNode } from 'react';
import { displayName } from '@/lib/format';
import type { GuildState } from '@/store/data';
import { ProfileCard } from './ProfileCard';
import { UserContextMenu } from './UserMenu';

export function UserPopover({
  guild,
  user,
  children,
  side = 'right',
}: {
  guild: GuildState;
  user: User;
  children: ReactNode;
  side?: 'left' | 'right';
}) {
  const name = displayName(user, guild.members[user.id]);
  return (
    <Popover.Root>
      <UserContextMenu guild={guild} user={user}>
        <Popover.Trigger asChild>{children}</Popover.Trigger>
      </UserContextMenu>
      <Popover.Portal>
        <Popover.Content
          side={side}
          align="start"
          sideOffset={10}
          collisionPadding={12}
          aria-label={`Profile of ${name}`}
          className="animate-pop z-50 w-[19rem] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-elevated shadow-pop"
        >
          <ProfileCard guild={guild} user={user} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
