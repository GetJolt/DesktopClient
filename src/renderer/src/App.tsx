import { useEffect } from 'react';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell } from './components/layout/AppShell';
import { TitleBar } from './components/layout/TitleBar';
import { Spinner } from './components/ui/Button';
import { Logo } from './components/ui/Logo';
import { TooltipProvider } from './components/ui/Tooltip';
import { useApplyPreferences } from './hooks/useTheme';
import { session } from './lib/client';
import { boot } from './store/actions';
import { useData } from './store/data';
import { useUi } from './store/ui';

let pendingInvite: string | null = null;

function handleDeepLink(url: string) {
  if (!url.startsWith('jolt://invite/')) return;
  if (session.state.status === 'signedIn') {
    useUi.getState().openDialog({ type: 'addGuild', inviteLink: url });
  } else {
    pendingInvite = url;
  }
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
    if (status === 'signedIn' && pendingInvite) {
      useUi.getState().openDialog({ type: 'addGuild', inviteLink: pendingInvite });
      pendingInvite = null;
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
