import { useCallback, type KeyboardEvent } from 'react';

/**
 * Arrow-key navigation for a list with a single tab stop. Items mark themselves with
 * `data-roving-item`; the active one gets tabIndex 0 and the rest -1.
 */
export function useRovingFocus(orientation: 'vertical' | 'horizontal' = 'vertical') {
  return useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
      const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
      if (![next, prev, 'Home', 'End'].includes(event.key)) return;

      const items = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>('[data-roving-item]'),
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
      if (items.length === 0) return;
      const index = items.indexOf(document.activeElement as HTMLElement);

      let target: HTMLElement | undefined;
      if (event.key === 'Home') target = items[0];
      else if (event.key === 'End') target = items[items.length - 1];
      else if (event.key === next) target = items[Math.min(items.length - 1, index + 1)];
      else target = items[Math.max(0, index - 1)];

      if (target) {
        event.preventDefault();
        items.forEach((el) => (el.tabIndex = el === target ? 0 : -1));
        target.focus();
      }
    },
    [orientation],
  );
}
