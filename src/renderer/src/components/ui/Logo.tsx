/** Just the bolt, in the current text colour. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M18.2 4.5 8.6 18h6.1l-1.6 9.5L23.4 13.6h-6.3l1.1-9.1Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M18.2 4.5 8.6 18h6.1l-1.6 9.5L23.4 13.6h-6.3l1.1-9.1Z" fill="var(--on-accent)" />
    </svg>
  );
}
