import clsx from 'clsx';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Tooltip } from './Tooltip';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.25)] hover:bg-accent-hover hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_4px_14px_-4px_var(--accent-glow)] disabled:bg-raised-strong disabled:text-fg-subtle disabled:shadow-none disabled:opacity-100',
  secondary: 'bg-raised-strong text-fg border border-line shadow-highlight hover:border-line-strong',
  ghost: 'text-fg-muted hover:bg-hover hover:text-fg',
  danger:
    'bg-danger-fill text-on-danger font-semibold shadow-[inset_0_1px_0_rgb(255_255_255/0.18)] hover:brightness-110',
  link: 'text-accent-text hover:underline px-0! h-auto!',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-10 px-4 text-sm gap-2 rounded-[var(--radius-md)]',
  lg: 'h-11 px-5 text-[0.9375rem] gap-2 rounded-[var(--radius-md)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading,
    icon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'press inline-flex shrink-0 items-center justify-center font-medium disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  active?: boolean;
  size?: 'sm' | 'md';
}

/** Icon-only button. The label doubles as accessible name and tooltip, so it can't be forgotten. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tooltipSide = 'bottom', active, size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <Tooltip content={label} side={tooltipSide}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={clsx(
          'press no-drag inline-flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] disabled:opacity-40',
          size === 'md' ? 'size-8' : 'size-7',
          active ? 'bg-active text-fg' : 'text-fg-muted hover:bg-hover hover:text-fg',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    </Tooltip>
  );
});

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className={clsx('inline-flex', className)}>
      <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded-[5px] border border-line-strong border-b-2 bg-raised px-1.5 py-px font-sans text-[0.6875rem] font-semibold text-fg-muted">
      {children}
    </kbd>
  );
}
