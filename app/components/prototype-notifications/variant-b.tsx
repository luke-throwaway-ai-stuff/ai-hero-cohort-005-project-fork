/**
 * PROTOTYPE — Variant B: "card popover".
 *
 * Bell tucked into the sidebar's user row (bottom), count as a numeric badge.
 * Opening floats a rounded card above it. The page is a centred, airy column of
 * bordered cards with sticky day headers; type is shown as an icon on the
 * avatar rather than a label.
 */

import { useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, Bell, CheckCheck, X } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { markAllRead, markAllSeen } from "./store";
import type { FeedKey, PrototypeNotification } from "./data";
import { pageHref, resolveCount, type PrototypeParams } from "./params";
import {
  ActorAvatar,
  Body,
  FeedPlaceholder,
  TypeIcon,
  countLabel,
  groupByBucket,
  timeAgo,
  useDisplayedFeed,
  useNotificationClick,
} from "./parts";
import type { BellProps } from "./variant-a";

export function BellB({ feedKey, unseen, params }: BellProps) {
  const count = resolveCount(params.count, unseen);
  if (count === null) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications${count > 0 ? `, ${count} new` : ""}`}
        onClick={() => {
          if (params.open) {
            params.setParams({ open: false });
          } else {
            markAllSeen(feedKey);
            params.setParams({ open: true });
          }
        }}
        className={cn(
          "relative rounded-md p-1 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          params.open && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-sidebar">
            {countLabel(count)}
          </span>
        )}
      </button>
      {params.open && <PopoverB feedKey={feedKey} params={params} />}
    </div>
  );
}

function PopoverB({
  feedKey,
  params,
}: {
  feedKey: FeedKey;
  params: PrototypeParams;
}) {
  const items = useDisplayedFeed(feedKey, params.feed);
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") params.setParams({ open: false });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [params]);

  return (
    <>
      <button
        type="button"
        aria-label="Close notifications"
        onClick={() => params.setParams({ open: false })}
        className="fixed inset-0 z-40 cursor-default"
      />
      <div className="absolute bottom-full left-0 z-50 mb-3 flex max-h-[70vh] w-[min(400px,calc(100vw-2rem))] flex-col rounded-xl border bg-popover text-popover-foreground shadow-xl">
        <span
          aria-hidden
          className="absolute -bottom-1.5 left-6 size-3 rotate-45 border-b border-r bg-popover"
        />
        <div className="flex items-start justify-between gap-2 px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => markAllRead(feedKey)}
              title="Mark all as read"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <CheckCheck className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => params.setParams({ open: false })}
              title="Close"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {params.feed === "error" ? (
            <FeedPlaceholder
              kind="error"
              compact
              onRetry={() => params.setParams({ feed: "items" })}
            />
          ) : items.length === 0 ? (
            <FeedPlaceholder kind="empty" compact />
          ) : (
            <div className="divide-y">
              {items.slice(0, 4).map((item) => (
                <PopoverRowB
                  key={item.id}
                  item={item}
                  feedKey={feedKey}
                  onDone={() => params.setParams({ open: false })}
                />
              ))}
            </div>
          )}
        </div>

        <Link
          to={pageHref(params)}
          className="flex items-center justify-between border-t px-4 py-2.5 text-sm font-medium text-primary hover:bg-accent/50"
        >
          View all notifications
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </>
  );
}

function PopoverRowB({
  item,
  feedKey,
  onDone,
}: {
  item: PrototypeNotification;
  feedKey: FeedKey;
  onDone: () => void;
}) {
  const openNotification = useNotificationClick(feedKey);
  return (
    <button
      type="button"
      onClick={() => openNotification(item, onDone)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/50"
    >
      <span className="relative shrink-0">
        <ActorAvatar item={item} className="size-9" />
        <span className="absolute -bottom-1 -right-1 rounded-full border bg-background p-0.5 text-muted-foreground">
          <TypeIcon type={item.type} className="size-2.5" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-[13px] leading-snug",
            item.read ? "text-muted-foreground" : "text-foreground"
          )}
        >
          <Body item={item} />
        </span>
        <span className="mt-1 block text-[11px] text-muted-foreground">
          {timeAgo(item.minutesAgo)}
        </span>
      </span>
      {!item.read && (
        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

export function PageB({ feedKey, params }: { feedKey: FeedKey; params: PrototypeParams }) {
  const items = useDisplayedFeed(feedKey, params.feed);
  const unseen = items.filter((item) => !item.seen).length;
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (params.feed !== "error") markAllSeen(feedKey);
  }, [feedKey, params.feed]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {unseen} unseen · {unread} unread
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => markAllRead(feedKey)}>
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      {params.feed === "error" ? (
        <div className="mt-8 rounded-2xl border border-dashed">
          <FeedPlaceholder
            kind="error"
            onRetry={() => params.setParams({ feed: "items" })}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed">
          <FeedPlaceholder kind="empty">
            <Button asChild size="sm" variant="outline" className="mt-2">
              <Link to="/courses">Browse courses</Link>
            </Button>
          </FeedPlaceholder>
        </div>
      ) : (
        <>
          {params.feed === "allread" && (
            <div className="mt-8 flex items-center gap-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
              <CheckCheck className="size-4 text-muted-foreground" />
              You&rsquo;re all caught up — every notification has been read.
            </div>
          )}

          <div className="mt-6">
            {groupByBucket(items).map((group) => (
              <div key={group.bucket}>
                <div className="sticky top-0 z-10 -mx-2 bg-background/90 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
                  {group.bucket}
                </div>
                <div className="space-y-2 pb-4">
                  {group.items.map((item) => (
                    <PageCardB key={item.id} item={item} feedKey={feedKey} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PageCardB({
  item,
  feedKey,
}: {
  item: PrototypeNotification;
  feedKey: FeedKey;
}) {
  const openNotification = useNotificationClick(feedKey);
  return (
    <button
      type="button"
      onClick={() => openNotification(item)}
      className={cn(
        "relative flex w-full items-start gap-3 overflow-hidden rounded-xl border bg-card p-4 text-left transition-shadow hover:shadow-sm",
        !item.read && "border-primary/25 bg-primary/[0.02]"
      )}
    >
      {!item.read && (
        <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-primary" />
      )}
      <span className="relative shrink-0">
        <ActorAvatar
          item={item}
          className={cn("size-10", item.read && "opacity-60")}
        />
        <span className="absolute -bottom-1 -right-1 rounded-full border bg-background p-0.5 text-muted-foreground">
          <TypeIcon type={item.type} className="size-3" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            item.read ? "text-muted-foreground" : "text-foreground"
          )}
        >
          <Body item={item} />
        </p>
        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{timeAgo(item.minutesAgo)}</span>
          {!item.read && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              New
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
