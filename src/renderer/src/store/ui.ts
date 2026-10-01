import type { PresenceStatus } from '@getjolt/protocol';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScopedKey } from '@/lib/keys';

export type ThemePref = 'system' | 'dark' | 'light' | 'contrast';
export type Density = 'cozy' | 'compact';
export type SettingsTab =
  'account' | 'linked' | 'appearance' | 'accessibility' | 'devices' | 'instances' | 'about';

/** What the Home area shows: the social side of Jolt. */
export type HomeRoute =
  | { view: 'timeline' }
  | { view: 'notifications' }
  | { view: 'people' }
  | { view: 'profile'; userId: string }
  | { view: 'thread'; postId: string }
  | { view: 'link'; linkId: string };

export type Dialog =
  | { type: 'settings'; tab: SettingsTab }
  | { type: 'guildSettings'; guildKey: ScopedKey; tab?: string }
  | { type: 'addGuild'; inviteLink?: string }
  | { type: 'invite'; guildKey: ScopedKey; channelId: string }
  | {
      type: 'channel';
      guildKey: ScopedKey;
      channelId?: string;
      parentId?: string | null;
      kind?: 'text' | 'category';
    }
  | { type: 'quickSwitcher' }
  | { type: 'shortcuts' }
  | { type: 'profile'; guildKey: ScopedKey; userId: string }
  | { type: 'nickname'; guildKey: ScopedKey; userId: string }
  | { type: 'moderate'; guildKey: ScopedKey; userId: string; action: 'kick' | 'ban' }
  | { type: 'compose'; replyToId?: string; quoteId?: string }
  | { type: 'lightbox'; postId: string; index: number };

interface UiState {
  theme: ThemePref;
  density: Density;
  fontScale: number;
  reducedMotion: 'system' | 'on' | 'off';
  announceMessages: boolean;
  underlineLinks: boolean;
  showMemberList: boolean;
  status: PresenceStatus;
  collapsedCategories: Record<string, boolean>;

  guildKey: ScopedKey | null;
  channelByGuild: Record<ScopedKey, string>;
  dialog: Dialog | null;
  /** Where you are in Home, with a short history for the back button. */
  home: HomeRoute;
  homeHistory: HomeRoute[];

  set: (partial: Partial<UiState>) => void;
  /** Opens a Home view, leaving any server you were in. */
  goHome: (route?: HomeRoute) => void;
  goBack: () => void;
  openGuild: (guildKey: ScopedKey | null) => void;
  openChannel: (guildKey: ScopedKey, channelId: string) => void;
  toggleCategory: (key: string) => void;
  openDialog: (dialog: Dialog) => void;
  closeDialog: () => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      density: 'cozy',
      fontScale: 1,
      reducedMotion: 'system',
      announceMessages: true,
      underlineLinks: false,
      showMemberList: true,
      status: 'online',
      collapsedCategories: {},
      guildKey: null,
      channelByGuild: {},
      dialog: null,
      home: { view: 'timeline' },
      homeHistory: [],

      set: (partial) => set(partial),
      goHome: (route) =>
        set((s) => {
          if (!route) return { guildKey: null };
          const same = JSON.stringify(route) === JSON.stringify(s.home);
          return {
            guildKey: null,
            home: route,
            homeHistory: same || s.guildKey !== null ? s.homeHistory : [...s.homeHistory.slice(-30), s.home],
          };
        }),
      goBack: () =>
        set((s) => {
          const previous = s.homeHistory.at(-1);
          return previous
            ? { home: previous, homeHistory: s.homeHistory.slice(0, -1) }
            : { home: { view: 'timeline' } };
        }),
      openGuild: (guildKey) => set({ guildKey }),
      openChannel: (guildKey, channelId) =>
        set((s) => ({ guildKey, channelByGuild: { ...s.channelByGuild, [guildKey]: channelId } })),
      toggleCategory: (key) =>
        set((s) => ({
          collapsedCategories: { ...s.collapsedCategories, [key]: !s.collapsedCategories[key] },
        })),
      openDialog: (dialog) => set({ dialog }),
      closeDialog: () => set({ dialog: null }),
    }),
    {
      name: 'jolt.ui',
      partialize: ({ dialog: _dialog, homeHistory: _history, ...rest }) => {
        const { set: _set, goHome: _goHome, goBack: _goBack, ...prefs } = rest;
        return prefs;
      },
    },
  ),
);
