import { CheckCircle2, Download, RotateCw, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { useAppVersion, useUpdateStatus } from '@/hooks/useUpdates';
import { formatTimestamp } from '@/lib/format';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function AboutTab() {
  const version = useAppVersion();
  const update = useUpdateStatus();
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      await window.jolt.updates.check();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="card flex items-center gap-4 p-5">
        <Logo size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold">Jolt</p>
          <p className="text-sm text-fg-muted">Version {version ?? '…'}</p>
        </div>
      </div>

      <section className="mt-6" aria-live="polite">
        <h3 className="eyebrow">Updates</h3>
        <div className="mt-3 flex items-center gap-4 rounded-[var(--radius-lg)] border border-line p-4">
          <UpdateLine status={update} />
          {update.state === 'ready' ? (
            <Button
              size="sm"
              icon={<RotateCw className="size-4" />}
              onClick={() => window.jolt.updates.install()}
            >
              Restart now
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              loading={checking || update.state === 'checking'}
              disabled={update.state === 'unsupported' || update.state === 'downloading'}
              onClick={check}
            >
              Check for updates
            </Button>
          )}
        </div>
        <p className="mt-2 text-[0.8125rem] text-fg-subtle">
          Jolt downloads updates in the background and installs them the next time it restarts.
        </p>
      </section>
    </div>
  );
}

function UpdateLine({ status }: { status: ReturnType<typeof useUpdateStatus> }) {
  const line = (icon: React.ReactNode, title: string, detail?: string) => (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        {detail && <p className="truncate text-[0.8125rem] text-fg-subtle">{detail}</p>}
      </div>
    </div>
  );

  switch (status.state) {
    case 'unsupported':
      return line(
        <CheckCircle2 className="size-5 text-fg-subtle" />,
        'Updates are managed outside the app',
        'Development builds don’t update themselves.',
      );
    case 'idle':
      return line(
        <CheckCircle2 className="size-5 text-online" />,
        'You’re up to date',
        status.checkedAt
          ? `Last checked ${formatTimestamp(status.checkedAt)}`
          : 'Checking shortly after launch.',
      );
    case 'checking':
      return line(<RotateCw className="size-5 animate-spin text-fg-subtle" />, 'Checking for updates…');
    case 'downloading':
      return line(
        <Download className="size-5 text-accent-text" />,
        `Downloading Jolt ${status.version}`,
        `${status.percent}% complete`,
      );
    case 'ready':
      return line(
        <CheckCircle2 className="size-5 text-accent-text" />,
        `Jolt ${status.version} is ready`,
        'Restart to finish updating.',
      );
    case 'error':
      return line(
        <TriangleAlert className="size-5 text-danger" />,
        'Couldn’t check for updates',
        status.message,
      );
  }
}
