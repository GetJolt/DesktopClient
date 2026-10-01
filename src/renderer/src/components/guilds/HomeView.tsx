import { ArrowRight, Compass, Keyboard, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { client } from '@/lib/client';
import { useData } from '@/store/data';
import { useUi } from '@/store/ui';
import { Kbd } from '../ui/Button';
import { Logo } from '../ui/Logo';

export function HomeView() {
  const openDialog = useUi((s) => s.openDialog);
  const hasGuilds = useData((s) => s.guildOrder.length > 0);
  const me = useData((s) => (client.homeDomain ? s.me[client.homeDomain] : undefined));

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-y-auto p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
        style={{ background: 'radial-gradient(ellipse, var(--accent), transparent 70%)' }}
      />
      <div className="animate-rise relative w-full max-w-xl text-center">
        <Logo size={56} className="mx-auto drop-shadow-[0_8px_24px_var(--accent-glow)]" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          {me ? `Hey, ${me.displayName}` : 'Welcome to Jolt'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-fg-muted">
          {hasGuilds
            ? 'Pick a server on the left, or start something new.'
            : 'Servers are where your communities live. Create one, or join one from any Jolt instance.'}
        </p>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
          <ActionCard
            icon={<Plus className="size-5" />}
            title="Create a server"
            body="A space for your friends, team or community."
            onClick={() => openDialog({ type: 'addGuild' })}
          />
          <ActionCard
            icon={<Compass className="size-5" />}
            title="Join with an invite"
            body="Paste a link from any Jolt instance."
            onClick={() => openDialog({ type: 'addGuild', inviteLink: '' })}
          />
        </div>

        <p className="mt-8 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm text-fg-subtle">
          <Keyboard className="mr-0.5 size-4" aria-hidden="true" />
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd> to jump anywhere
          <span aria-hidden="true" className="mx-1">
            ·
          </span>
          <Kbd>Ctrl</Kbd>
          <Kbd>?</Kbd> for all shortcuts
        </p>
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  body,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card press group flex items-start gap-3.5 p-4 text-left transition-[border-color,box-shadow,transform] duration-200 hover:border-line-strong hover:shadow-pop"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent-text transition-colors duration-200 group-hover:bg-accent group-hover:text-on-accent"
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-semibold">
          {title}
          <ArrowRight
            className="size-4 -translate-x-1 text-fg-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        </span>
        <span className="mt-0.5 block text-sm text-fg-muted">{body}</span>
      </span>
    </button>
  );
}
