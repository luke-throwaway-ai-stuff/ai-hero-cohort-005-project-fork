/**
 * PROTOTYPE — URL-backed prototype state, so every state is shareable.
 *
 * variant: a | b | c
 * count:   3 | 0 | 12 | unknown | auto   (drives the bell only; auto = live unseen)
 * feed:    items | allread | empty | error
 * open:    1 | 0                   (popover / sheet)
 */

import { useEffect } from "react";
import { useSearchParams } from "react-router";

export type Variant = "a" | "b" | "c";
export type CountState = "3" | "0" | "12" | "unknown" | "auto";
export type FeedState = "items" | "allread" | "empty" | "error";

export interface PrototypeParams {
  variant: Variant;
  count: CountState;
  feed: FeedState;
  open: boolean;
  setParams: (patch: Partial<Omit<PrototypeParams, "setParams">>) => void;
}

const VARIANTS: Variant[] = ["a", "b", "c"];
const COUNTS: CountState[] = ["3", "0", "12", "unknown", "auto"];
const FEEDS: FeedState[] = ["items", "allread", "empty", "error"];
const STORAGE_KEY = "cadence-notification-prototype";

export function usePrototypeParams(): PrototypeParams {
  const [searchParams, setSearchParams] = useSearchParams();

  // App navigation drops the search string, so the prototype's variant and
  // simulated states are remembered per tab and restored when it does.
  useEffect(() => {
    if (
      searchParams.has("variant") ||
      searchParams.has("count") ||
      searchParams.has("feed")
    ) {
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const restored = new URLSearchParams(saved);
    restored.set("open", "0");
    setSearchParams(restored, { replace: true, preventScrollReset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawVariant = (searchParams.get("variant") ?? "a").toLowerCase();
  const rawCount = searchParams.get("count") ?? "3";
  const rawFeed = searchParams.get("feed") ?? "items";

  const variant = (VARIANTS as string[]).includes(rawVariant)
    ? (rawVariant as Variant)
    : "a";
  const count = (COUNTS as string[]).includes(rawCount)
    ? (rawCount as CountState)
    : "3";
  const feed = (FEEDS as string[]).includes(rawFeed)
    ? (rawFeed as FeedState)
    : "items";

  function setParams(patch: Partial<Omit<PrototypeParams, "setParams">>) {
    const next = new URLSearchParams(searchParams);
    if (patch.variant !== undefined) next.set("variant", patch.variant);
    if (patch.count !== undefined) next.set("count", patch.count);
    if (patch.feed !== undefined) next.set("feed", patch.feed);
    if (patch.open !== undefined) next.set("open", patch.open ? "1" : "0");
    const saved = new URLSearchParams({
      variant: next.get("variant") ?? "a",
      count: next.get("count") ?? "3",
      feed: next.get("feed") ?? "items",
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, saved.toString());
    } catch {}
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }

  return {
    variant,
    count,
    feed,
    open: searchParams.get("open") === "1",
    setParams,
  };
}

export function nextVariant(variant: Variant, direction: 1 | -1): Variant {
  const index = VARIANTS.indexOf(variant);
  return VARIANTS[(index + direction + VARIANTS.length) % VARIANTS.length];
}

/** The page link keeps the current variant/count/feed state and closes the panel. */
export function pageHref(params: {
  variant: Variant;
  count: CountState;
  feed: FeedState;
}): string {
  const search = new URLSearchParams({
    variant: params.variant,
    count: params.count,
    feed: params.feed,
    open: "0",
  });
  return `/prototype/notifications?${search.toString()}`;
}

/**
 * The count the bell is allowed to render, or `null` when it is unknown and the
 * bell must disappear. Mirrors the settled rule; the prototype only varies the
 * treatment of a known count.
 */
export function resolveCount(
  override: CountState,
  unseen: number
): number | null {
  if (override === "unknown") return null;
  if (override === "auto") return unseen;
  return Number(override);
}
