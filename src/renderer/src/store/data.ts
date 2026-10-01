import type { ChatState } from '@jolt/sdk';
import { useStore } from 'zustand';
import { session } from '@/lib/client';

export {
  emptyChannel,
  isUnread,
  type ChannelMessages,
  type ChatMessage,
  type ChatState,
  type GuildState,
} from '@jolt/sdk';

/** Subscribes a component to a slice of the SDK session state. */
export function useData<T>(selector: (state: ChatState) => T): T {
  return useStore(session.store, selector);
}
