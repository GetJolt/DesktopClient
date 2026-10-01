import * as RadixDialog from '@radix-ui/react-dialog';
import { sortedTextChannels } from '@getjolt/sdk';
import clsx from 'clsx';
import { Hash, Search } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { canSeeChannel } from '@/hooks/useGuild';
import { initials } from '@/lib/format';
import { scoped } from '@/lib/keys';
import { isUnread, useData } from '@/store/data';
import { useUi } from '@/store/ui';
import { Kbd } from '../ui/Button';

interface Result {
  key: string;
  kind: 'channel' | 'guild';
  label: string;
  context: string;
  unread: boolean;
  go: () => void;
}

function score(label: string, query: string): number {
  const l = label.toLowerCase();
  if (l === query) return 0;
  if (l.startsWith(query)) return 1;
  if (l.includes(query)) return 2;
  let i = 0;
  for (const char of l) if (char === query[i]) i++;
  return i === query.length ? 3 : Infinity;
}

export function QuickSwitcher({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const guilds = useData((s) => s.guilds);
  const order = useData((s) => s.guildOrder);
  const readStates = useData((s) => s.readStates);
  const me = useData((s) => s.me);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const all = useMemo<Result[]>(() => {
    const ui = useUi.getState();
    const results: Result[] = [];
    for (const key of order) {
      const guild = guilds[key];
      if (!guild) continue;
      results.push({
        key,
        kind: 'guild',
        label: guild.guild.name,
        context: guild.instance,
        unread: false,
        go: () => ui.openGuild(key),
      });
      for (const channel of sortedTextChannels(guild.channels)) {
        if (!canSeeChannel(guild, channel, me[guild.instance]?.id)) continue;
        results.push({
          key: `${key}:${channel.id}`,
          kind: 'channel',
          label: channel.name,
          context: guild.guild.name,
          unread: isUnread(channel, readStates[scoped(guild.instance, channel.id)]),
          go: () => ui.openChannel(key, channel.id),
        });
      }
    }
    return results;
  }, [guilds, order, readStates, me]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, '');
    if (!q)
      return all
        .filter((r) => r.unread)
        .concat(all.filter((r) => !r.unread && r.kind === 'guild'))
        .slice(0, 12);
    return all
      .map((r) => ({ r, s: score(r.label, q) }))
      .filter((x) => x.s !== Infinity)
      .sort((a, b) => a.s - b.s || Number(b.r.unread) - Number(a.r.unread))
      .slice(0, 12)
      .map((x) => x.r);
  }, [all, query]);

  const choose = (result: Result | undefined) => {
    if (!result) return;
    result.go();
    onOpenChange(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      setSelected((s) => (s + delta + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[selected]);
    }
  };

  return (
    <RadixDialog.Root open onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="animate-fade fixed inset-0 z-40 bg-overlay backdrop-blur-[3px]" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="animate-pop fixed top-[18vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-line bg-panel shadow-modal"
        >
          <RadixDialog.Title className="sr-only">Jump to a server or channel</RadixDialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-5 text-fg-subtle" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Where would you like to go?"
              role="combobox"
              aria-expanded
              aria-controls="switcher-results"
              aria-activedescendant={results[selected] ? `switcher-${selected}` : undefined}
              aria-autocomplete="list"
              className="h-14 flex-1 bg-transparent text-lg placeholder:text-fg-subtle focus-visible:outline-none"
            />
          </div>
          <ul
            id="switcher-results"
            role="listbox"
            aria-label="Results"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-fg-subtle">Nothing matches “{query}”.</li>
            )}
            {!query && results.length > 0 && (
              <li className="px-3 pt-1 pb-2 eyebrow" role="presentation">
                Unread and servers
              </li>
            )}
            {results.map((r, i) => (
              <li
                key={r.key}
                id={`switcher-${i}`}
                role="option"
                aria-selected={i === selected}
                onMouseEnter={() => setSelected(i)}
                onClick={() => choose(r)}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] px-3 py-2',
                  i === selected && 'bg-active',
                )}
              >
                {r.kind === 'channel' ? (
                  <Hash className="size-5 shrink-0 text-fg-subtle" aria-hidden="true" />
                ) : (
                  <span
                    className="flex size-6 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-raised-strong text-[0.625rem] font-semibold"
                    aria-hidden="true"
                  >
                    {initials(r.label, 3)}
                  </span>
                )}
                <span className={clsx('truncate', r.unread ? 'font-semibold text-fg' : 'text-fg-muted')}>
                  {r.label}
                </span>
                {r.unread && <span className="sr-only">, unread</span>}
                <span className="ml-auto truncate text-xs text-fg-subtle">{r.context}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-4 border-t border-line bg-sunken px-4 py-2 text-xs text-fg-subtle">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate
            </span>
            <span>
              <Kbd>Enter</Kbd> to open
            </span>
            <span>
              <Kbd>Esc</Kbd> to close
            </span>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
