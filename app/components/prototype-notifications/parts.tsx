/**
 * PROTOTYPE — shared bits. Anything that decides layout lives in a variant.
 */

import type { ReactNode } from "react";
import {
  BadgeCheck,
  BookOpen,
  BellOff,
  CornerDownRight,
  MessageSquare,
  Receipt,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import { UserAvatar } from "~/components/user-avatar";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { markRead, useFeed } from "./store";
import type {
  FeedKey,
  PrototypeNotification,
  PrototypeNotificationType,
} from "./data";
import type { FeedState } from "./params";
import { cn } from "~/lib/utils";

export function typeLabel(type: PrototypeNotificationType): string {
  switch (type) {
    case "refund-requested":
      return "Refund request";
    case "refund-decided":
      return "Refund";
    case "seat-claimed":
      return "Seat claimed";
    case "lesson-question":
      return "Question";
    case "comment-reply":
      return "Reply";
    case "course-availability-changed":
      return "Course status";
  }
}

export function TypeIcon({
  type,
  className,
}: {
  type: PrototypeNotificationType;
  className?: string;
}) {
  const Icon =
    type === "refund-requested"
      ? Receipt
      : type === "refund-decided"
        ? BadgeCheck
        : type === "seat-claimed"
          ? Ticket
          : type === "lesson-question"
            ? MessageSquare
            : type === "comment-reply"
              ? CornerDownRight
              : BookOpen;
  return <Icon className={cn("size-3.5", className)} />;
}

export function ActorAvatar({
  item,
  className,
}: {
  item: PrototypeNotification;
  className?: string;
}) {
  return (
    <UserAvatar
      name={item.actorName || "Cadence"}
      avatarUrl={item.actorAvatarUrl}
      className={className}
    />
  );
}

/** Bold the actor the way the copy carries them. */
export function Body({ item }: { item: PrototypeNotification }) {
  const name = item.actorName;
  if (!name || !item.body.includes(name)) return <>{item.body}</>;
  const [before, ...rest] = item.body.split(name);
  return (
    <>
      {before}
      <span className="font-semibold text-foreground">{name}</span>
      {rest.join(name)}
    </>
  );
}

export function timeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return "Just now";
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}m`;
  if (minutesAgo < 1440) return `${Math.round(minutesAgo / 60)}h`;
  if (minutesAgo < 2880) return "Yesterday";
  return `${Math.round(minutesAgo / 1440)}d`;
}

export type Bucket = "Today" | "Yesterday" | "Earlier";

export function bucketOf(minutesAgo: number): Bucket {
  if (minutesAgo < 1440) return "Today";
  if (minutesAgo < 2880) return "Yesterday";
  return "Earlier";
}

export function groupByBucket(items: PrototypeNotification[]) {
  const groups: { bucket: Bucket; items: PrototypeNotification[] }[] = [];
  for (const item of items) {
    const bucket = bucketOf(item.minutesAgo);
    const last = groups[groups.length - 1];
    if (last && last.bucket === bucket) last.items.push(item);
    else groups.push({ bucket, items: [item] });
  }
  return groups;
}

export function countLabel(count: number): string {
  return count > 9 ? "9+" : String(count);
}

/**
 * The feed as the chosen state should render it. `allread` is a view of the
 * same items with every read/seen flag on; `empty` is a brand-new account.
 */
export function useDisplayedFeed(
  feedKey: FeedKey,
  feedState: FeedState
): PrototypeNotification[] {
  const items = useFeed(feedKey);
  if (feedState === "allread") {
    return items.map((item) => ({ ...item, read: true, seen: true }));
  }
  if (feedState === "empty") return EMPTY_DISPLAY;
  return items;
}

const EMPTY_DISPLAY: PrototypeNotification[] = [];

/**
 * The one click behaviour every variant shares: mark read optimistically, then
 * (in the real client) navigate without waiting for the write. The prototype
 * shows the destination instead of leaving the fake feed.
 */
export function useNotificationClick(feedKey: FeedKey | null) {
  return (item: PrototypeNotification, onDone?: () => void) => {
    if (feedKey) markRead(feedKey, item.id);
    toast(item.linkLabel, {
      description: (
        <span className="font-mono text-xs">{item.link}</span>
      ),
    });
    onDone?.();
  };
}

export function FeedPlaceholder({
  kind,
  onRetry,
  compact = false,
  children,
}: {
  kind: "empty" | "error";
  onRetry?: () => void;
  compact?: boolean;
  children?: ReactNode;
}) {
  const isError = kind === "error";
  const Icon = isError ? TriangleAlert : BellOff;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-1.5 px-6 py-8" : "gap-2 px-6 py-20"
      )}
    >
      <Icon
        className={cn(
          "text-muted-foreground",
          compact ? "size-5" : "size-7"
        )}
      />
      <p className={cn("font-medium", compact ? "text-sm" : "text-base")}>
        {isError ? "Couldn't load notifications" : "No notifications yet"}
      </p>
      <p
        className={cn(
          "max-w-xs text-muted-foreground",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {isError
          ? "Check your connection and try again."
          : "When something happens in your courses, it'll show up here."}
      </p>
      {isError && onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}
