import { hasPermission, type Channel } from '@jolt/protocol';
import { permissionsFor } from '@jolt/sdk';
import { useMemo } from 'react';
import { useData, type GuildState } from '@/store/data';
import { useUi } from '@/store/ui';

export { canSeeChannel } from '@jolt/sdk';

export function useCurrentGuild(): GuildState | null {
  const key = useUi((s) => s.guildKey);
  return useData((s) => (key ? (s.guilds[key] ?? null) : null));
}

export function useCurrentChannel(guild: GuildState | null): Channel | null {
  const channelId = useUi((s) => (guild ? s.channelByGuild[guild.key] : undefined));
  if (!guild || !channelId) return null;
  const channel = guild.channels[channelId];
  return channel?.type === 'text' ? channel : null;
}

export function useMe(instance: string | undefined) {
  return useData((s) => (instance ? s.me[instance] : undefined));
}

/** The current user's permissions, for showing or hiding controls. The server still enforces everything. */
export function usePermissions(guild: GuildState | null, channel?: Channel | null) {
  const me = useMe(guild?.instance);
  return useMemo(() => {
    const bits = guild ? permissionsFor(guild, me?.id, channel) : 0n;
    return {
      bits,
      can: (permission: bigint) => hasPermission(bits, permission),
      isOwner: Boolean(guild && me && guild.guild.ownerId === me.id),
    };
  }, [guild, channel, me]);
}
