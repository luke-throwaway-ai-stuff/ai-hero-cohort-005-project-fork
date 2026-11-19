/**
 * PROTOTYPE — Variant C: "wordmark companion + reading room".
 *
 * The bell sits immediately after the wordmark with the count as a capsule
 * attached to it. Opening drops a wide sheet whose glance is a 3-up card rail
 * rather than a list. The page is master-detail: list left, preview right.
 * Type is shown as a chip in the detail pane.
 */

import { useEffect, useState } from "react";
import { ArrowRight, Bell, CheckCheck, ExternalLink, X } from "lucide-react";
import { Link } from "react-router";
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
  timeAgo,
  typeLabel,
  useDisplayedFeed,
  useNotificationClick,
} from "./parts";
import type { BellProps } from "./variant-a";

export function BellC({ feedKey, unseen, params }: BellProps) {
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
          "relative flex items-center gap-1.5 rounded-full text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          count > 0
            ? "border border-sidebar-border py-0.5 pl-1.5 pr-2"
            : "p-1.5",
          params.open && "bg-sidebar-accent text-sidebar-accent-foreground"
        )}
      >
        <Bell className="size-3.5" />
        {count > 0 && (
          <span className="text-[11px] font-semibold leading-none">
            {countLabel(count)}
          </span>
        )}
      </button>
      {params.open && <SheetC feedKey={feedKey} params={params} />}
    </div>
  );
}

function SheetC({
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
      <div className="absolute left-0 top-full z-50 mt-2 w-[min(640px,calc(100vw-3rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-2xl">
        <div className="flex items-start justify-between gap-2">
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

        {params.feed === "error" ? (
          <div className="mt-2 rounded-lg border border-dashed">
            <FeedPlaceholder
              kind="error"
              compact
              onRetry={() => params.setParams({ feed: "items" })}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed">
            <FeedPlaceholder kind="empty" compact />
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {items.slice(0, 3).map((item) => (
              <RailCardC
                key={item.id}
                item={item}
                feedKey={feedKey}
                onDone={() => params.setParams({ open: false })}
              />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {items.length > 3
              ? `${items.length - 3} more in the inbox`
              : "That's everything"}
          </span>
          <Button asChild size="sm" variant="ghost">
            <Link to={pageHref(params)} className="text-primary">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function RailCardC({
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
      className={cn(
        "flex min-h-28 flex-col gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
        !item.read && "border-primary/30 bg-primary/[0.02]"
      )}
    >
      <span className="flex items-center gap-2">
        <ActorAvatar item={item} className="size-6" />
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
          {timeAgo(item.minutesAgo)}
        </span>
        {!item.read && <span className="size-1.5 rounded-full bg-primary" />}
      </span>
      <span
        className={cn(
          "line-clamp-3 text-xs leading-snug",
          item.read ? "text-muted-foreground" : "text-foreground"
        )}
      >
        <Body item={item} />
      </span>
      <span className="mt-auto flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        <TypeIcon type={item.type} className="size-3" />
        {typeLabel(item.type)}
      </span>
    </button>
  );
}

export function PageC({ feedKey, params }: { feedKey: FeedKey; params: PrototypeParams }) {
  const items = useDisplayedFeed(feedKey, params.feed);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visible = tab === "unread" ? items.filter((item) => !item.read) : items;
  const unread = items.filter((item) => !item.read).length;
  const selected =
    items.find((item) => item.id === selectedId) ?? visible[0] ?? null;

  useEffect(() => {
    if (params.feed !== "error") markAllSeen(feedKey);
  }, [feedKey, params.feed]);

  useEffect(() => {
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [items, selectedId]);

  return (
    <div className="flex h-full">
      <div className="flex w-[380px] max-w-full shrink-0 flex-col border-r">
        <div className="border-b px-5 py-5">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              Notifications
            </h1>
            {unread > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {unread} unread
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1">
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
                  tab === key
                    ? "border-foreground/20 bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {key === "all" ? `All ${items.length}` : `Unread ${unread}`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => markAllRead(feedKey)}
              className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {params.feed === "error" ? (
            <FeedPlaceholder
              kind="error"
              onRetry={() => params.setParams({ feed: "items" })}
            />
          ) : items.length === 0 ? (
            <FeedPlaceholder kind="empty" />
          ) : visible.length === 0 ? (
            <FeedPlaceholder kind="empty" compact>
              <p className="mt-1 text-xs text-muted-foreground">
                Nothing unread in the inbox.
              </p>
            </FeedPlaceholder>
          ) : (
            visible.map((item) => (
              <ListRowC
                key={item.id}
                item={item}
                selected={selected?.id === item.id}
                onSelect={() => setSelectedId(item.id)}
              />
            ))
          )}
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 lg:block">
        {params.feed === "error" ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Notifications are unavailable right now.
          </div>
        ) : selected ? (
          <DetailC item={selected} feedKey={feedKey} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a notification to read it.
          </div>
        )}
      </div>
    </div>
  );
}

function ListRowC({
  item,
  selected,
  onSelect,
}: {
  item: PrototypeNotification;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors",
        selected
          ? "border-primary bg-accent"
          : "border-transparent hover:bg-muted/60"
      )}
    >
      <ActorAvatar item={item} className="mt-0.5 size-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <TypeIcon type={item.type} className="size-3" />
          <span>{typeLabel(item.type)}</span>
          <span aria-hidden>·</span>
          <span>{timeAgo(item.minutesAgo)}</span>
          {!item.read && (
            <span className="ml-auto size-1.5 rounded-full bg-primary" />
          )}
        </div>
        <p
          className={cn(
            "mt-1 line-clamp-2 text-[13px] leading-snug",
            item.read ? "text-muted-foreground" : "text-foreground"
          )}
        >
          <Body item={item} />
        </p>
      </div>
    </button>
  );
}

function DetailC({
  item,
  feedKey,
}: {
  item: PrototypeNotification;
  feedKey: FeedKey;
}) {
  const openNotification = useNotificationClick(feedKey);
  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <TypeIcon type={item.type} className="size-3" />
          {typeLabel(item.type)}
        </span>
        <span className="text-xs text-muted-foreground">
          {timeAgo(item.minutesAgo)}
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-semibold leading-snug tracking-tight">
        <Body item={item} />
      </h2>

      <div className="mt-6 flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
        <ActorAvatar item={item} className="size-9" />
        <div className="min-w-0">
          <div className="text-sm font-medium">
            {item.actorName || "Cadence"}
          </div>
          <div className="text-xs text-muted-foreground">
            {typeLabel(item.type)}
          </div>
        </div>
        <div className="ml-auto">
          {item.read ? (
            <span className="text-xs text-muted-foreground">Read</span>
          ) : (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Unread
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Opens
          </div>
          <div className="mt-1 font-mono text-xs">{item.link}</div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <Button onClick={() => openNotification(item)}>
          {item.linkLabel}
          <ExternalLink className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Opens in the app, no full reload.
        </span>
      </div>
    </div>
  );
}
