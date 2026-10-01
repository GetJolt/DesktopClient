import * as RadixSwitch from '@radix-ui/react-switch';
import clsx from 'clsx';
import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  className?: string;
}

/** Wires a label, hint and error message to its control so screen readers read them together. */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-fg-muted">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-sm text-fg-subtle">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'w-full rounded-[var(--radius-md)] border border-line bg-sunken px-3 text-[0.9375rem] text-fg shadow-[inset_0_1px_2px_rgb(0_0_0/0.06)] transition-[border-color,box-shadow] duration-150 hover:border-line-strong focus-visible:border-[var(--focus)] focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--focus)_22%,transparent)] focus-visible:outline-none aria-[invalid=true]:border-danger disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={clsx(inputClass, 'h-10', className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea ref={ref} className={clsx(inputClass, 'min-h-20 resize-y py-2', className)} {...props} />
    );
  },
);

interface SwitchRowProps {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function SwitchRow({ label, description, checked, onCheckedChange, disabled }: SwitchRowProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium text-fg">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="mt-0.5 text-sm text-fg-subtle">
            {description}
          </p>
        )}
      </div>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full border border-line-strong bg-raised-strong transition-colors duration-200 data-[state=checked]:border-transparent data-[state=checked]:bg-accent disabled:opacity-50"
      >
        <RadixSwitch.Thumb className="block size-[1.125rem] translate-x-[2px] rounded-full bg-fg-muted shadow-sm transition-[transform,background-color] duration-200 ease-[var(--ease-out)] data-[state=checked]:translate-x-[1.125rem] data-[state=checked]:bg-on-accent" />
      </RadixSwitch.Root>
    </div>
  );
}
