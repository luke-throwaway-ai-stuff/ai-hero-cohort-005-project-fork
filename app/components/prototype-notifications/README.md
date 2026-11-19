# PROTOTYPE — in-app notification UX

Throwaway. Answers issue #7 ("what should the in-app notification experience look
and feel like?") and nothing else. Fake data, no Knock, no database, no
persistence. The branch is `prototype/in-app-notifications`; it is never merged.

## Run it

```bash
npm run dev
```

Open <http://localhost:5173/prototype/notifications> and pick a user in the DevUI
panel (bottom right). The bell lives in the real sidebar on every page while this
branch is checked out, so you can also browse to a course or the dashboard and
open it there.

URL state is shareable:

```
/prototype/notifications?variant=a|b|c&count=3|12|0|unknown|auto&feed=items|allread|empty|error&open=0|1
```

The floating bar at the bottom switches variant with the arrows or ← / →, and
sets the simulated bell count and feed state.

- **Bell** — `3` and `12` force a known count (`12` exercises the `9+` cap);
  `0` gives a bare bell; `unknown` removes the bell entirely; `live unseen`
  derives the count from the in-memory feed, so it clears when a panel opens.
- **Feed** — `items`, `all read`, `empty` (new account), `error` (failed fetch,
  never the empty state).
- **Reset** reseeds the fake feed and the counts.

## The three variants

| | A — Sidebar inbox | B — Card popover | C — Reading room |
|---|---|---|---|
| Bell | Header, far right | User row, bottom | Next to the wordmark |
| Count | Numeric pill on the bell | Numeric badge on the bell | Capsule attached to the bell |
| Opening | Full-height drawer flush to the sidebar, sidebar tokens | Rounded card floating above the bell, popover tokens | Wide sheet with a 3-up rail of the newest |
| Page | Single column, All/Unread tabs, grouped by day | Centred cards, sticky day headers | Master-detail: list left, preview right |
| Item type | Text label under the body | Icon badge on the avatar | Chip in the preview pane |
| Unread | Dot + full-strength text | Left accent + tinted card + "New" | Left border + bold text |

All three use the sidebar's `--sidebar-*` and the popover/card tokens, so dark
mode is judged in place. Panel widths are clamped to `calc(100vw - …)`, but the
app shell itself has no narrow-viewport treatment yet (the sidebar is fixed at
224px), so "narrow" here means a squeezed content area, not a phone layout.

## Interactions that are real

- Opening a panel or the page marks everything seen — the live count clears.
- Clicking an item marks it read, then (in the real client) navigates after
  200 ms without waiting for the write. The prototype shows the destination in a
  toast instead of leaving the fake feed.
- "Mark all read" and "View all" work; View all keeps the current variant and
  simulated state.
- A failed load shows the error state with Retry, and never marks anything seen.

## What the prototype does not cover

- Read-state rollback, refetch-on-focus, sockets, rate limits.
- Muting/digests (issue #11) and where copy is authored (issue #8).
- Dot-only count: not prototyped, because the settled rule on #5 requires a
  number.

## Where Knock's stock components would land

- `useKnockFeed` / `NotificationFeedPopover` replace `store.ts` + each variant's
  panel shell and list. The hook is the store; the popover owns open/close and
  anchor positioning, which suits B directly and needs custom wrappers for A's
  drawer and C's sheet.
- `NotificationCell` replaces the row body in A/B. Its built-in anatomy is
  avatar + body + relative time and its click handler calls
  `window.location.assign`, a full document load that would discard the feed —
  which is why issue #9 exists.
- `NotificationIconButton` (Knock's bell) replaces the bell button itself; the
  count treatment here is custom, so it would need re-skinning.

## Files

- `data.ts` — fake feeds per role, copy from the catalogue decision (#3).
- `store.ts` — in-memory feed client, one store per tab.
- `params.ts` — URL state, count resolution, persistence across navigation.
- `parts.tsx` — type icons/labels, timestamps, click behaviour, placeholders.
- `variant-a.tsx` / `variant-b.tsx` / `variant-c.tsx` — bell + panel + page.
- `bell.tsx` — mounts the right bell into the real sidebar chrome.
- `switcher.tsx` — floating control bar (hidden in production builds).
- `app/routes/prototype.notifications.tsx` — the throwaway route.

Wiring in existing files is marked `PROTOTYPE` in `app/components/sidebar.tsx`
and `app/routes.ts`.
