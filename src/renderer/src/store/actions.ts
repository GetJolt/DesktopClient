// Desktop glue around the SDK session: navigation after actions, notifications and screen reader
// announcements. Data and network logic lives in @getjolt/sdk.

import type { Message, PresenceStatus } from '@getjolt/protocol';
import { errorMessage, sortedTextChannels, type ChatMessage, type ParsedInvite } from '@getjolt/sdk';
import { announce } from '@/lib/announcer';
import { session } from '@/lib/client';
import { displayName } from '@/lib/format';
import { scoped, type ScopedKey } from '@/lib/keys';
import { useUi } from './ui';

export { errorMessage, inviteLink, sortedTextChannels } from '@getjolt/sdk';

let wired = false;

function wire() {
  if (wired) return;
  wired = true;
  session.on('message', ({ instance, message, mentionsMe }) =>
    onIncomingMessage(instance, message, mentionsMe),
  );
  session.on('error', ({ instance, error }) => console.warn(`[${instance ?? 'jolt'}]`, error));
}

export async function boot(): Promise<void> {
  wire();
  try {
    if (await session.restore()) session.setPresence(useUi.getState().status);
  } catch (error) {
    console.error(error);
  }
}

export async function signIn(
  mode: 'login' | 'register',
  instance: string,
  handle: string,
  password: string,
  extra: { displayName?: string; inviteCode?: string } = {},
) {
  wire();
  useUi.setState({ guildKey: null, channelByGuild: {} });
  if (mode === 'login') await session.login(instance, handle, password);
  else await session.register(instance, { handle, password, ...extra });
  session.setPresence(useUi.getState().status);
}

export const signOut = () => session.signOut();

export const rest = (instance: string) => session.rest(instance);

export const loadMessages = (channelKey: ScopedKey, direction: 'latest' | 'older' = 'latest') =>
  session.loadMessages(channelKey, direction);

export async function sendMessage(channelKey: ScopedKey, content: string, replyTo?: Message | null) {
  try {
    await session.sendMessage(channelKey, content, replyTo);
  } catch (error) {
    announce(`Message failed to send: ${errorMessage(error)}`, 'assertive');
  }
}

export async function retryMessage(channelKey: ScopedKey, message: ChatMessage) {
  try {
    await session.retryMessage(channelKey, message);
  } catch (error) {
    announce(`Message failed to send: ${errorMessage(error)}`, 'assertive');
  }
}

export const discardMessage = (channelKey: ScopedKey, message: ChatMessage) =>
  session.discardMessage(channelKey, message);
export const editMessage = (channelKey: ScopedKey, id: string, content: string) =>
  session.editMessage(channelKey, id, content);
export const deleteMessage = (channelKey: ScopedKey, id: string) => session.deleteMessage(channelKey, id);
export const notifyTyping = (channelKey: ScopedKey) => session.notifyTyping(channelKey);
export const markRead = (channelKey: ScopedKey, messageId: string | null) =>
  session.markRead(channelKey, messageId);
export const markGuildRead = (guildKey: ScopedKey) => session.markGuildRead(guildKey);
export const saveGuildOrder = (order: ScopedKey[]) => session.saveGuildOrder(order);
export const parseInvite = (input: string) => session.parseInvite(input);
export const previewInvite = (invite: ParsedInvite) => session.previewInvite(invite);

export async function createGuild(name: string) {
  openFirstChannel(await session.createGuild(name));
}

export async function joinInvite(invite: ParsedInvite) {
  openFirstChannel(await session.joinInvite(invite));
}

export async function leaveGuild(guildKey: ScopedKey) {
  await session.leaveGuild(guildKey);
  if (useUi.getState().guildKey === guildKey) useUi.getState().openGuild(null);
}

export async function deleteGuild(guildKey: ScopedKey) {
  await session.deleteGuild(guildKey);
  if (useUi.getState().guildKey === guildKey) useUi.getState().openGuild(null);
}

export function openFirstChannel(guildKey: ScopedKey) {
  const guild = session.state.guilds[guildKey];
  const first = guild ? sortedTextChannels(guild.channels)[0] : undefined;
  if (first) useUi.getState().openChannel(guildKey, first.id);
  else useUi.getState().openGuild(guildKey);
}

export function setStatus(status: PresenceStatus) {
  useUi.getState().set({ status });
  session.setPresence(status);
}

function onIncomingMessage(instance: string, message: Message, mentionsMe: boolean) {
  const ui = useUi.getState();
  const guildKey = scoped(instance, message.guildId);
  const viewing =
    ui.guildKey === guildKey && ui.channelByGuild[guildKey] === message.channelId && document.hasFocus();
  const guild = session.state.guilds[guildKey];
  const author = displayName(message.author, guild?.members[message.author.id]);

  if (viewing && ui.announceMessages) announce(`${author}: ${message.content.slice(0, 280)}`);

  if (mentionsMe && !viewing && ui.status !== 'dnd' && 'Notification' in window) {
    const channel = guild?.channels[message.channelId];
    const notification = new Notification(`${author} in #${channel?.name ?? 'channel'}`, {
      body: message.content.slice(0, 200),
      tag: scoped(instance, message.channelId),
    });
    notification.onclick = () => {
      window.focus();
      useUi.getState().openChannel(guildKey, message.channelId);
    };
  }
}
