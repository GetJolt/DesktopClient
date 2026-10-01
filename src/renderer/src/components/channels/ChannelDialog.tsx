import { Permission, type Overwrite } from '@jolt/protocol';
import clsx from 'clsx';
import { Check, Minus, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { unscope, type ScopedKey } from '@/lib/keys';
import { errorMessage, rest } from '@/store/actions';
import { useData } from '@/store/data';
import { useUi } from '@/store/ui';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { Field, Input, Textarea } from '../ui/Field';

interface Props {
  guildKey: ScopedKey;
  channelId?: string;
  parentId?: string | null;
  kind?: 'text' | 'category';
  onOpenChange: (open: boolean) => void;
}

const CHANNEL_PERMISSIONS = [
  { bit: Permission.VIEW_CHANNEL, label: 'View channel' },
  { bit: Permission.SEND_MESSAGES, label: 'Send messages' },
  { bit: Permission.READ_MESSAGE_HISTORY, label: 'Read message history' },
  { bit: Permission.MANAGE_MESSAGES, label: 'Manage messages' },
  { bit: Permission.MENTION_EVERYONE, label: 'Mention @everyone' },
] as const;

type Tri = 'allow' | 'inherit' | 'deny';

export function ChannelDialog({ guildKey, channelId, parentId, kind, onOpenChange }: Props) {
  const guild = useData((s) => s.guilds[guildKey]);
  const existing = channelId ? guild?.channels[channelId] : undefined;
  const type = existing?.type ?? kind ?? 'text';
  const [name, setName] = useState(existing?.name ?? '');
  const [topic, setTopic] = useState(existing?.topic ?? '');
  const [overwrites, setOverwrites] = useState<Overwrite[]>(existing?.overwrites ?? []);
  const [privateChannel, setPrivateChannel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useUi((s) => s.closeDialog);
  const openChannel = useUi((s) => s.openChannel);
  if (!guild) return null;

  const { instance } = unscope(guildKey);
  const everyoneId = guild.guild.id;
  const roles = Object.values(guild.roles).sort((a, b) => b.position - a.position);

  const stateFor = (roleId: string, bit: bigint): Tri => {
    const o = overwrites.find((x) => x.id === roleId && x.type === 'role');
    if (!o) return 'inherit';
    if (BigInt(o.allow) & bit) return 'allow';
    if (BigInt(o.deny) & bit) return 'deny';
    return 'inherit';
  };

  const setState = (roleId: string, bit: bigint, value: Tri) => {
    setOverwrites((list) => {
      const current = list.find((x) => x.id === roleId && x.type === 'role') ?? {
        id: roleId,
        type: 'role' as const,
        allow: '0',
        deny: '0',
      };
      let allow = BigInt(current.allow) & ~bit;
      let deny = BigInt(current.deny) & ~bit;
      if (value === 'allow') allow |= bit;
      if (value === 'deny') deny |= bit;
      const others = list.filter((x) => !(x.id === roleId && x.type === 'role'));
      return allow === 0n && deny === 0n
        ? others
        : [...others, { ...current, allow: allow.toString(), deny: deny.toString() }];
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (existing) {
        await rest(instance).updateChannel(existing.id, {
          name,
          topic: type === 'text' ? topic : undefined,
          overwrites,
        });
      } else {
        const created = await rest(instance).createChannel(guild.guild.id, {
          name,
          type,
          topic: topic || undefined,
          parentId: parentId ?? null,
        });
        if (privateChannel) {
          await rest(instance).updateChannel(created.id, {
            overwrites: [
              { id: everyoneId, type: 'role', allow: '0', deny: Permission.VIEW_CHANNEL.toString() },
            ],
          });
        }
        if (created.type === 'text') openChannel(guildKey, created.id);
      }
      close();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const noun = type === 'category' ? 'category' : 'channel';

  return (
    <Dialog
      open
      onOpenChange={onOpenChange}
      size={existing ? 'lg' : 'md'}
      title={existing ? `Edit ${noun}` : `Create ${noun}`}
      description={!existing && parentId ? `In ${guild.channels[parentId]?.name ?? 'category'}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="channel-form" loading={busy} disabled={!name.trim()}>
            {existing ? 'Save changes' : `Create ${noun}`}
          </Button>
        </>
      }
    >
      <form id="channel-form" onSubmit={submit} className="flex flex-col gap-5">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Field
          label={`${noun} name`}
          hint={type === 'text' ? 'Lowercase, with dashes instead of spaces.' : undefined}
        >
          {(props) => (
            <Input
              {...props}
              value={name}
              onChange={(e) =>
                setName(type === 'text' ? e.target.value.toLowerCase().replace(/\s+/g, '-') : e.target.value)
              }
              autoFocus
              maxLength={100}
              placeholder={type === 'text' ? 'new-channel' : 'New category'}
            />
          )}
        </Field>
        {type === 'text' && (
          <Field label="Topic" hint="Shown in the channel header.">
            {(props) => (
              <Textarea
                {...props}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={1024}
              />
            )}
          </Field>
        )}
        {!existing && (
          <label className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line p-3">
            <input
              type="checkbox"
              checked={privateChannel}
              onChange={(e) => setPrivateChannel(e.target.checked)}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span>
              <span className="block font-medium">Private {noun}</span>
              <span className="block text-sm text-fg-subtle">
                Only roles you allow afterwards can see it.
              </span>
            </span>
          </label>
        )}
        {existing && (
          <section>
            <h3 className="eyebrow">Permissions</h3>
            <p className="mt-1 text-sm text-fg-subtle">
              Override server-wide role permissions for this {noun}.
            </p>
            <div className="mt-3 space-y-4">
              {roles.map((role) => (
                <fieldset key={role.id} className="rounded-[var(--radius-md)] border border-line p-3">
                  <legend className="px-1 text-sm font-semibold">
                    {role.id === everyoneId ? '@everyone' : role.name}
                  </legend>
                  <div className="divide-y divide-line">
                    {CHANNEL_PERMISSIONS.map(({ bit, label }) => (
                      <TriToggle
                        key={label}
                        label={label}
                        value={stateFor(role.id, bit)}
                        onChange={(v) => setState(role.id, bit, v)}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>
        )}
      </form>
    </Dialog>
  );
}

function TriToggle({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  const options: { v: Tri; icon: React.ReactNode; text: string; active: string }[] = [
    { v: 'deny', icon: <X className="size-4" />, text: 'Deny', active: 'bg-danger-fill text-on-danger' },
    { v: 'inherit', icon: <Minus className="size-4" />, text: 'Inherit', active: 'bg-raised-strong text-fg' },
    { v: 'allow', icon: <Check className="size-4" />, text: 'Allow', active: 'bg-online text-canvas' },
  ];
  return (
    <div className="flex items-center justify-between py-2" role="radiogroup" aria-label={label}>
      <span className="text-sm">{label}</span>
      <div className="flex overflow-hidden rounded-md border border-line">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={value === o.v}
            aria-label={o.text}
            title={o.text}
            onClick={() => onChange(o.v)}
            className={clsx(
              'flex h-7 w-9 items-center justify-center transition-colors',
              value === o.v ? o.active : 'text-fg-subtle hover:bg-hover',
            )}
          >
            {o.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
