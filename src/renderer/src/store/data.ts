import type { ChatState } from '@getjolt/sdk';
import { useStore } from 'zustand';
import { session } from '@/lib/client';

export {
  emptyChannel,
  isUnread,
  type ChannelMessages,
  type ChatMessage,
  type ChatState,
  type GuildState,
} from '@getjolt/sdk';

/** Subscribes a component to a slice of the SDK session state. */
export function useData<T>(selector: (state: ChatState) => T): T {
  return useStore(session.store, selector);
}

/** Subscribes to the social half of the session state (timelines, posts, profiles). */
export function useSocial<T>(selector: (state: ChatState['social']) => T): T {
  return useStore(session.store, (s) => selector(s.social));
}
