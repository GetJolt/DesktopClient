import * as RadixTooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <RadixTooltip.Provider delayDuration={350} skipDelayDuration={150}>
    {children}
  </RadixTooltip.Provider>
);

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="animate-fade z-50 max-w-xs rounded-[var(--radius-sm)] border border-line bg-elevated px-2.5 py-1.5 text-[0.8125rem] font-medium text-fg shadow-pop"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
