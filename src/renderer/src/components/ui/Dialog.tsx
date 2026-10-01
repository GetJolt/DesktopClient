import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as RadixDialog from '@radix-ui/react-dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Button } from './Button';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideTitle?: boolean;
}

const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' };

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideTitle,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="animate-fade fixed inset-0 z-40 bg-overlay backdrop-blur-[3px]" />
        <RadixDialog.Content
          className={clsx(
            'animate-pop fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-panel shadow-modal',
            widths[size],
          )}
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <div className={clsx('flex items-start gap-4 px-6 pt-6', hideTitle && 'sr-only')}>
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="text-lg font-semibold text-fg">{title}</RadixDialog.Title>
              {description && (
                <RadixDialog.Description className="mt-1.5 text-[0.9375rem] text-fg-muted">
                  {description}
                </RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              className="press -mt-1 -mr-2 rounded-[var(--radius-sm)] p-1.5 text-fg-subtle hover:bg-hover hover:text-fg"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden="true" />
            </RadixDialog.Close>
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex justify-end gap-2 border-t border-line bg-sunken/60 px-6 py-3.5">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

interface ConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  danger,
  onConfirm,
}: ConfirmProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="animate-fade fixed inset-0 z-40 bg-overlay backdrop-blur-[3px]" />
        <AlertDialog.Content className="animate-pop fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-xl)] border border-line bg-panel shadow-modal">
          <div className="px-6 py-6">
            <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div className="mt-2 text-[0.9375rem] text-fg-muted">{description}</div>
            </AlertDialog.Description>
            {error && (
              <p role="alert" className="mt-3 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-line bg-sunken/60 px-6 py-3.5">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost">Cancel</Button>
            </AlertDialog.Cancel>
            <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={confirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
