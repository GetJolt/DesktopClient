import { useEffect, useState } from 'react';
import { useUi } from '@/store/ui';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Applies appearance and accessibility preferences to the document root. */
export function useApplyPreferences() {
  const { theme, fontScale, reducedMotion, underlineLinks, density } = useUi();
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const systemContrast = useMediaQuery('(prefers-contrast: more)');
  const systemReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const resolvedTheme =
    theme === 'system' ? (systemContrast ? 'contrast' : systemDark ? 'dark' : 'light') : theme;
  const reduce = reducedMotion === 'system' ? systemReducedMotion : reducedMotion === 'on';

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.reducedMotion = String(reduce);
    root.dataset.underlineLinks = String(underlineLinks);
    root.dataset.density = density;
    root.style.setProperty('--font-scale', String(fontScale));

    const styles = getComputedStyle(root);
    window.jolt.setTitleBarTheme({
      color: styles.getPropertyValue('--surface-0').trim(),
      symbolColor: styles.getPropertyValue('--fg-muted').trim(),
    });
  }, [resolvedTheme, reduce, underlineLinks, density, fontScale]);
}
