# Knock and in-app notifications

Research for ticket [#4](https://github.com/luke-throwaway-ai-stuff/ai-hero-cohort-005-project-fork/issues/4).

Everything below is from Knock's own documentation, its public OpenAPI spec, the
`knocklabs/javascript` source, and the npm registry. Every claim carries the URL
it came from. Where the docs contradict each other or say nothing, that is
called out rather than filled in.

Read against Cadence as it is today: React Router 8 with SSR on, SQLite + Drizzle,
44 seeded users, no queue, no background workers, one synchronous request per
user action.

---

## 1. Core concepts, and how they relate

| Concept | What it is | Source |
| --- | --- | --- |
| **User** | A person who may be notified. Only `id` is required; `email`, `name`, `avatar`, `phone_number`, `timezone` are optional built-ins, and arbitrary `properties` are stored and deep-merged on every upsert. | https://docs.knock.app/concepts/users |
| **Object** | Any non-user resource mapped into Knock, in a `collection`. Usable as a recipient, an actor, or a data source for templates. | https://docs.knock.app/concepts/overview |
| **Tenant** | A segment users belong to ("account", "organization", "workspace"). Behind the scenes a tenant is an Object in the `$tenants` collection. | https://docs.knock.app/multi-tenancy/overview |
| **Workflow** | A triggered journey with a unique `key`, made of function steps and channel steps. Runs **once per recipient**. Holds all logic and templates. | https://docs.knock.app/concepts/workflows |
| **Channel** | A configured provider: email, in-app feed, in-app guide, push, SMS, chat, webhook. The in-app channel is hosted by Knock, not by a third party. | https://docs.knock.app/concepts/channels |
| **Feed** | Not a separate object type — a *view* of Messages on an in-app feed channel, per user, reverse chronological, with aggregate counts. | https://docs.knock.app/in-app-ui/feeds/overview |
| **Message** | One notification delivered to one recipient on one channel. The unit that carries delivery status and engagement status. | https://docs.knock.app/concepts/messages |
| **FeedItem** | The in-app projection of a Message: `id`, `actors`, `data`, `blocks`, `source`, `tenant`, `read_at`, `seen_at`, `archived_at`, `inserted_at`. | https://docs.knock.app/in-app-ui/api-overview |

The relations that matter:

- A **workflow** produces zero or more **messages**, one per channel step, per
  recipient. A trigger for N recipients creates N *recipient workflow runs*
  behind a single `workflow_run_id`
  (https://docs.knock.app/concepts/workflows,
  https://docs.knock.app/send-notifications/triggering-workflows/api).
- A **message** is only producible by a channel step. There is no "send an
  in-app message directly" call — the feed is a by-product of workflows (or
  broadcasts). https://docs.knock.app/integrations/in-app/feeds
- **Users are not related to tenants.** "Knock does not know which tenant to
  associate with a given set of users. Instead, you must explicitly pass a
  tenant when triggering a workflow."
  https://docs.knock.app/multi-tenancy/overview
- **Messages are tagged** with the tenant passed at trigger time, which is what
  makes tenant-scoped feeds possible.
  https://docs.knock.app/multi-tenancy/tenant-scoping
- **Preferences** are per-recipient `PreferenceSet` objects (`categories`,
  `channels`, `channel_types`, `workflows`) evaluated automatically on every
  workflow run. https://docs.knock.app/preferences/overview
- **Objects + subscriptions** fan a single trigger out to a list of recipients —
  knock's model for "notify everyone who follows this thing"
  (https://docs.knock.app/concepts/overview). Not needed for a 44-user app.

Channels exist per account, with one ID shared across environments; their
settings are configured per environment and are not versioned like workflows
(https://docs.knock.app/concepts/channels). An account gets a single in-app
channel by default, and you can add more
(https://docs.knock.app/in-app-ui/feeds/overview).

---

## 2. How a server-side event becomes a notification a user can fetch

The pipeline is: **trigger → workflow run → message → feed item → real-time push
or fetch.**

1. **Your server calls `POST /v1/workflows/{key}/trigger`** with `recipients`,
   optional `actor`, optional `tenant`, optional `data`, optional
   `cancellation_key`, optional `settings`.
   https://docs.knock.app/api-reference/workflows/trigger
   - `data` is what templates render from, and is echoed into the feed item's
     `data` field — this is the hook for passing Cadence entity IDs through.
     https://docs.knock.app/in-app-ui/api-overview
   - Up to 1,000 recipients per trigger; there is no bulk-trigger endpoint.
     https://docs.knock.app/send-notifications/triggering-workflows/api
   - `data` payload limit is 10 MB; individual strings over 1024 bytes are
     truncated *in logs* (not in the message).
     https://docs.knock.app/send-notifications/triggering-workflows/api
2. **Knock returns `{ workflow_run_id }` immediately.** "All workflow runs are
   executed asynchronously."
   https://docs.knock.app/api-reference/workflows/trigger
   So a 200 means *enqueued*, not *delivered*. There is no documented latency
   figure anywhere in the docs — do not assume one.
3. **The workflow runs per recipient.** Channel steps produce messages;
   function steps (delay, batch, branch, throttle) can defer or drop them.
   A step is skipped when conditions fail, the channel is unconfigured, the
   recipient opted out, or the recipient is missing required data (e.g. no
   email for an email step).
   https://docs.knock.app/send-notifications/debugging-workflows
4. **The in-app channel step writes a FeedItem.** In-app messages "automatically
   skip to the `delivered` status. We always successfully deliver the message to
   the Knock Feed API."
   https://docs.knock.app/send-notifications/message-statuses
   Nothing is pushed to a third party; Knock *is* the provider.
5. **The client learns about it two ways.**
   - Fetch: `GET /v1/users/{user_id}/feeds/{id}` returns `entries` +
     `meta.total_count` / `unread_count` / `unseen_count` + `page_info`.
     https://docs.knock.app/api-reference/users/feeds/list_items
   - Real-time: a managed websocket emits a single event type, `new-message`,
     which "will not contain the full message contents, but will include
     metadata about the updated badge counts. Might be throttled."
     https://docs.knock.app/in-app-ui/api-overview

   The SDK's own behaviour on that event (primary source): it optimistically
   writes the new badge metadata, then issues a `fetch({ before: currentHead })`
   to pull the actual item(s). So one push costs one API request.
   https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/feed.ts
6. **The user reads it.** The SDK marks items `seen` when the feed opens, and
   `read` either on click or via "mark all as read".
   https://docs.knock.app/integrations/in-app/feeds

Content is authored in Knock's template editor on the channel step (Liquid,
Markdown/plain text/button blocks), not in your React code. Three variants:
standard, single-action, multi-action, with an optional Action URL that the
stock feed will redirect to.
https://docs.knock.app/integrations/in-app/feeds

---

## 3. Client side: what `@knocklabs/react` actually gives you

Current versions on npm: `@knocklabs/react` **0.15.1**, depending on
`@knocklabs/client` **0.23.1**. Peer deps: `react` / `react-dom`
`^17 || ^18 || ^19`; `next` and `@tanstack/react-router` are **optional** peers.
https://www.npmjs.com/package/@knocklabs/react

Package exports are `.`, `./next`, `./tanstack`, `./dist/index.css` — there is
**no React Router entrypoint**. The React Router app would import the root
entrypoint and mount it client-side.

### Components

| Export | What it does | Source |
| --- | --- | --- |
| `KnockProvider` | Creates and authenticates the Knock client; provides it via context. Props: `apiKey`, `user`, `userToken`, `enabled`, `host`, `logLevel`, `i18n`. | https://docs.knock.app/in-app-ui/react/sdk/components/knock-provider |
| `KnockFeedProvider` | Connects a feed channel. Props: `feedId` (the in-app **channel UUID**), `defaultFeedOptions`, `colorMode`. | https://docs.knock.app/in-app-ui/react/sdk/components/knock-feed-provider |
| `NotificationFeed` | Full-page/inline feed with header, filtering, mark-all-as-read. Props incl. `renderItem`, `renderHeader`, `onNotificationClick`, `onNotificationButtonClick`, `onMarkAllAsReadClick`, `initialFilterStatus`, `EmptyComponent`. | https://docs.knock.app/in-app-ui/react/sdk/components/notification-feed |
| `NotificationFeedPopover` | Same feed, in a popover anchored to a button ref. Marks all items **seen** on open by default. | https://docs.knock.app/in-app-ui/react/feed |
| `NotificationCell` | One row, overridable / wrappable. | https://docs.knock.app/in-app-ui/react/feed |
| `NotificationIconButton` | Bell icon with a badge. `badgeCountType: "unseen" \| "unread" \| "all"`. | https://docs.knock.app/in-app-ui/react/sdk/components/notification-icon-button |
| `FilterStatus` | Enum for `initialFilterStatus` (`All`, `Unread`, …). | https://docs.knock.app/in-app-ui/react/feed |

There is **no toast component**. The docs build toasts on top of the primitives
plus `react-hot-toast`, wiring `onNotificationsReceived` to the feed client
(https://docs.knock.app/in-app-ui/react/toasts). A full-page inbox is just
`<NotificationFeed />` inside the two providers
(https://docs.knock.app/in-app-ui/react/inbox).

### Hooks (headless route)

| Hook | Returns / does | Source |
| --- | --- | --- |
| `useAuthenticatedKnockClient(apiKey, user, userToken?, options?)` | A `Knock` client instance. | https://docs.knock.app/in-app-ui/react/sdk/hooks/use-authenticated-knock-client |
| `useNotifications(knock, feedChannelId, options?)` | A `Feed` client: `fetch()`, `fetchNextPage()`, `markAsSeen`, `markAllAsSeen`, `markAsRead`, `markAllAsRead`, `markAsUnread`, `markAsInteracted`, `markAsArchived`, `markAllAsArchived`, `markAsUnarchived`. | https://docs.knock.app/in-app-ui/react/sdk/hooks/use-notifications |
| `useNotificationStore(feedClient, selector?)` | `{ items, metadata, pageInfo, loading, networkStatus }`; selector form re-renders only on the selected slice. | https://docs.knock.app/in-app-ui/react/sdk/hooks/use-notification-store |
| `useKnockFeed()` | Feed client + store from `KnockFeedProvider`. | https://docs.knock.app/in-app-ui/react/headless/feed |
| `useKnockAuthState()` | Auth transitions (`authenticated` / `unauthenticated`). | https://docs.knock.app/in-app-ui/react/sdk/components/knock-provider |
| `usePreferences()` | Preference-set read/write. | https://docs.knock.app/preferences/overview |

Badge counts come from `metadata.unseen_count` / `unread_count` /
`total_count` (https://docs.knock.app/in-app-ui/api-overview). The stock
default is **unseen**, chosen because it "results in less noise and disruption";
`badgeCountType="unread"` switches it, and `NotificationFeedPopover` takes an
`onOpen` you can use to call `markAsRead` instead of the default
`markAllAsSeen` (https://docs.knock.app/in-app-ui/react/feed).

Headless means **you** own seen-tracking: "If you don't mark items as seen,
`unseen_count` never decreases and any badge based on it never clears."
https://docs.knock.app/in-app-ui/react/headless/feed

### Real-time

The SDK opens one websocket per client and multiplexes feed instances over it,
keyed by topic `feeds:{feedId}:{userId}`. It reconnects with backoff, and can
auto-disconnect background tabs (`auto_manage_socket_connection`,
`auto_manage_socket_connection_delay`) and cross-sync tabs via
`BroadcastChannel` (`__experimentalCrossBrowserUpdates`).
https://docs.knock.app/in-app-ui/react/feed,
https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/socket-manager.ts,
https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/feed.ts

SSR note (verified in source, not documented): the socket is only created when
`typeof window !== "undefined" && typeof WebSocket !== "undefined"`, so
server-side rendering does not open a socket. But `KnockProvider` authenticates
during render and defaults `identificationStrategy` to `inline`, which issues an
identify request — so an unguarded provider will fire API calls from the SSR
pass and from every render. Use `enabled={false}` until the browser is ready, or
pass `identificationStrategy="skip"`.
https://github.com/knocklabs/javascript/blob/main/packages/client/src/api.ts,
https://docs.knock.app/in-app-ui/react/sdk/components/knock-provider

---

## 4. What Knock owns vs. what stays in Cadence's database

| Thing | Owner | Evidence |
| --- | --- | --- |
| Notification content, rendered blocks, message history | **Knock.** Authored in the dashboard template editor, immutable once generated ("its content and other metadata can't be changed once Knock generates it. If a message becomes out of date, archive it and trigger the workflow again"). | https://docs.knock.app/integrations/in-app/feeds |
| Read / seen / archived / interacted timestamps | **Knock**, as message engagement statuses with `read_at`, `seen_at`, `archived_at`, `interacted_at`. A message can hold several at once. | https://docs.knock.app/send-notifications/message-statuses |
| Unread / unseen / total counts | **Knock**, recomputed and returned as feed `meta`; pushed over the socket too. Never store these yourself. | https://docs.knock.app/in-app-ui/api-overview |
| Per-user preferences | **Knock**, as `PreferenceSet` JSON, evaluated server-side before each channel step. Hosted preference center writes to the user's `default` set. | https://docs.knock.app/preferences/overview, https://docs.knock.app/preferences/hosted-preference-center |
| Recipient identity and profile traits | **Knock** (as a cache). "Knock should always be viewed as a *cache* of information about users." | https://docs.knock.app/concepts/users |
| Workflow definitions and templates | **Knock**, version-controlled in commits; promotable between environments. Can be pulled into the repo with the CLI. | https://docs.knock.app/concepts/workflows, https://docs.knock.app/developer-tools/knock-cli |
| The business event itself (refund approved, comment posted) | **Cadence.** Knock has no idea why a notification happened beyond the `data` you pass. | https://docs.knock.app/send-notifications/triggering-workflows/api |
| Links back to Cadence entities | **Cadence**, encoded into trigger `data` and/or the Action URL, echoed on `FeedItem.data`. `trigger_data` filters must be flat key/value pairs. | https://docs.knock.app/in-app-ui/api-overview, https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/interfaces.ts |

**Retention.** Message *log* data (contents, events, delivery logs, activities,
workflow run logs) is retained 30 days on non-Enterprise plans, 90 days on
Enterprise. But in-app feed items are exempt: "In-app feed notifications are
available indefinitely… you can still fetch the associated `FeedItem` data from
the Show feed endpoint." Status updates on expired items still work and still
emit webhooks.
https://docs.knock.app/manage-your-account/data-retention

So Knock can be the system of record for the notification inbox itself. What it
cannot be is the system of record for "what happened in Cadence" — Cadence still
needs its own record of the event if the inbox item is ever to be reconciled,
audited, or replayed.

---

## 5. Local dev and the free tier

- **Two key types per environment**: publishable `pk_*` (safe in client code,
  can call a fixed list of user-scoped and message-status endpoints) and secret
  `sk_*` (full API access, server only). The client SDK throws if handed an
  `sk_` key. https://docs.knock.app/api-reference/overview/api-keys,
  https://docs.knock.app/in-app-ui/security-and-authentication
- **Env vars the docs use**: `KNOCK_PUBLIC_API_KEY`, `KNOCK_FEED_CHANNEL_ID`
  (the in-app channel UUID), `KNOCK_SIGNING_KEY` (JWT signing key, only needed
  with enhanced security). https://docs.knock.app/in-app-ui/react/feed,
  https://docs.knock.app/in-app-ui/security-and-authentication
- **No "test mode" flag.** There is no `pk_test_`-style mode switch — those
  strings in the docs are example keys. Test isolation is done with
  **environments** (each has its own users, messages, tenants, keys; unlimited
  on every plan, including Free), the **workflow test runner**, and **sandbox
  mode**. https://docs.knock.app/version-control/environments,
  https://knock.app/pricing
- **Sandbox mode does not work for in-app.** "The in-app channel doesn't
  support sandbox mode. Knock manages in-app delivery, so there's no downstream
  provider handoff to suppress. Use channel conditions to manage when messages
  are created for in-app steps in your non-production environments."
  https://docs.knock.app/manage-your-account/knock-plans,
  https://docs.knock.app/integrations/overview
  That means a dev environment will really accumulate feed items — the
  isolation is the environment, not a sandbox.
- **Trigger-time test switches**: `settings.sandbox_mode` and
  `settings.skip_delay` on the trigger call mirror the test runner.
  https://docs.knock.app/send-notifications/triggering-workflows/api
- **CLI**: `npm i -g @knocklabs/cli`, `knock login` (browser) or a service
  token, `knock.json` with a `knockDir`, then `knock pull` / `knock push` to
  keep workflows in the repo and in CI.
  https://docs.knock.app/developer-tools/knock-cli
- **Free plan** (https://knock.app/pricing): $0, no credit card, up to 10,000
  messages/month, 500 guide recipients, unlimited stored profiles, workflows,
  channels, environments, team members; includes "built-in multi-tenancy".
  Starter is $250/month (50,000 messages) and adds "Remove Knock branding".
- **Nothing works without an account.** Every API call authenticates against an
  environment key (401 otherwise), the CLI needs a login or service token, and
  the React SDK needs a real `pk_*` plus a real channel UUID. No mock server,
  fixture mode, or offline mode is documented anywhere in the docs index
  (https://docs.knock.app/llms.txt). A free account is the local-dev floor.

---

## 6. Failure behaviour

Four distinct failure surfaces, with different guarantees:

1. **The trigger call itself.** Synchronous HTTP. `4xx` for bad request/auth
   (`authentication_error`, `api_key_missing`, etc.), `5xx` for Knock server
   errors; branch on the stable `code`, never the `message`.
   https://docs.knock.app/api-reference/overview/errors
   A trigger for an `Inactive` workflow returns `workflow_inactive` and
   enqueues nothing. https://docs.knock.app/concepts/workflows
   **Knock does not retry your trigger.** If the POST fails, nothing happened.
2. **Idempotency** (only place Knock helps you retry). `Idempotency-Key` header,
   unique string up to 255 chars, **only** honoured on
   `POST /v1/workflows/:key/trigger`. Same key within **24 hours** returns the
   original response; replay is signalled by `idempotent-replayed: true` and
   `original-x-request-id`. Only `2xx` responses are cached — a 4xx/5xx retried
   with the same key executes again. Mismatched params with a reused key is an
   error. https://docs.knock.app/api-reference/overview/idempotent-requests
3. **Workflow step failure.** Steps are retried "up to 3 total times"; after
   that the step is marked failed and **the run halts** — no later steps
   execute. Recovery is manual: "Retry run" in the dashboard, once per run,
   within 7 days, resuming from the failed step on the original workflow
   version. Un-retried failures just stay failed.
   https://docs.knock.app/send-notifications/debugging-workflows
4. **Message delivery failure** (out-of-app only). Up to **8 attempts over 30
   minutes** with exponential backoff and jitter; status moves
   `queued → delivery_attempted → bounced|undelivered`. Delivery-status polling
   gets 10 attempts over 30 minutes. Manual "Retry delivery" exists for
   `undelivered`. https://docs.knock.app/send-notifications/delivering-notifications
   In-app messages never enter this path — they are delivered to the feed API by
   construction. https://docs.knock.app/send-notifications/message-statuses

Also relevant: **trigger frequency** on a workflow can be set to "once per
recipient" (optionally per tenant), which is a second, Knock-side dedupe
mechanism independent of `Idempotency-Key`.
https://docs.knock.app/send-notifications/triggering-workflows/overview

There is **no outbox, no dead-letter queue, and no callback to your app** when a
trigger or run fails — unless you subscribe to outbound webhooks for message
events (https://docs.knock.app/send-notifications/message-statuses). If Cadence
needs to know a notification failed, it has to poll the workflow-recipient-runs
API or consume webhooks.

---

## 7. Syncing Cadence's 44 users and 4 roles into Knock

### What Cadence actually has

Read from `app/db/schema.ts` and the seeded `data.db`:

- 44 rows in `users`: **1** `admin`, **3** `instructor`, **40** `student`.
- Role #4 is not on `users`: **Team Admin** is a `student` with
  `team_members.role = 'admin'`. 3 teams, 3 team admins, 6 team members.
- `users.id` is an autoincrement integer. There is no UUID and no external ID.
- There is no org/tenant concept. A *Team* is a licensing group — it owns
  coupons/seats, not content or members' data.
- Session is a signed cookie (`cadence_session`) holding `userId`; there is no
  password login, and the dev UI switches users by writing that cookie
  (`app/lib/session.ts`, `app/components/dev-ui.tsx`).

### Id mapping

- `id` is required, max 256 chars, may not contain `/` or `#`, and **cannot be
  changed once set** (https://docs.knock.app/concepts/users).
- Use a stable prefixed form — `cadence-user-{id}` — rather than the bare
  integer. Knock's own guidance for multiple principal types is to prefix the
  id, and a prefix leaves room for non-user principals later (e.g. a synthetic
  `cadence-system` actor). https://docs.knock.app/concepts/users
- Roles are **not** a Knock concept. Do not create four "user types". Put them
  on the user as traits (`properties.role`, or top-level custom keys — all
  properties surface at the top level of the user object), which then becomes
  usable in templates and conditions.
  https://docs.knock.app/concepts/users
- Team Admin is a *relationship*, not an attribute: `properties.team_ids: [1]`
  plus `properties.team_role: "admin"` is the cheapest faithful encoding.

### The actual sync

Three supported paths (https://docs.knock.app/managing-recipients/identifying-recipients):

| Path | Cost for 44 users | Caveat |
| --- | --- | --- |
| `PUT /v1/users/{id}` per user | 44 calls; tier 3 = 60 req/s | Simple, synchronous, idempotent upsert. Fine for a seed script. |
| `POST /v1/users/bulk/identify` | 1 call, up to 1,000 users | Tier 1 = 1 req/s, and it returns a **`BulkOperation` with `status: "processing"`** — it is async, so you cannot rely on users existing when the call returns. https://docs.knock.app/api-reference/users/bulk/identify |
| Inline identification on `trigger` | 0 extra calls | Guarantees recipients are identified **before** the run; requires passing recipient objects, not bare ids. https://docs.knock.app/send-notifications/triggering-workflows/api |

For a 44-row seed, 44 `PUT`s is the honest choice (under a second, synchronous,
and re-runnable). Bulk identify is the right tool for a real import, not for
something you want to await. Inline identification is the right safety net for
notifications triggered for a user who may not have been synced yet.

All three are upserts with deep merge — existing properties are never removed,
only overwritten with `null`. https://docs.knock.app/concepts/users

### Tenants

- A tenant needs only an `id`; a stub is created automatically for any tenant
  id passed on a trigger. https://docs.knock.app/multi-tenancy/overview
- Tenants have **no** relation to users, so "which team is this user in" stays a
  Cadence question, answered at trigger time. That is a feature here: no role
  model to mirror, no drift.
- Tenant tagging scopes feeds and badge counts
  (https://docs.knock.app/multi-tenancy/tenant-scoping). It buys per-tenant
  branding, per-tenant preference defaults, per-tenant translations and
  per-tenant guides — **all Enterprise-only**.
  https://docs.knock.app/manage-your-account/knock-plans
- Therefore: mapping `teams` → Knock tenants is only worth it if a user will
  ever need to filter their inbox by team. Otherwise it is a field nobody reads.

### Role-targeted fanout

There is no "notify everyone with role=admin" primitive. Triggering a workflow
*for an audience* via the API is explicitly not supported yet
(https://docs.knock.app/send-notifications/triggering-workflows/api), and
audiences are a paid-adjacent, sync-fed concept. The supported shapes are:

- pass the recipient list explicitly (`recipients: ["cadence-user-1"]`) — 1
  platform admin, 3 instructors, 40 students are all far under the 1,000 cap;
- or model the thing being acted on as an Object and use subscriptions
  (https://docs.knock.app/concepts/overview).

For Cadence's sizes, the explicit list is the correct answer.

---

## 8. Constraints that matter for a synchronous, no-queue app

**Latency.** Undocumented. The trigger returns after enqueue; the workflow run,
message creation and websocket fan-out all happen after the HTTP response.
Treat "the notification exists" as eventually true, not true-on-return. Do not
put a Knock call inside a SQLite transaction's critical path and expect the
inbox to be consistent with the DB commit.

**Rate limits** — per endpoint tier, scoped by environment (or by environment +
signing user when using a user token). Tiers: 1 = 1 req/s, 2 = 5 req/s,
3 = 60 req/s, 4 = 200 req/s, 5 = 1,000 req/s.
https://docs.knock.app/api-reference/overview/rate-limits

| Endpoint | Tier | Effective limit | Why it matters here |
| --- | --- | --- | --- |
| `POST /v1/workflows/{key}/trigger` | 5 | 1,000 req/s | Not a constraint. |
| `GET /v1/users/{id}/feeds/{id}` | 2 | **5 req/s, per user per environment** | The tightest one. No aggressive polling; the endpoint docs state the limit is always scoped per-user and per-environment. https://docs.knock.app/api-reference/users/feeds/list_items |
| `PUT /v1/messages/{id}/read` | 2 | 5 req/s | Click-per-item read marking can 429 under fast clicking. |
| `POST /v1/messages/batch/read` | 3 | 60 req/s | Use for "mark all". |
| `PUT /v1/users/{id}` | 3 | 60 req/s | Fine for a seed. |
| `POST /v1/users/bulk/identify` | 1 | 1 req/s | Plus async. |

**Batch dedupe.** Batch/bulk endpoints add "1 update / second / entity". When
that trips, Knock still returns `2xx`, returns entities at their *current* state,
and lists the skipped IDs in an `x-ratelimited-{param}` header. So a batch
mark-as-read can partially succeed while looking like a success — read the
header.
https://docs.knock.app/api-reference/overview/batch-rate-limits

**Batching.** Up to 1,000 recipients per trigger, with per-recipient payloads
via `$trigger_data`; no bulk trigger endpoint.
https://docs.knock.app/send-notifications/triggering-workflows/api

**Synchronous request budget.** A single trigger is one outbound HTTPS call. In
a React Router action that is acceptable; in a loop over 40 students it is 40
calls, which is why the recipient array exists. Two things you cannot do
synchronously: bulk identify (async job) and "wait for the notification to
appear" (async run, no completion callback).

**No queue means no retry.** Idempotency keys plus a single in-request retry is
the whole failure budget. Anything stronger needs either a job runner or an
outbox table in Cadence.

---

## 9. What this means for Cadence

### Decisions this research settles

- **The shape of the integration is `trigger` → feed.** Cadence does not write
  notification rows and does not render its own inbox from its own tables. It
  calls `POST /v1/workflows/{key}/trigger` and renders `FeedItem`s.
- **In-app notifications are a workflow channel, not an API.** Every
  notification needs a workflow with a `key` and an in-app channel step, authored
  in the Knock dashboard (or pulled into the repo via the CLI). Copy lives in
  Knock, not in `app/`.
- **Knock owns read state and counts.** `read_at` / `seen_at` / `archived_at` and
  `unread_count` / `unseen_count` come from Knock. Adding `notification_read`
  columns to SQLite would be a second source of truth for something Knock
  already answers.
- **Knock can own the inbox history.** In-app feed items are exempt from the
  30/90-day log retention, so there is no need to mirror message bodies into
  SQLite.
- **Cadence's entity IDs travel in trigger `data`.** That is how a `FeedItem`
  links back to a refund, course or comment. `trigger_data` filters must be flat.
- **44 users fit in one identify pass.** 44 `PUT /v1/users/{id}` calls at 60/s,
  or one bulk identify if you don't mind awaiting an async `BulkOperation`.
  Roles are `properties`, not user types. Team Admin is
  `properties.team_ids` + `team_role`.
- **The free tier covers the whole app.** 10,000 messages/month against 44
  users, unlimited environments, no credit card. Local dev needs a real free
  account — there is no offline mode.
- **A synchronous request can trigger, and must not wait.** A 200 means
  enqueued. Fine for a bell icon, not fine for anything a user is told happened
  because of the notification.
- **No queue means idempotency keys, not retries.** `Idempotency-Key` on the
  trigger, derived from the business event (`refund-approved:refund-7`), 24h
  window, only `2xx` cached.

### Decisions it leaves open

1. **Delivery mode.** In-app only, or in-app plus email/SMS? Cadence already
   has a Postmark transport with a `.outbox/` fallback for refund emails
   (`app/lib/mailer.server.ts`). Knock would duplicate that path if you add an
   email channel. Options: (a) in-app only, Postmark keeps email; (b) move
   refund email into a Knock workflow so one workflow fans out to in-app +
   email; (c) dual-write during a transition, accepting two providers. This
   materially changes the free-tier message arithmetic (email + in-app = 2
   messages per event).
2. **Where read state lives.** Knock-only (recommended by the docs, and the only
   option that makes `unread_count` free) versus mirrored into SQLite (needed
   only if Cadence must query "unread notifications per user" in SQL, e.g. for
   an admin report). Mirroring means consuming message events or polling.
3. **Integration shape — stock components vs. headless.** Dropping in
   `KnockProvider` + `KnockFeedProvider` + `NotificationIconButton` +
   `NotificationFeedPopover` is a day's work but brings Knock's CSS
   (`@knocklabs/react/dist/index.css`), its DOM, and its opinions into a Radix +
   Tailwind 4 app that has its own design language. Headless (`useNotifications`
   + `useNotificationStore`) is more code but renders Cadence components and
   keeps the existing visual system. Neither is settled by the docs.
4. **Where notification copy lives.** Dashboard-authored (fast, non-engineers
   can edit, drifts from the repo) versus CLI-managed `.knock/` directory
   committed to git (reviewable, CI-able, more ceremony).
5. **Tenants or not.** Teams could map to Knock tenants, but per-tenant
   branding/preferences are Enterprise and Cadence's teams are licensing groups,
   not workspaces. Leaving tenants unused is the smaller system; using them
   future-proofs a "filter my inbox by team" feature that does not exist.
6. **SSR mounting.** `@knocklabs/react` has no React Router entrypoint, defaults
   to inline identification during render, and has no documented SSR story.
   Whether the provider is gated with `enabled`, `identificationStrategy="skip"`,
   or a client-only boundary is a Cadence implementation decision.
7. **Preference UI.** Knock can host a preference center (signed URL, `default`
   set only) or Cadence can build one with `usePreferences`. Cadence has no
   notification preferences today, so this is a product decision, not a
   technical one.
8. **Failure visibility.** There is no callback for a failed run. Whether Cadence
   accepts silent failures, polls workflow-recipient-runs, or consumes outbound
   webhooks is open.

---

## Sources

Primary docs (all `docs.knock.app`, fetched 2026-11-19):

- Concepts: [/concepts/overview](https://docs.knock.app/concepts/overview), [/concepts/users](https://docs.knock.app/concepts/users), [/concepts/workflows](https://docs.knock.app/concepts/workflows), [/concepts/channels](https://docs.knock.app/concepts/channels), [/concepts/messages](https://docs.knock.app/concepts/messages)
- In-app: [/integrations/in-app/feeds](https://docs.knock.app/integrations/in-app/feeds), [/in-app-ui/overview](https://docs.knock.app/in-app-ui/overview), [/in-app-ui/feeds/overview](https://docs.knock.app/in-app-ui/feeds/overview), [/in-app-ui/api-overview](https://docs.knock.app/in-app-ui/api-overview), [/in-app-ui/feeds/socket-behavior](https://docs.knock.app/in-app-ui/feeds/socket-behavior)
- React SDK: [/in-app-ui/react/overview](https://docs.knock.app/in-app-ui/react/overview), [/in-app-ui/react/feed](https://docs.knock.app/in-app-ui/react/feed), [/in-app-ui/react/inbox](https://docs.knock.app/in-app-ui/react/inbox), [/in-app-ui/react/toasts](https://docs.knock.app/in-app-ui/react/toasts), [/in-app-ui/react/headless/feed](https://docs.knock.app/in-app-ui/react/headless/feed), [/in-app-ui/react/sdk/reference](https://docs.knock.app/in-app-ui/react/sdk/reference)
- Security: [/in-app-ui/security-and-authentication](https://docs.knock.app/in-app-ui/security-and-authentication)
- Sending: [/send-notifications/triggering-workflows/api](https://docs.knock.app/send-notifications/triggering-workflows/api), [/send-notifications/triggering-workflows/overview](https://docs.knock.app/send-notifications/triggering-workflows/overview), [/send-notifications/delivering-notifications](https://docs.knock.app/send-notifications/delivering-notifications), [/send-notifications/message-statuses](https://docs.knock.app/send-notifications/message-statuses), [/send-notifications/testing-workflows](https://docs.knock.app/send-notifications/testing-workflows), [/send-notifications/debugging-workflows](https://docs.knock.app/send-notifications/debugging-workflows)
- API reference: [/api-reference/workflows/trigger](https://docs.knock.app/api-reference/workflows/trigger), [/api-reference/users/feeds/list_items](https://docs.knock.app/api-reference/users/feeds/list_items), [/api-reference/users/bulk/identify](https://docs.knock.app/api-reference/users/bulk/identify), [/api-reference/overview/api-keys](https://docs.knock.app/api-reference/overview/api-keys), [/api-reference/overview/rate-limits](https://docs.knock.app/api-reference/overview/rate-limits), [/api-reference/overview/batch-rate-limits](https://docs.knock.app/api-reference/overview/batch-rate-limits), [/api-reference/overview/idempotent-requests](https://docs.knock.app/api-reference/overview/idempotent-requests), [/api-reference/overview/errors](https://docs.knock.app/api-reference/overview/errors)
- Tenants / preferences / ops: [/multi-tenancy/overview](https://docs.knock.app/multi-tenancy/overview), [/multi-tenancy/tenant-scoping](https://docs.knock.app/multi-tenancy/tenant-scoping), [/preferences/overview](https://docs.knock.app/preferences/overview), [/preferences/hosted-preference-center](https://docs.knock.app/preferences/hosted-preference-center), [/version-control/environments](https://docs.knock.app/version-control/environments), [/manage-your-account/knock-plans](https://docs.knock.app/manage-your-account/knock-plans), [/manage-your-account/data-retention](https://docs.knock.app/manage-your-account/data-retention), [/developer-tools/knock-cli](https://docs.knock.app/developer-tools/knock-cli)
- Machine-readable: [OpenAPI 3 spec](https://docs.knock.app/openapi.yaml) (rate-limit tiers per endpoint), [llms.txt index](https://docs.knock.app/llms.txt)

Source and packages:

- Feed client (methods, socket-then-fetch behaviour, defaults): https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/feed.ts
- Feed client options / trigger-data shape: https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/interfaces.ts
- Socket manager (topic naming, join/leave): https://github.com/knocklabs/javascript/blob/main/packages/client/src/clients/feed/socket-manager.ts
- SSR guard for the websocket: https://github.com/knocklabs/javascript/blob/main/packages/client/src/api.ts
- Provider auth lifecycle: https://github.com/knocklabs/javascript/blob/main/packages/react-core/src/modules/core/hooks/useAuthenticatedKnockClient.ts
- npm: https://www.npmjs.com/package/@knocklabs/react, https://www.npmjs.com/package/@knocklabs/client
- Pricing: https://knock.app/pricing

Cadence sources:

- `app/db/schema.ts` (users, teams, team_members, refunds), `app/lib/session.ts`, `app/lib/mailer.server.ts`, `app/components/dev-ui.tsx`, `scripts/seed.ts`, seeded `data.db`.
