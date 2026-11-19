/**
 * PROTOTYPE — in-memory stand-in for Knock's feed client.
 *
 * One store per tab, keyed by feed. Read state and seen state live here only;
 * a reload resets everything. No fetch, no socket, no persistence.
 */

import { useSyncExternalStore } from "react";
import { mockFeed, type FeedKey, type PrototypeNotification } from "./data";

const feeds = new Map<FeedKey, PrototypeNotification[]>();
const listeners = new Set<() => void>();

function getFeed(key: FeedKey): PrototypeNotification[] {
  let feed = feeds.get(key);
  if (!feed) {
    feed = mockFeed(key);
    feeds.set(key, feed);
  }
  return feed;
}

function setFeed(key: FeedKey, next: PrototypeNotification[]) {
  feeds.set(key, next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFeed(key: FeedKey | null): PrototypeNotification[] {
  return useSyncExternalStore(
    subscribe,
    () => (key ? getFeed(key) : EMPTY),
    () => (key ? getFeed(key) : EMPTY)
  );
}

const EMPTY: PrototypeNotification[] = [];

/** The popover and the page both mark everything seen when they open. */
export function markAllSeen(key: FeedKey) {
  const feed = getFeed(key);
  if (feed.every((item) => item.seen)) return;
  setFeed(
    key,
    feed.map((item) => ({ ...item, seen: true }))
  );
}

export function markAllRead(key: FeedKey) {
  const feed = getFeed(key);
  setFeed(
    key,
    feed.map((item) => ({ ...item, read: true, seen: true }))
  );
}

/** Best-effort read-on-click: optimistic, no rollback, no persistence. */
export function markRead(key: FeedKey, id: string) {
  setFeed(
    key,
    getFeed(key).map((item) =>
      item.id === id ? { ...item, read: true, seen: true } : item
    )
  );
}

/** What a full page reload would do. */
export function resetFeed(key: FeedKey) {
  feeds.delete(key);
  listeners.forEach((listener) => listener());
}
