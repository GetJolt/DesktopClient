import { useEffect } from 'react';
import { announce } from '@/lib/announcer';
import { useUi } from '@/store/ui';

const REGION_LABELS: Record<string, string> = {
  servers: 'Servers',
  channels: 'Channels',
  messages: 'Messages',
  composer: 'Message composer',
  members: 'Members',
};

/** F6 / Shift+F6 cycles focus between the main regions, like other desktop apps. */
function cycleRegion(backwards: boolean) {
  const regions = Array.from(document.querySelectorAll<HTMLElement>('[data-region]'));
  if (regions.length === 0) return;
  const current = regions.findIndex((r) => r.contains(document.activeElement));
  const nextIndex = (current + (backwards ? -1 : 1) + regions.length) % regions.length;
  const region = regions[nextIndex]!;
  const target =
    region.querySelector<HTMLElement>('[data-region-focus]') ??
    region.querySelector<HTMLElement>('[tabindex="0"], button, [href], input, textarea') ??
    region;
  target.focus();
  announce(REGION_LABELS[region.dataset.region ?? ''] ?? '', 'polite');
}

export function useGlobalHotkeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      const ui = useUi.getState();

      if (event.key === 'F6') {
        event.preventDefault();
        cycleRegion(event.shiftKey);
      } else if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        ui.openDialog({ type: 'quickSwitcher' });
      } else if (mod && event.key === ',') {
        event.preventDefault();
        ui.openDialog({ type: 'settings', tab: 'account' });
      } else if (mod && (event.key === '?' || (event.shiftKey && event.code === 'Slash'))) {
        event.preventDefault();
        ui.openDialog({ type: 'shortcuts' });
      } else if (mod && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        ui.set({ showMemberList: !ui.showMemberList });
      } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        document.dispatchEvent(
          new CustomEvent('jolt:step-channel', { detail: event.key === 'ArrowUp' ? -1 : 1 }),
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

export const SHORTCUTS: { keys: string[]; description: string }[] = [
  { keys: ['Ctrl', 'K'], description: 'Jump to a server or channel' },
  { keys: ['F6'], description: 'Move focus to the next area' },
  { keys: ['Shift', 'F6'], description: 'Move focus to the previous area' },
  { keys: ['Alt', '↑ / ↓'], description: 'Previous or next channel' },
  { keys: ['Ctrl', 'Shift', 'M'], description: 'Show or hide the member list' },
  { keys: ['Ctrl', ','], description: 'Open settings' },
  { keys: ['Ctrl', '?'], description: 'Show keyboard shortcuts' },
  { keys: ['↑'], description: 'Edit your last message (empty composer)' },
  { keys: ['↑ / ↓'], description: 'Move between messages (message list)' },
  { keys: ['R'], description: 'Reply to the focused message' },
  { keys: ['E'], description: 'Edit the focused message' },
  { keys: ['Delete'], description: 'Delete the focused message' },
  { keys: ['Esc'], description: 'Cancel reply or edit, or return to the composer' },
  { keys: ['Shift', 'Enter'], description: 'New line in a message' },
];
