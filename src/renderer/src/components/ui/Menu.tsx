import * as ContextMenu from '@radix-ui/react-context-menu';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import clsx from 'clsx';
import { Check, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

const contentClass =
  'animate-pop z-50 min-w-60 rounded-[var(--radius-lg)] border border-line bg-elevated p-1 shadow-pop';
const itemClass =
  'group/item relative flex h-8 cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-[0.8125rem] font-medium text-fg outline-none select-none data-[highlighted]:bg-active data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[state=open]:bg-active';
const iconClass =
  'flex size-4 shrink-0 items-center justify-center text-fg-subtle group-data-[highlighted]/item:text-fg [&_svg]:size-4';
const dangerClass =
  'text-danger data-[highlighted]:bg-danger-fill data-[highlighted]:text-on-danger [&>span:first-child]:text-danger data-[highlighted]:[&>span:first-child]:text-on-danger';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  hint?: string;
}

export interface MenuCheckbox {
  type: 'checkbox';
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Small colour dot, e.g. for roles. */
  swatch?: string;
}

export interface MenuSubmenu {
  type: 'submenu';
  label: string;
  icon?: ReactNode;
  items: MenuEntry[];
  disabled?: boolean;
}

export interface MenuLabel {
  type: 'label';
  label: string;
}

export type MenuEntry =
  MenuItem | MenuCheckbox | MenuSubmenu | MenuLabel | 'separator' | null | undefined | false | '';

type Visible = Exclude<MenuEntry, null | undefined | false | ''>;

/** Drops falsy entries plus separators that would end up doubled or dangling. */
function visibleEntries(items: MenuEntry[]): Visible[] {
  const list = items.filter((i): i is Visible => Boolean(i));
  return list.filter((item, i) => {
    if (item !== 'separator') return true;
    return i > 0 && i < list.length - 1 && list[i - 1] !== 'separator';
  });
}

// Dropdown and context menus share their component shapes, so one renderer serves both.
type Parts = typeof DropdownMenu | typeof ContextMenu;

function Entries({ parts: P, items }: { parts: Parts; items: MenuEntry[] }) {
  return (
    <>
      {visibleEntries(items).map((item, i) => {
        if (item === 'separator') return <P.Separator key={`sep-${i}`} className="mx-1 my-1 h-px bg-line" />;

        if ('type' in item && item.type === 'label') {
          return (
            <P.Label key={`label-${item.label}`} className="eyebrow px-2 pt-2 pb-1">
              {item.label}
            </P.Label>
          );
        }

        if ('type' in item && item.type === 'checkbox') {
          return (
            <P.CheckboxItem
              key={item.label}
              className={itemClass}
              checked={item.checked}
              onCheckedChange={(checked) => item.onCheckedChange(checked === true)}
              onSelect={(e) => e.preventDefault()}
              disabled={item.disabled}
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-line-strong group-data-[state=checked]/item:border-transparent group-data-[state=checked]/item:bg-accent">
                <P.ItemIndicator>
                  <Check className="size-3 text-on-accent" strokeWidth={3} aria-hidden="true" />
                </P.ItemIndicator>
              </span>
              {item.swatch && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: item.swatch }}
                  aria-hidden="true"
                />
              )}
              <span className="flex-1 truncate">{item.label}</span>
            </P.CheckboxItem>
          );
        }

        if ('type' in item && item.type === 'submenu') {
          return (
            <P.Sub key={item.label}>
              <P.SubTrigger className={itemClass} disabled={item.disabled}>
                <span className={iconClass} aria-hidden="true">
                  {item.icon}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                <ChevronRight className="size-4 text-fg-subtle" aria-hidden="true" />
              </P.SubTrigger>
              <P.Portal>
                <P.SubContent
                  className={clsx(contentClass, 'max-h-80 overflow-y-auto')}
                  sideOffset={4}
                  alignOffset={-5}
                >
                  <Entries parts={P} items={item.items} />
                </P.SubContent>
              </P.Portal>
            </P.Sub>
          );
        }

        const action = item as MenuItem;
        return (
          <P.Item
            key={action.label}
            className={clsx(itemClass, action.danger && dangerClass)}
            onSelect={action.onSelect}
            disabled={action.disabled}
          >
            <span className={iconClass} aria-hidden="true">
              {action.icon}
            </span>
            <span className="flex-1 truncate">{action.label}</span>
            {action.hint && <span className="text-xs text-fg-subtle">{action.hint}</span>}
          </P.Item>
        );
      })}
    </>
  );
}

export function Dropdown({
  trigger,
  items,
  align = 'start',
  side = 'bottom',
}: {
  trigger: ReactNode;
  items: MenuEntry[];
  align?: 'start' | 'end' | 'center';
  side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={contentClass}
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={8}
        >
          <Entries parts={DropdownMenu} items={items} />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function ContextMenuArea({
  children,
  items,
  wrap = false,
}: {
  children: ReactNode;
  items: MenuEntry[];
  /** Wrap in a `display: contents` span instead of cloning the child, for children that can't take a ref. */
  wrap?: boolean;
}) {
  if (visibleEntries(items).length === 0) return <>{children}</>;
  return (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger asChild>
        {wrap ? <span className="contents">{children}</span> : children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className={contentClass} collisionPadding={8}>
          <Entries parts={ContextMenu} items={items} />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
