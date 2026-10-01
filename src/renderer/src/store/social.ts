// Desktop glue for the social side: navigation after actions and spoken feedback. The data and network logic
// lives in the SDK's `session.social`.

import { errorMessage, feedKey, type FeedEntry, type SocialPost } from '@getjolt/sdk';
import { announce } from '@/lib/announcer';
import { session } from '@/lib/client';
import { useUi } from './ui';

export { feedKey };

const fail = (what: string) => (error: unknown) => announce(`${what}: ${errorMessage(error)}`, 'assertive');

export async function openProfileByAddress(address: string): Promise<void> {
  try {
    const profile = await session.social.lookup(address);
    useUi.getState().goHome({ view: 'profile', userId: profile.user.id });
  } catch (error) {
    fail(`Couldn't find ${address}`)(error);
  }
}

export async function openPostByUrl(url: string): Promise<boolean> {
  try {
    const post = await session.social.lookupPost(url);
    useUi.getState().goHome({ view: 'thread', postId: post.id });
    return true;
  } catch {
    return false;
  }
}

export const openThread = (postId: string) => useUi.getState().goHome({ view: 'thread', postId });
export const openProfile = (userId: string) => useUi.getState().goHome({ view: 'profile', userId });

export function toggleLike(post: SocialPost) {
  announce(post.viewer.liked ? 'Like removed' : 'Liked');
  session.social.toggleLike(post.id).catch(fail("Couldn't update your like"));
}

export function toggleRepost(post: SocialPost) {
  announce(post.viewer.reposted ? 'Repost removed' : 'Reposted');
  session.social.toggleRepost(post.id).catch(fail("Couldn't update your repost"));
}

export function setFollowing(userId: string, follow: boolean, name: string) {
  announce(follow ? `Following ${name}` : `Unfollowed ${name}`);
  session.social.setFollowing(userId, follow).catch(fail("Couldn't update who you follow"));
}

export async function deletePost(postId: string) {
  try {
    await session.social.deletePost(postId);
    announce('Post deleted');
    const { home, goBack } = useUi.getState();
    if (home.view === 'thread' && home.postId === postId) goBack();
  } catch (error) {
    fail("Couldn't delete the post")(error);
  }
}

export function loadFeed(key: string, direction: 'latest' | 'older' = 'latest') {
  session.social.loadFeed(key, direction).catch(fail("Couldn't load posts"));
}

export function showFresh(key: string) {
  const count = session.social.feed(key).fresh.length;
  session.social.showFresh(key);
  announce(`Showing ${count} new ${count === 1 ? 'post' : 'posts'}`);
}

export function copyPostLink(post: SocialPost) {
  if (!post.url) return;
  void navigator.clipboard.writeText(post.url);
  announce('Link copied');
}

export const entryKey = (entry: FeedEntry) => entry.id;
