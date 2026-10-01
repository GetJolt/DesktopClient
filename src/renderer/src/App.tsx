import { useEffect } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell } from './components/layout/AppShell';
import { TitleBar } from './components/layout/TitleBar';
import { Spinner } from './components/ui/Button';
import { Logo } from './components/ui/Logo';
import { TooltipProvider } from './components/ui/Tooltip';
import { useApplyPreferences } from './hooks/useTheme';
import { announce } from './lib/announcer';
import { session } from './lib/client';
import { boot } from './store/actions';
import { useData } from './store/data';
import { openPostByUrl, openProfileByAddress } from './store/social';
import { useUi } from './store/ui';

// A link that arrived before sign-in finished, handled once the session is ready.
let pendingLink: string | null = null;

function openLink(url: string) {
  const rest = (prefix: string) => decodeURIComponent(url.slice(prefix.length).replace(/\/$/, ''));
  if (url.startsWith('jolt://invite/')) useUi.getState().openDialog({ type: 'addGuild', inviteLink: url });
  else if (url.startsWith('jolt://settings/linked'))
    useUi.getState().openDialog({ type: 'settings', tab: 'linked' });
  else if (url.startsWith('jolt://profile/')) void openProfileByAddress(rest('jolt://profile/'));
  else if (url.startsWith('jolt://post/')) {
    void openPostByUrl(rest('jolt://post/')).then(
      (ok) => ok || announce("Couldn't open that post.", 'assertive'),
    );
  }
}

function handleDeepLink(url: string) {
  if (session.state.status === 'signedIn') openLink(url);
  else pendingLink = url;
}

export function App() {
  useApplyPreferences();
  const status = useData((s) => s.status);

  useEffect(() => {
    void boot();
    void window.jolt.takePendingDeepLink().then((url) => url && handleDeepLink(url));
    return window.jolt.onDeepLink(handleDeepLink);
  }, []);

  useEffect(() => {
    if (status === 'signedIn' && pendingLink) {
      openLink(pendingLink);
      pendingLink = null;
    }
  }, [status]);

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        <TitleBar />
        <div className="min-h-0 flex-1">
          {status === 'booting' && (
            <div
              className="flex h-full flex-col items-center justify-center gap-5 bg-surface-1"
              role="status"
            >
              <Logo size={56} />
              <Spinner label="Loading Jolt" className="text-fg-subtle" />
            </div>
          )}
          {status === 'signedOut' && <AuthScreen />}
          {status === 'signedIn' && <AppShell />}
        </div>
      </div>
    </TooltipProvider>
  );
}
