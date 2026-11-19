/**
 * PROTOTYPE — the bell in the real sidebar chrome.
 *
 * Three slots, one per variant. Which one appears is the thing being judged:
 *   header (A, far right), wordmark (C, immediately after "Cadence"),
 *   user row (B, next to settings), or nowhere when the count is unknown.
 */

import { Bell } from "lucide-react";
import { NavLink } from "react-router";
import type { UserRole } from "~/db/schema";
import { cn } from "~/lib/utils";
import { useFeed } from "./store";
import { feedKeyFor } from "./data";
import { usePrototypeParams, type PrototypeParams } from "./params";
import { BellA } from "./variant-a";
import { BellB } from "./variant-b";
import { BellC } from "./variant-c";

function useBellState(role: UserRole | null, isTeamAdmin: boolean) {
  const params = usePrototypeParams();
  const feedKey = feedKeyFor(role, isTeamAdmin);
  const items = useFeed(feedKey);
  // Auto mimics Knock: an empty or fully-read feed counts zero; a failed fetch
  // keeps the last known count.
  const unseen =
    params.feed === "empty" || params.feed === "allread"
      ? 0
      : items.filter((item) => !item.seen).length;
  return { params, feedKey, unseen };
}

interface SlotProps {
  role: UserRole | null;
  isTeamAdmin: boolean;
}

export function PrototypeWordmarkBell({ role, isTeamAdmin }: SlotProps) {
  const { params, feedKey, unseen } = useBellState(role, isTeamAdmin);
  if (!feedKey || params.variant !== "c") return null;
  return <BellC feedKey={feedKey} unseen={unseen} params={params} />;
}

export function PrototypeHeaderBell({ role, isTeamAdmin }: SlotProps) {
  const { params, feedKey, unseen } = useBellState(role, isTeamAdmin);
  if (!feedKey || params.variant !== "a") return null;
  return <BellA feedKey={feedKey} unseen={unseen} params={params} />;
}

export function PrototypeUserBell({ role, isTeamAdmin }: SlotProps) {
  const { params, feedKey, unseen } = useBellState(role, isTeamAdmin);
  if (!feedKey || params.variant !== "b") return null;
  return <BellB feedKey={feedKey} unseen={unseen} params={params} />;
}

/** Settled: the sidebar always carries a Notifications item, all four roles. */
export function PrototypeNotificationsNavItem({ role }: { role: UserRole | null }) {
  const params: PrototypeParams = usePrototypeParams();

  const search = new URLSearchParams({
    variant: params.variant,
    count: params.count,
    feed: params.feed,
    open: "0",
  });

  return (
    <NavLink
      to={`/notifications?${search.toString()}`}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Bell className="size-4" />
      Notifications
    </NavLink>
  );
}
