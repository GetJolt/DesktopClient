import type { PresenceStatus } from '@getjolt/protocol';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScopedKey } from '@/lib/keys';

export type ThemePref = 'system' | 'dark' | 'light' | 'contrast';
export type Density = 'cozy' | 'compact';
export type SettingsTab = 'account' | 'appearance' | 'accessibility' | 'devices' | 'instances' | 'about';

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
  | { type: 'moderate'; guildKey: ScopedKey; userId: string; action: 'kick' | 'ban' };

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

  set: (partial: Partial<UiState>) => void;
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

      set: (partial) => set(partial),
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
      partialize: ({ dialog: _dialog, set: _set, ...rest }) => rest,
    },
  ),
);
