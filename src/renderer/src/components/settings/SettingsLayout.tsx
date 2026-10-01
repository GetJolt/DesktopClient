import * as RadixDialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface SettingsTabDef {
  id: string;
  label: string;
  danger?: boolean;
  content: ReactNode;
}

interface Props {
  title: string;
  heading: string;
  tabs: (SettingsTabDef | false | null)[];
  tab: string;
  onTabChange: (tab: string) => void;
  onOpenChange: (open: boolean) => void;
  footer?: ReactNode;
}

export function SettingsLayout({ title, heading, tabs, tab, onTabChange, onOpenChange, footer }: Props) {
  const visible = tabs.filter((t): t is SettingsTabDef => Boolean(t));
  return (
    <RadixDialog.Root open onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="animate-fade fixed inset-0 z-40 bg-overlay backdrop-blur-[3px]" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="animate-pop fixed inset-6 z-50 mx-auto flex max-w-5xl overflow-hidden rounded-[var(--radius-xl)] border border-line bg-panel shadow-modal"
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <Tabs.Root
            value={tab}
            onValueChange={onTabChange}
            orientation="vertical"
            className="flex min-w-0 flex-1"
          >
            <div className="flex w-60 shrink-0 flex-col border-r border-line bg-sunken px-3 py-6">
              <p className="eyebrow truncate px-2.5 pb-2">{heading}</p>
              <Tabs.List aria-label={title} className="flex flex-col gap-0.5">
                {visible.map((t) => (
                  <Tabs.Trigger
                    key={t.id}
                    value={t.id}
                    className={
                      t.danger
                        ? 'rounded-md px-2.5 py-1.5 text-left font-medium text-danger hover:bg-hover data-[state=active]:bg-active'
                        : 'rounded-md px-2.5 py-1.5 text-left font-medium text-fg-muted hover:bg-hover hover:text-fg data-[state=active]:bg-active data-[state=active]:text-fg'
                    }
                  >
                    {t.label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              {footer && <div className="mt-auto pt-4">{footer}</div>}
            </div>
            {visible.map((t) => (
              <Tabs.Content
                key={t.id}
                value={t.id}
                className="scroll-thin min-w-0 flex-1 overflow-y-auto px-10 py-8 focus-visible:outline-offset-[-4px]"
              >
                <h2 className="mb-6 text-xl font-semibold tracking-tight">{t.label}</h2>
                {t.content}
              </Tabs.Content>
            ))}
          </Tabs.Root>
          <RadixDialog.Close
            aria-label="Close settings"
            className="press absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-line-strong text-fg-muted hover:bg-hover hover:text-fg"
          >
            <X className="size-5" aria-hidden="true" />
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 border-b border-line pb-8 last:border-0">
      <h3 className="eyebrow">{title}</h3>
      {description && <p className="mt-1 text-sm text-fg-subtle">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function RadioCards<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 4,
}: {
  name: string;
  value: T;
  options: { value: T; label: string; preview?: ReactNode; description?: string }[];
  onChange: (value: T) => void;
  columns?: 2 | 4;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={columns === 2 ? 'grid max-w-xl grid-cols-2 gap-3' : 'grid grid-cols-2 gap-3 sm:grid-cols-4'}
    >
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span className="block overflow-hidden rounded-[var(--radius-lg)] border-2 border-line bg-raised transition-colors peer-checked:border-accent peer-checked:shadow-[0_0_0_4px_var(--accent-soft)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] hover:border-line-strong">
            {o.preview}
            <span className="block px-3 py-2">
              <span className="block text-sm font-semibold">{o.label}</span>
              {o.description && <span className="block text-xs text-fg-subtle">{o.description}</span>}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}
