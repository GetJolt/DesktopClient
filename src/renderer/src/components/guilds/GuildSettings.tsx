import {
  ALL_PERMISSIONS,
  outranks,
  Permission,
  PERMISSION_INFO,
  type Ban,
  type Invite,
  type Member,
  type PermissionName,
  type Role,
} from '@getjolt/protocol';
import { permissionContext } from '@getjolt/sdk';
import clsx from 'clsx';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { usePermissions } from '@/hooks/useGuild';
import { announce } from '@/lib/announcer';
import { address, displayName, formatTimestamp, roleColor } from '@/lib/format';
import type { ScopedKey } from '@/lib/keys';
import { deleteGuild, errorMessage, inviteLink, rest } from '@/store/actions';
import { useData, type GuildState } from '@/store/data';
import { Avatar } from '../ui/Avatar';
import { Button, Spinner } from '../ui/Button';
import { ConfirmDialog } from '../ui/Dialog';
import { Field, Input, SwitchRow, Textarea } from '../ui/Field';
import { Dropdown } from '../ui/Menu';
import { SettingsLayout, SettingsSection } from '../settings/SettingsLayout';

export function GuildSettings({
  guildKey,
  onOpenChange,
}: {
  guildKey: ScopedKey;
  onOpenChange: (open: boolean) => void;
}) {
  const guild = useData((s) => s.guilds[guildKey]);
  const perms = usePermissions(guild ?? null);
  const [tab, setTab] = useState('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!guild) onOpenChange(false);
  }, [guild, onOpenChange]);
  if (!guild) return null;

  return (
    <>
      <SettingsLayout
        title={`${guild.guild.name} settings`}
        heading={guild.guild.name}
        tab={tab}
        onTabChange={(t) => (t === 'delete' ? setConfirmDelete(true) : setTab(t))}
        onOpenChange={onOpenChange}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: <OverviewTab guild={guild} canEdit={perms.can(Permission.MANAGE_GUILD)} />,
          },
          perms.can(Permission.MANAGE_ROLES) && {
            id: 'roles',
            label: 'Roles',
            content: <RolesTab guild={guild} />,
          },
          { id: 'members', label: 'Members', content: <MembersTab guild={guild} /> },
          perms.can(Permission.MANAGE_GUILD) && {
            id: 'invites',
            label: 'Invites',
            content: <InvitesTab guild={guild} />,
          },
          perms.can(Permission.BAN_MEMBERS) && {
            id: 'bans',
            label: 'Bans',
            content: <BansTab guild={guild} />,
          },
          perms.isOwner && { id: 'delete', label: 'Delete server', danger: true, content: null },
        ]}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${guild.guild.name}?`}
        description="This permanently deletes the server, its channels and every message. It can't be undone."
        confirmLabel="Delete server"
        danger
        onConfirm={() => deleteGuild(guild.key)}
      />
    </>
  );
}

function OverviewTab({ guild, canEdit }: { guild: GuildState; canEdit: boolean }) {
  const [name, setName] = useState(guild.guild.name);
  const [description, setDescription] = useState(guild.guild.description);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = name !== guild.guild.name || description !== guild.guild.description;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      await rest(guild.instance).updateGuild(guild.guild.id, { name: name.trim(), description });
      setStatus({ ok: true, text: 'Saved.' });
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="flex max-w-xl flex-col gap-5">
      <Field label="Server name">
        {(props) => (
          <Input
            {...props}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            maxLength={100}
          />
        )}
      </Field>
      <Field label="Description" hint="Shown on invites.">
        {(props) => (
          <Textarea
            {...props}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!canEdit}
            maxLength={500}
          />
        )}
      </Field>
      <p className="text-sm text-fg-subtle">
        Hosted on <strong className="text-fg-muted">{guild.instance}</strong> · Created{' '}
        {formatTimestamp(guild.guild.createdAt)}
      </p>
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={busy} disabled={!dirty || name.trim().length < 2}>
            Save changes
          </Button>
          {status && (
            <p role="status" className={status.ok ? 'text-sm text-online' : 'text-sm text-danger'}>
              {status.text}
            </p>
          )}
        </div>
      )}
    </form>
  );
}

const ROLE_COLORS = [
  null,
  0xc8f04b,
  0x3fcf8e,
  0x38bdf8,
  0x818cf8,
  0xe879f9,
  0xf472b6,
  0xf87171,
  0xfb923c,
  0xfacc15,
];

function RolesTab({ guild }: { guild: GuildState }) {
  const roles = useMemo(
    () => Object.values(guild.roles).sort((a, b) => b.position - a.position),
    [guild.roles],
  );
  const [selectedId, setSelectedId] = useState<string>(
    roles.find((r) => r.id !== guild.guild.id)?.id ?? guild.guild.id,
  );
  const [creating, setCreating] = useState(false);
  const selected = guild.roles[selectedId] ?? guild.roles[guild.guild.id];

  const create = async () => {
    setCreating(true);
    try {
      const role = await rest(guild.instance).createRole(guild.guild.id, { name: 'new role' });
      setSelectedId(role.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex gap-6">
      <div className="w-52 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          className="mb-3 w-full"
          icon={<Plus className="size-4" />}
          loading={creating}
          onClick={create}
        >
          Create role
        </Button>
        <ul className="space-y-0.5" aria-label="Roles">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                type="button"
                aria-current={role.id === selectedId ? 'true' : undefined}
                onClick={() => setSelectedId(role.id)}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium',
                  role.id === selectedId ? 'bg-active text-fg' : 'text-fg-muted hover:bg-hover',
                )}
              >
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: roleColor(role.color) ?? 'var(--fg-subtle)' }}
                  aria-hidden="true"
                />
                <span className="truncate">{role.id === guild.guild.id ? '@everyone' : role.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selected && <RoleEditor key={selected.id} guild={guild} role={selected} />}
    </div>
  );
}

function RoleEditor({ guild, role }: { guild: GuildState; role: Role }) {
  const isEveryone = role.id === guild.guild.id;
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [hoist, setHoist] = useState(role.hoist);
  const [mentionable, setMentionable] = useState(role.mentionable);
  const [permissions, setPermissions] = useState(BigInt(role.permissions));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty =
    name !== role.name ||
    color !== role.color ||
    hoist !== role.hoist ||
    mentionable !== role.mentionable ||
    permissions !== BigInt(role.permissions);

  const reset = () => {
    setName(role.name);
    setColor(role.color);
    setHoist(role.hoist);
    setMentionable(role.mentionable);
    setPermissions(BigInt(role.permissions));
    setError(null);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await rest(guild.instance).updateRole(guild.guild.id, role.id, {
        ...(isEveryone ? {} : { name, color, hoist, mentionable }),
        permissions: (permissions & ALL_PERMISSIONS).toString(),
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-6 flex items-center gap-3">
        <span
          className="size-3.5 shrink-0 rounded-full"
          style={{ background: roleColor(color) ?? 'var(--fg-subtle)' }}
          aria-hidden="true"
        />
        <h3 className="min-w-0 flex-1 truncate text-lg font-semibold">
          {isEveryone ? '@everyone' : name || 'Untitled role'}
        </h3>
        {!isEveryone && (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger!"
            icon={<Trash2 className="size-4" />}
            onClick={() => setConfirmDelete(true)}
          >
            Delete role
          </Button>
        )}
      </div>
      {!isEveryone && (
        <SettingsSection title="Display">
          <div className="flex flex-col gap-4">
            <Field label="Role name">
              {(props) => (
                <Input {...props} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              )}
            </Field>
            <fieldset>
              <legend className="mb-2 eyebrow">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {ROLE_COLORS.map((c) => (
                  <button
                    key={String(c)}
                    type="button"
                    aria-label={c === null ? 'No colour' : `#${c.toString(16)}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className={clsx(
                      'size-8 rounded-md border-2',
                      color === c ? 'border-fg' : 'border-transparent',
                    )}
                    style={{ background: c === null ? 'var(--raised-strong)' : roleColor(c) }}
                  />
                ))}
              </div>
            </fieldset>
            <div className="divide-y divide-line">
              <SwitchRow
                label="Show members separately"
                description="Members with this role get their own section in the member list."
                checked={hoist}
                onCheckedChange={setHoist}
              />
              <SwitchRow
                label="Allow anyone to @mention this role"
                checked={mentionable}
                onCheckedChange={setMentionable}
              />
            </div>
          </div>
        </SettingsSection>
      )}
      <SettingsSection
        title="Permissions"
        description={isEveryone ? 'These apply to every member of the server.' : undefined}
      >
        <div className="divide-y divide-line">
          {(Object.keys(PERMISSION_INFO) as PermissionName[]).map((key) => (
            <SwitchRow
              key={key}
              label={PERMISSION_INFO[key].label}
              description={PERMISSION_INFO[key].description}
              checked={(permissions & Permission[key]) !== 0n}
              onCheckedChange={(on) =>
                setPermissions((p) => (on ? p | Permission[key] : p & ~Permission[key]))
              }
            />
          ))}
        </div>
      </SettingsSection>
      {(dirty || error) && (
        <div className="sticky -bottom-8 z-10 -mx-3 pt-2 pb-6">
          <div className="animate-rise flex items-center gap-3 rounded-[var(--radius-lg)] border border-line-strong bg-elevated py-2.5 pr-2.5 pl-4 shadow-modal">
            <p
              className={clsx('flex-1 text-sm font-medium', error ? 'text-danger' : 'text-fg')}
              role={error ? 'alert' : undefined}
            >
              {error ?? 'You have unsaved changes'}
            </p>
            <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
              Reset
            </Button>
            <Button size="sm" loading={busy} onClick={save}>
              Save changes
            </Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${role.name}?`}
        description="Members with this role lose it. This can't be undone."
        confirmLabel="Delete role"
        danger
        onConfirm={() => rest(guild.instance).deleteRole(guild.guild.id, role.id)}
      />
    </div>
  );
}

function MembersTab({ guild }: { guild: GuildState }) {
  const me = useData((s) => s.me[guild.instance]);
  const perms = usePermissions(guild);
  const [query, setQuery] = useState('');
  const [action, setAction] = useState<{ type: 'kick' | 'ban'; member: Member } | null>(null);
  const actor = permissionContext(guild, me?.id);
  const roles = Object.values(guild.roles)
    .filter((r) => r.id !== guild.guild.id)
    .sort((a, b) => b.position - a.position);

  const members = Object.values(guild.members)
    .filter((m) =>
      [m.user.handle, m.user.displayName, m.nickname ?? '', m.user.instance].some((s) =>
        s.toLowerCase().includes(query.toLowerCase()),
      ),
    )
    .sort((a, b) => displayName(a.user, a).localeCompare(displayName(b.user, b)));

  const canActOn = (m: Member) =>
    Boolean(
      actor &&
      outranks(
        actor,
        { userId: actor.userId, roleIds: actor.memberRoleIds },
        { userId: m.user.id, roleIds: m.roleIds },
      ),
    );

  const toggleRole = (m: Member, roleId: string) => {
    const roleIds = m.roleIds.includes(roleId)
      ? m.roleIds.filter((r) => r !== roleId)
      : [...m.roleIds, roleId];
    void rest(guild.instance)
      .updateMember(guild.guild.id, m.user.id, { roleIds })
      .catch((e) => announce(errorMessage(e), 'assertive'));
  };

  return (
    <div className="max-w-3xl">
      <div className="relative mb-4">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members"
          aria-label="Search members"
          className="pl-9"
        />
      </div>
      <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line">
        {members.map((m) => {
          const name = displayName(m.user, m);
          const manageable = canActOn(m) || m.user.id === me?.id;
          return (
            <li key={m.user.id} className="flex items-center gap-3 p-3">
              <Avatar name={name} seed={m.user.id} url={m.user.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{name}</p>
                <p className="truncate text-xs text-fg-subtle">{address(m.user)}</p>
                {m.roleIds.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {m.roleIds
                      .map((id) => guild.roles[id])
                      .filter(Boolean)
                      .map((r) => (
                        <li
                          key={r!.id}
                          className="flex items-center gap-1 rounded bg-raised px-1.5 py-0.5 text-xs"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ background: roleColor(r!.color) ?? 'var(--fg-subtle)' }}
                            aria-hidden="true"
                          />
                          {r!.name}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
              {perms.can(Permission.MANAGE_ROLES) && roles.length > 0 && manageable && (
                <Dropdown
                  align="end"
                  trigger={
                    <Button variant="secondary" size="sm">
                      Roles
                    </Button>
                  }
                  items={roles.map((r) => ({
                    label: r.name,
                    hint: m.roleIds.includes(r.id) ? 'Assigned' : undefined,
                    onSelect: () => toggleRole(m, r.id),
                  }))}
                />
              )}
              {m.user.id !== me?.id &&
                canActOn(m) &&
                (perms.can(Permission.KICK_MEMBERS) || perms.can(Permission.BAN_MEMBERS)) && (
                  <Dropdown
                    align="end"
                    trigger={
                      <Button variant="ghost" size="sm" aria-label={`Moderate ${name}`}>
                        Moderate
                      </Button>
                    }
                    items={[
                      perms.can(Permission.KICK_MEMBERS) && {
                        label: `Kick ${name}`,
                        danger: true,
                        onSelect: () => setAction({ type: 'kick', member: m }),
                      },
                      perms.can(Permission.BAN_MEMBERS) && {
                        label: `Ban ${name}`,
                        danger: true,
                        onSelect: () => setAction({ type: 'ban', member: m }),
                      },
                    ]}
                  />
                )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        title={
          action
            ? `${action.type === 'kick' ? 'Kick' : 'Ban'} ${displayName(action.member.user, action.member)}?`
            : ''
        }
        description={
          action?.type === 'ban'
            ? "They'll be removed and can't rejoin until unbanned."
            : 'They can rejoin with a new invite.'
        }
        confirmLabel={action?.type === 'ban' ? 'Ban' : 'Kick'}
        danger
        onConfirm={async () => {
          if (!action) return;
          const api = rest(guild.instance);
          if (action.type === 'kick') await api.kickMember(guild.guild.id, action.member.user.id);
          else await api.ban(guild.guild.id, action.member.user.id);
        }}
      />
    </div>
  );
}

function InvitesTab({ guild }: { guild: GuildState }) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    rest(guild.instance)
      .invites(guild.guild.id)
      .then(setInvites)
      .catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error)
    return (
      <p role="alert" className="text-danger">
        {error}
      </p>
    );
  if (!invites) return <Spinner label="Loading invites" />;
  if (invites.length === 0)
    return <p className="text-fg-muted">No active invites. Create one from the channel header.</p>;

  return (
    <ul className="max-w-3xl divide-y divide-line rounded-[var(--radius-lg)] border border-line">
      {invites.map((invite) => (
        <li key={invite.code} className="flex items-center gap-4 p-3">
          <div className="min-w-0 flex-1">
            <p data-selectable className="truncate font-mono text-sm">
              {inviteLink(invite.instance, invite.code)}
            </p>
            <p className="text-xs text-fg-subtle">
              #{guild.channels[invite.channelId]?.name ?? 'deleted'} · {invite.uses}
              {invite.maxUses ? `/${invite.maxUses}` : ''} uses ·{' '}
              {invite.expiresAt ? `expires ${formatTimestamp(invite.expiresAt)}` : 'never expires'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger!"
            onClick={() => void rest(guild.instance).deleteInvite(invite.code).then(load)}
          >
            Revoke
          </Button>
        </li>
      ))}
    </ul>
  );
}

function BansTab({ guild }: { guild: GuildState }) {
  const [bans, setBans] = useState<Ban[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = () =>
    rest(guild.instance)
      .bans(guild.guild.id)
      .then(setBans)
      .catch((e) => setError(errorMessage(e)));
  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error)
    return (
      <p role="alert" className="text-danger">
        {error}
      </p>
    );
  if (!bans) return <Spinner label="Loading bans" />;
  if (bans.length === 0) return <p className="text-fg-muted">Nobody is banned.</p>;

  return (
    <ul className="max-w-3xl divide-y divide-line rounded-[var(--radius-lg)] border border-line">
      {bans.map((ban) => (
        <li key={ban.user.id} className="flex items-center gap-3 p-3">
          <Avatar name={ban.user.displayName} seed={ban.user.id} url={ban.user.avatarUrl} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{address(ban.user)}</p>
            <p className="truncate text-xs text-fg-subtle">
              {ban.reason || 'No reason given'} · {formatTimestamp(ban.createdAt)}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void rest(guild.instance).unban(guild.guild.id, ban.user.id).then(load)}
          >
            Unban
          </Button>
        </li>
      ))}
    </ul>
  );
}
