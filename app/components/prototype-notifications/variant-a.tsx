/**
 * PROTOTYPE — Variant A: "sidebar inbox".
 *
 * Bell in the sidebar header, badge as a numeric pill. Opening slides a dense,
 * full-height drawer out of the sidebar (sidebar tokens), with the page as a
 * single-column inbox and All/Unread tabs. Count = 9+ cap, no dot.
 */

import { useEffect, useState } from "react";
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
  typeLabel,
  useDisplayedFeed,
  useNotificationClick,
} from "./parts";

export interface BellProps {
  feedKey: FeedKey;
  unseen: number;
  params: PrototypeParams;
}

export function BellA({ feedKey, unseen, params }: BellProps) {
  const count = resolveCount(params.count, unseen);
  // Variant A hides the bell at a known zero: with the header placement it reads
  // as a status light, and the sidebar's Notifications item still gives access.
  if (count === null || count === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Notifications, ${count} new`}
        onClick={() => {
          if (params.open) {
            params.setParams({ open: false });
          } else {
            markAllSeen(feedKey);
            params.setParams({ open: true });
          }
        }}
        className={cn(
          "relative rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          params.open && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Bell className="size-4" />
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
          {countLabel(count)}
        </span>
      </button>
      {params.open && <PopoverA feedKey={feedKey} params={params} />}
    </div>
  );
}

function PopoverA({
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
        className="fixed inset-0 z-40 cursor-default bg-black/10"
      />
      <div className="fixed inset-y-0 left-56 z-50 flex w-[min(360px,calc(100vw-14rem))] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-2 border-b border-sidebar-border px-4 py-3">
          <div>
            <div className="text-sm font-semibold">Notifications</div>
            <div className="text-xs text-sidebar-foreground/60">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => markAllRead(feedKey)}
              title="Mark all as read"
              className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <CheckCheck className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => params.setParams({ open: false })}
              title="Close"
              className="rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {params.feed === "error" ? (
            <FeedPlaceholder
              kind="error"
              compact
              onRetry={() => params.setParams({ feed: "items" })}
            />
          ) : items.length === 0 ? (
            <FeedPlaceholder kind="empty" compact />
          ) : (
            items.slice(0, 7).map((item) => (
              <PopoverRowA key={item.id} item={item} feedKey={feedKey} onDone={() => params.setParams({ open: false })} />
            ))
          )}
        </div>

        <Link
          to={pageHref(params)}
          className="flex items-center justify-between border-t border-sidebar-border px-4 py-3 text-sm font-medium hover:bg-sidebar-accent"
        >
          View all notifications
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </>
  );
}

function PopoverRowA({
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
      className="relative flex w-full items-start gap-2.5 border-b border-sidebar-border/60 px-4 py-2.5 text-left hover:bg-sidebar-accent"
    >
      {!item.read && (
        <span className="absolute left-1.5 top-4 size-1.5 rounded-full bg-primary" />
      )}
      <ActorAvatar item={item} className="mt-0.5 size-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] leading-snug",
            item.read ? "text-sidebar-foreground/60" : "text-sidebar-foreground"
          )}
        >
          <Body item={item} />
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-sidebar-foreground/50">
          <TypeIcon type={item.type} className="size-3" />
          <span>{typeLabel(item.type)}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(item.minutesAgo)}</span>
        </div>
      </div>
    </button>
  );
}

export function PageA({ feedKey, params }: { feedKey: FeedKey; params: PrototypeParams }) {
  const items = useDisplayedFeed(feedKey, params.feed);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unseen = items.filter((item) => !item.seen).length;
  const unread = items.filter((item) => !item.read).length;
  const visible = tab === "unread" ? items.filter((item) => !item.read) : items;

  useEffect(() => {
    if (params.feed !== "error") markAllSeen(feedKey);
  }, [feedKey, params.feed]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unseen} unseen · {unread} unread
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => markAllRead(feedKey)}>
          <CheckCheck className="size-4" />
          Mark all read
        </Button>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-lg bg-muted p-1">
        {(["all", "unread"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors",
              tab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {key === "all" ? `All ${items.length}` : `Unread ${unread}`}
          </button>
        ))}
      </div>

      {params.feed === "error" ? (
        <div className="mt-6 rounded-lg border border-dashed">
          <FeedPlaceholder
            kind="error"
            onRetry={() => params.setParams({ feed: "items" })}
          />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed">
          <FeedPlaceholder kind="empty" />
        </div>
      ) : (
        <>
          {params.feed === "allread" && (
            <div className="mt-6 flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3 text-sm">
              <CheckCheck className="size-4 text-muted-foreground" />
              You&rsquo;re all caught up — every notification has been read.
            </div>
          )}

          <div className="mt-6">
            {groupByBucket(visible).map((group) => (
              <div key={group.bucket}>
                <div className="mt-5 mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.bucket}
                </div>
                <div className="divide-y divide-border">
                  {group.items.map((item) => (
                    <PageRowA key={item.id} item={item} feedKey={feedKey} />
                  ))}
                </div>
              </div>
            ))}
            {visible.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed">
                <FeedPlaceholder kind="empty" compact />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PageRowA({
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
      className="group relative flex w-full items-start gap-3 px-2 py-4 text-left hover:bg-muted/60"
    >
      {!item.read && (
        <span className="absolute left-0 top-[26px] size-2 rounded-full bg-primary" />
      )}
      <ActorAvatar
        item={item}
        className={cn("mt-0.5 size-8 shrink-0", item.read && "opacity-60")}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm leading-snug",
            item.read ? "text-muted-foreground" : "text-foreground"
          )}
        >
          <Body item={item} />
        </p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <TypeIcon type={item.type} className="size-3" />
          <span>{typeLabel(item.type)}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(item.minutesAgo)}</span>
        </div>
      </div>
    </button>
  );
}
