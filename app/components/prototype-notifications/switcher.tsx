/**
 * PROTOTYPE — floating bottom bar: variant, simulated bell count, feed state.
 * Never shown in a production build.
 */

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, FlaskConical, RotateCcw } from "lucide-react";
import { cn } from "~/lib/utils";
import { resetFeed } from "./store";
import { feedKeyFor } from "./data";
import type { UserRole } from "~/db/schema";
import {
  nextVariant,
  usePrototypeParams,
  type CountState,
  type FeedState,
  type Variant,
} from "./params";

const NAMES: Record<Variant, string> = {
  a: "Sidebar inbox",
  b: "Card popover",
  c: "Reading room",
};

const COUNTS: { value: CountState; label: string }[] = [
  { value: "3", label: "3" },
  { value: "12", label: "12 (cap)" },
  { value: "0", label: "Zero" },
  { value: "unknown", label: "Unknown" },
  { value: "auto", label: "Live unseen" },
];

const FEEDS: { value: FeedState; label: string }[] = [
  { value: "items", label: "Items" },
  { value: "allread", label: "All read" },
  { value: "empty", label: "Empty" },
  { value: "error", label: "Error" },
];

export function PrototypeSwitcher({
  role,
  isTeamAdmin,
}: {
  role: UserRole | null;
  isTeamAdmin: boolean;
}) {
  const params = usePrototypeParams();

  useEffect(() => {
    if (import.meta.env.PROD) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        params.setParams({ variant: nextVariant(params.variant, -1) });
      }
      if (event.key === "ArrowRight") {
        params.setParams({ variant: nextVariant(params.variant, 1) });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [params.variant]);

  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2">
      <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900/95 px-2 py-1.5 text-neutral-100 shadow-2xl backdrop-blur">
        <span className="flex items-center gap-1.5 pl-1.5 pr-1 text-[11px] font-medium text-neutral-400">
          <FlaskConical className="size-3.5" />
          Prototype
        </span>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous variant"
            onClick={() =>
              params.setParams({ variant: nextVariant(params.variant, -1) })
            }
            className="rounded-full p-1 hover:bg-white/10"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-[9.5rem] text-center text-xs font-medium">
            {params.variant.toUpperCase()} · {NAMES[params.variant]}
          </span>
          <button
            type="button"
            aria-label="Next variant"
            onClick={() =>
              params.setParams({ variant: nextVariant(params.variant, 1) })
            }
            className="rounded-full p-1 hover:bg-white/10"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <span className="h-4 w-px bg-white/15" />

        <label className="flex items-center gap-1 text-[11px] text-neutral-400">
          Bell
          <select
            value={params.count}
            onChange={(event) =>
              params.setParams({ count: event.target.value as CountState })
            }
            className={cn(
              "rounded-md bg-white/10 px-1.5 py-1 text-[11px] text-neutral-100 outline-none",
              "hover:bg-white/15"
            )}
          >
            {COUNTS.map((option) => (
              <option key={option.value} value={option.value} className="text-black">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1 text-[11px] text-neutral-400">
          Feed
          <select
            value={params.feed}
            onChange={(event) =>
              params.setParams({ feed: event.target.value as FeedState })
            }
            className={cn(
              "rounded-md bg-white/10 px-1.5 py-1 text-[11px] text-neutral-100 outline-none",
              "hover:bg-white/15"
            )}
          >
            {FEEDS.map((option) => (
              <option key={option.value} value={option.value} className="text-black">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            const key = feedKeyFor(role, isTeamAdmin);
            if (key) resetFeed(key);
            params.setParams({ open: false, feed: "items", count: "3" });
          }}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-neutral-400 hover:bg-white/10 hover:text-neutral-100"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>

        <span className="max-w-[16rem] pl-1 pr-1.5 text-[10px] leading-tight text-neutral-500">
          Opening the panel or page clears the live count; Reset reseeds. Clicking
          an item marks it read and the destination link appears in a toast.
        </span>
      </div>
    </div>
  );
}
