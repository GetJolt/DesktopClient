import { Fragment } from 'react';
import { SHORTCUTS } from '@/hooks/useHotkeys';
import { Kbd } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

export function ShortcutsDialog({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const isMac = window.jolt.platform === 'darwin';
  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Everything in Jolt works without a mouse."
      size="lg"
    >
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2.5">
        {SHORTCUTS.map(({ keys, description }) => (
          <Fragment key={description}>
            <dt className="text-fg-muted">{description}</dt>
            <dd className="flex items-center justify-end gap-1">
              {keys.map((key) => (
                <Kbd key={key}>{isMac && key === 'Ctrl' ? '⌘' : key}</Kbd>
              ))}
            </dd>
          </Fragment>
        ))}
      </dl>
    </Dialog>
  );
}
