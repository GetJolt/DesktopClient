import clsx from 'clsx';
import { Bell, Feather, Home, Search, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { useData, useSocial } from '@/store/data';
import { useUi, type HomeRoute } from '@/store/ui';
import { Button, Kbd } from '../ui/Button';

/** Navigation for the social side, in the column where a server's channels would be. */
export function FeedSidebar() {
  const route = useUi((s) => s.home);
  const goHome = useUi((s) => s.goHome);
  const unread = useSocial((s) => s.notifications.unread);
  const allLinks = useSocial((s) => s.linkedAccounts);
  const links = allLinks.filter((l) => l.showTimeline);
  const meId = useData((s) => (s.homeInstance ? s.me[s.homeInstance]?.id : undefined));

  const is = (r: HomeRoute) => JSON.stringify(route) === JSON.stringify(r);

  return (
    <nav aria-label="Home" data-region="channels" className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center border-b border-line px-4 font-semibold">Home</div>
      <ul className="flex flex-col gap-0.5 p-2">
        <NavItem
          icon={<Home />}
          label="Timeline"
          active={is({ view: 'timeline' })}
          onClick={() => goHome({ view: 'timeline' })}
        />
        <NavItem
          icon={<Bell />}
          label="Notifications"
          badge={unread}
          active={is({ view: 'notifications' })}
          onClick={() => goHome({ view: 'notifications' })}
        />
        {meId && (
          <NavItem
            icon={<UserRound />}
            label="Profile"
            active={is({ view: 'profile', userId: meId })}
            onClick={() => goHome({ view: 'profile', userId: meId })}
          />
        )}
        <NavItem
          icon={<Search />}
          label="Find people"
          active={is({ view: 'people' })}
          onClick={() => goHome({ view: 'people' })}
        />
      </ul>

      {links.length > 0 && (
        <>
          <p className="eyebrow px-4 pt-2 pb-1">Linked timelines</p>
          <ul className="flex flex-col gap-0.5 px-2 pb-2">
            {links.map((link) => (
              <NavItem
                key={link.id}
                icon={
                  <span className="text-[0.7rem] font-bold">{link.provider === 'bluesky' ? 'B' : 'M'}</span>
                }
                label={link.handle}
                active={is({ view: 'link', linkId: link.id })}
                onClick={() => goHome({ view: 'link', linkId: link.id })}
              />
            ))}
          </ul>
        </>
      )}

      <div className="px-3 pt-1">
        <Button
          className="w-full"
          icon={<Feather className="size-4" />}
          onClick={() => useUi.getState().openDialog({ type: 'compose' })}
        >
          New post
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-xs text-fg-subtle">
          <Kbd>Ctrl</Kbd>
          <Kbd>N</Kbd>
        </p>
      </div>

      <div className="mx-3 mt-auto mb-3 rounded-[var(--radius-lg)] border border-dashed border-line-strong p-3 text-center">
        <p className="text-sm font-medium text-fg-muted">Direct messages are on the way</p>
      </div>
    </nav>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'press flex h-10 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 text-[0.9375rem] font-medium transition-colors [&_svg]:size-[1.15rem]',
          active ? 'bg-active text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg',
        )}
      >
        <span className={active ? 'text-accent-text' : undefined} aria-hidden="true">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {badge ? (
          <span className="min-w-5 rounded-full bg-danger-fill px-1.5 text-center text-xs leading-5 font-bold text-on-danger">
            {badge > 99 ? '99+' : badge}
            <span className="sr-only"> unread</span>
          </span>
        ) : null}
      </button>
    </li>
  );
}
