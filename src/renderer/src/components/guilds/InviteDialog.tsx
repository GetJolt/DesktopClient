import type { Invite } from '@getjolt/protocol';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { announce } from '@/lib/announcer';
import { unscope, type ScopedKey } from '@/lib/keys';
import { errorMessage, inviteLink, rest } from '@/store/actions';
import { useData } from '@/store/data';
import { Button, Spinner } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

const EXPIRY_OPTIONS = [
  { label: '30 minutes', seconds: 1800 },
  { label: '1 day', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
  { label: 'Never', seconds: null },
];

export function InviteDialog({
  guildKey,
  channelId,
  onOpenChange,
}: {
  guildKey: ScopedKey;
  channelId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const guild = useData((s) => s.guilds[guildKey]);
  const [expiry, setExpiry] = useState<number | null>(604800);
  const [result, setResult] = useState<{ expiry: number | null; invite?: Invite; error?: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const { instance } = unscope(guildKey);
  const current = result?.expiry === expiry ? result : null;
  const invite = current?.invite ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let cancelled = false;
    rest(instance)
      .createInvite(channelId, { maxAgeSeconds: expiry })
      .then((i) => !cancelled && setResult({ expiry, invite: i }))
      .catch((e) => !cancelled && setResult({ expiry, error: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [instance, channelId, expiry]);

  const link = invite ? inviteLink(invite.instance, invite.code) : '';

  const copy = () => {
    void navigator.clipboard.writeText(link);
    setCopied(true);
    announce('Invite link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      title={`Invite people to ${guild?.guild.name ?? 'this server'}`}
      description="Anyone on any Jolt instance can join with this link."
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-canvas p-1.5 pl-3">
          <span
            data-selectable
            className="min-w-0 flex-1 truncate font-mono text-sm"
            aria-label="Invite link"
          >
            {error ? (
              <span className="text-danger">{error}</span>
            ) : (
              link || <Spinner label="Creating invite" />
            )}
          </span>
          <Button
            size="sm"
            onClick={copy}
            disabled={!invite}
            icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          >
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
        <fieldset>
          <legend className="mb-2 eyebrow">Link expires after</legend>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((option) => (
              <label key={option.label} className="cursor-pointer">
                <input
                  type="radio"
                  name="expiry"
                  className="peer sr-only"
                  checked={expiry === option.seconds}
                  onChange={() => setExpiry(option.seconds)}
                />
                <span className="block rounded-[var(--radius-md)] border border-line px-3 py-1.5 text-sm font-medium text-fg-muted peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:text-fg peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus)]">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
