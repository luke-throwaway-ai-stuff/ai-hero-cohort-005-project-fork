# Knock CLI / workflows-as-code: primary-source findings

Researched 2026-11-20 against:

- `docs.knock.app` (CLI reference, version control, channels, in-app feed, CI tutorial, management API)
- `schemas.knock.app` (the JSON Schema the CLI writes into resources)
- `github.com/knocklabs/knock-cli` (public CLI source, `main` as of this date, `package.json` version `1.6.3`)
- `github.com/knocklabs/templates` (real workflow directories in the CLI's on-disk format)
- `github.com/knocklabs/knock-cli/pull/762` (readonly-field diff behaviour)

This file states facts only. Where the docs are silent, contradictory, or only answerable from the CLI source, that is called out explicitly.

---

## Short answers

| # | Question | Answer |
| - | -------- | ------ |
| 1 | Install / auth / `knock.json` | `npm i -g @knocklabs/cli` (or Homebrew). Auth via `knock login` (browser OAuth), `--service-token`, `KNOCK_SERVICE_TOKEN`, or `~/.config/knock/config.json`. `knock.json` has **one** documented field, `knockDir`; `knock init` also writes `$schema`. There is **no** `defaultEnvironment` field. Committing it is not discussed. |
| 2 | What `knock pull` writes | One **directory per workflow** under `workflows/<key>/`, containing `workflow.json` plus one subdirectory per channel step with extracted content (for in-app feed: `<step_ref>/markdown_body.md`). JSON is 2-space pretty-printed. Key is the directory name, not a top-level field. |
| 3 | Environments | One committed file set. Environment is selected at command time with `--environment <slug>`; there is no environment-keyed layout and no per-environment override file. Push creates an **uncommitted draft** unless `--commit`; commits are per environment; promotion is `knock commit promote --to=<env>` (commit-level, not workflow-level). |
| 4 | Create vs update | `push` is an **upsert**: creates if the key is absent, updates if present. A workflow that exists only in the dashboard and not in the repo is **left alone**; push never deletes or archives. |
| 5 | Channel steps | Step JSON references the channel by **key**: `"channel_key": "in-app-feed"` + `"channel_type": "in_app_feed"`. Channels are account-level, created only in the dashboard, and "use the same ID for each environment", so one committed file works in every environment and `KNOCK_FEED_CHANNEL_ID` is the same across environments of one account (but differs per account). |
| 6 | Drift / validation | `knock workflow validate` (and `--all`) validates a payload server-side without persisting. There is **no** dry-run, diff, or lint command, and no documented drift detector. `--hide-uncommitted-changes` on pull gets the last committed Knock state, which can be compared to the repo manually. |
| 7 | CI | Documented GitHub Actions tutorial: `KNOCK_SERVICE_TOKEN` secret, `npm i -g @knocklabs/cli`, `knock push ... --commit`, `knock commit promote --to=...`. Failure exit code is **2** (source, not docs). Management-API/CLI rate limits are **not documented**; the general rate-limit page describes per-endpoint tiers and `429`s. |
| 8 | Dashboard edits after push | A member can still edit in the dashboard. The next `knock push` upserts the full payload and overwrites the draft; there is no merge/conflict check documented. No per-workflow lock exists; the nearest controls are account-level roles/permissions. |
| 9 | In-app template shape | `template` is `{ markdown_body, action_url, action_buttons[] }` — **no blocks array**. By default the body is extracted to `markdown_body.md`, so multi-line Liquid-markdown lives in a real `.md` file. `action_url` may be Liquid (e.g. `{{ data.linkPath }}`). Inline JSON needs escaped `\"` around Liquid filter arguments. |

---

## 1. Install, authentication, `knock.json`

### Install

Two documented install paths:

```bash
npm install -g @knocklabs/cli
brew install knocklabs/tap/knock
```

Source: <https://docs.knock.app/cli/overview/installation> and <https://docs.knock.app/developer-tools/knock-cli>.

**Node version is documented inconsistently:**

| Source | Requirement |
| ------ | ----------- |
| CLI install docs | "Node.js: 16.14.0 or higher", "NPM: 7.18.1 or higher" — <https://docs.knock.app/cli/overview/installation> |
| CI tutorial | "The Knock CLI requires a Node.js version >= 20.19.0" — <https://docs.knock.app/tutorials/integrating-into-cicd> |
| `@knocklabs/cli` `package.json` (`engines`) | `"node": ">=24"` — <https://github.com/knocklabs/knock-cli/blob/main/package.json> |
| Knock's own agent skill | "requires Node.js 18+" — <https://github.com/knocklabs/templates/blob/main/.agents/skills/knock-cli/rules/cli-installation-authentication.md> |

The authoritative value for the installed package is `engines.node >= 24` in `package.json` (v1.6.3).

### Authentication

- `knock login` opens a browser and authorizes the CLI against your Knock account. `knock whoami` verifies. `knock logout` clears it. The OAuth session is stored in the user config directory (`UserConfigStore`, `userSession.accessToken` / `refreshToken`). Source: <https://docs.knock.app/cli#authentication>, <https://github.com/knocklabs/knock-cli/blob/main/src/lib/user-config.ts>.
- Service tokens: `knock whoami --service-token=YOUR_SERVICE_TOKEN`. Tokens start with `knock_st_`; only owners/admins can create them and they inherit that user's full management privileges. Source: <https://docs.knock.app/developer-tools/service-tokens>.
- Config file: `~/.config/knock/config.json` (macOS/Unix) or `%LOCALAPPDATA%\knock` (Windows):

```json
{
  "serviceToken": "YOUR_SERVICE_TOKEN"
}
```

Source: <https://docs.knock.app/cli#authentication>.

- **Environment variable `KNOCK_SERVICE_TOKEN` is supported but not mentioned on the docs page.** The CLI declares it on the global flag:

```ts
"service-token": Flags.string({
  summary: "The service token to authenticate with.",
  required: false,
  multiple: false,
  env: "KNOCK_SERVICE_TOKEN",
}),
```

Source: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/base-command.ts>. The precedence comment in that file is: flag → env var → user config file. The CI tutorial relies on the env var (it never passes `--service-token`), so the env var is real and is the documented-in-practice CI path. Source: <https://docs.knock.app/tutorials/integrating-into-cicd>.

### `knock.json`

Documented example:

```json
{
  "knockDir": ".knock"
}
```

Source: <https://docs.knock.app/cli#configuring-your-project>, <https://docs.knock.app/developer-tools/knock-cli#working-with-a-knock-json-file>.

The actual accepted schema is a zod object with exactly one key:

```ts
const projectConfigSchema = z.object({
  knockDir: z.string(),
});
```

Source: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/helpers/project-config.ts>.

`knock init` writes this file (2-space JSON), adding `$schema`:

```json
{
  "$schema": "https://schemas.knock.app/cli/knock.json",
  "knockDir": ".knock"
}
```

Source: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/init.ts>.

Facts and gaps:

- **Full field list: `knockDir` only.** `$schema` is written by `knock init` but is not in the zod schema (unknown keys are stripped by zod's default behaviour), and `defaultEnvironment` does not exist anywhere in the CLI, schema, or docs. The default environment is resolved at runtime from the account (the docs say "the account's default environment").
- `knock.json` is found by walking **up** from the current directory (`find-up`), but a relative `knockDir` is resolved against **`process.cwd()`**, not the file's location. The docs say this explicitly, and the source does `path.resolve(process.cwd(), projectConfig.knockDir)`. This contradicts Knock's own agent skill, which says "The `knockDir` is relative to the location of `knock.json`". Sources: <https://docs.knock.app/cli#configuring-your-project>, <https://github.com/knocklabs/knock-cli/blob/main/src/lib/helpers/project-config.ts>, <https://github.com/knocklabs/templates/blob/main/.agents/skills/knock-cli/rules/knock-directory-structure.md>.
- **Whether `knock.json` should be committed is never stated.** The CI tutorial only says to have "your Knock resources checked in to a `.knock` directory in your repository". `knock init` does not write a `.gitignore`, and `knock.json` contains no secrets (the service token lives in the user config file, not the project file). Sources: <https://docs.knock.app/tutorials/integrating-into-cicd>, <https://github.com/knocklabs/knock-cli/blob/main/src/commands/init.ts>.
- Without `knock.json`, `knock pull`/`knock push` require `--knock-dir`; resource commands such as `knock workflow pull` default to the current working directory or `--workflows-dir`. Source: <https://docs.knock.app/developer-tools/knock-cli#working-with-a-knock-json-file>.

---

## 2. What `knock pull` writes to disk

### Layout

One **directory per workflow**, named by the workflow key, plus one subdirectory per channel step that has extracted content:

```
workflows/
└── my-workflow/
    ├── email_1/
    │   ├── visual_blocks/
    │   │   └── 1.content.md
    │   └── visual_blocks.json
    ├── in_app_feed_1/
    │   └── markdown_body.md
    └── workflow.json
```

Source: <https://docs.knock.app/cli/workflow/file-structure> (also <https://docs.knock.app/cli/workflow>). The whole knock dir also gets `audiences/`, `goals/`, `guides/`, `layouts/`, `message-types/`, `partials/`, `reusable-requests/`, `schemas/`, `translations/` — <https://docs.knock.app/cli/overview/directory-structure>.

So: **not one file per workflow** — a `workflow.json` plus extracted template files. "Each workflow directory ... contains individual folders for each of the channel steps ... that hold additional content and formatting data." (same page)

### `workflow.json` shape

Real pulled file (from Knock's public templates repo, which is in CLI on-disk format):

```json
{
  "name": "Comments",
  "steps": [
    {
      "channel_key": "in-app-feed",
      "channel_type": "in_app_feed",
      "description": "Send comment notification",
      "name": "In-app feed",
      "ref": "in_app_feed_1",
      "template": {
        "action_url": "{{ vars.app_url }}/pages/{{page_id}}",
        "markdown_body@": "in_app_feed_1/markdown_body.md"
      },
      "type": "channel"
    }
  ],
  "trigger_frequency": "every_trigger",
  "__readonly": {
    "environment": "development",
    "key": "comments",
    "active": true,
    "valid": true,
    "created_at": "2022-01-06T18:42:01.690070Z"
  },
  "$schema": "https://schemas.knock.app/cli/workflow.json"
}
```

Source: <https://github.com/knocklabs/templates/blob/main/workflows/comments/workflow.json>. That file predates the current CLI; current CLI removes `environment` and `created_at` from `__readonly` (see below).

Current CLI behaviour, from `prepareResourceJson`:

- Read-only server fields are moved into a `__readonly` object.
- `sha`, `updated_at`, `environment`, `created_at` are deleted outright, with the source comment "Volatile fields that change per-branch or over time, excluded to avoid noisy diffs".
- `$schema` is appended last.
- All `__annotation` metadata is stripped.

Sources: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/marshal/shared/helpers.isomorphic.ts>, <https://github.com/knocklabs/knock-cli/pull/762> ("feat: exclude environment and created_at from serialized __readonly fields ... This caused every resource file to appear changed in Git diffs").

The CLI's own unit test asserts the resulting `__readonly` is:

```json
"__readonly": { "key": "new-comment", "active": false, "valid": false }
```

Source: <https://github.com/knocklabs/knock-cli/blob/main/test/lib/marshal/workflow/processor.test.ts>.

The key itself is **not** a normal top-level field: it is the directory name, and the CLI injects it on push (`{ ...workflow.content, key: workflow.key }`). Docs for sibling resources state the pattern explicitly ("Pulled files store it under `__readonly.key`"). Sources: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/workflow/push.ts>, <https://docs.knock.app/cli/reusable-request/file-structure>, <https://docs.knock.app/cli/workflow/file-structure> ("stored in directories named by their workflow key").

The machine-readable schema at <https://schemas.knock.app/cli/workflow.json> has top-level properties `categories, conditions, description, exit_criteria, name, settings, steps, tags, trigger_data_json_schema, trigger_events, trigger_frequency` and `"required": ["name", "steps"]` — no `key`, no `__readonly`.

### Is Liquid/markdown inline in the JSON?

**Both forms are legal; extraction is the default.**

- `--` the API/CLI writes `"markdown_body@": "in_app_feed_1/markdown_body.md"` and puts the content in that file.
- Inline `"markdown_body": "..."` is also accepted. The schema's `markdown_body@` description says "Either use this field (a path) or `markdown_body`, but not both." Source: <https://schemas.knock.app/cli/workflow.json> (`InAppFeedTemplate`).
- **Schema quirk:** `InAppFeedTemplate.properties` lists `action_buttons`, `action_url`, `markdown_body@`, `action_url@` — it does **not** list the inline `markdown_body`, even though its own `example` uses `"markdown_body": "Hello, world!"` and its description references `#/$defs/markdown_body` (which does not exist in the document). `additionalProperties` is not `false`, so an inline body still validates. The same schema's `WorkflowInAppFeedStep.example` also shows an inline `markdown_body`.
- Extraction happens by field annotation from the API (`extractable_fields`), and by default for `markdown_body` (`file_ext: "md"`). Source: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/marshal/shared/steps.isomorphic.ts>, plus the scaffold generator which sets `["markdown_body" + FILEPATH_MARKER]: templateFilePath` — <https://github.com/knocklabs/knock-cli/blob/main/src/lib/marshal/workflow/generator.ts>.

### Stability / git-diff friendliness

- Files are written with `fs.outputJson(..., { spaces: 2 })`; extracted text files are written verbatim. Source: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/marshal/workflow/writer.ts>.
- The CLI does **not** sort keys. In every real pulled example and every management-API response, keys appear alphabetically (`channel_key`, `channel_type`, `description`, `name`, `ref`, `template`, `type`; template `action_url`, `markdown_body@`), because that is the order the API serializes. Sources: <https://github.com/knocklabs/templates/blob/main/workflows/comments/workflow.json>, <https://docs.knock.app/mapi-reference/workflows/upsert>.
- Volatile fields are deliberately stripped to reduce diff noise (quote above), and the project has shipped at least two fixes specifically for noisy diffs (`sha`/`updated_at` earlier, `environment`/`created_at` in PR #762).
- **Caveat:** `knock push` rewrites the local workflow directory from the server response (`writeWorkflowDirFromData(..., { withSchema: true })`). So pushing can change files locally (first push adds `$schema`, refreshes `__readonly.active`/`valid`, and re-extracts). Source: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/workflow/push.ts>.

---

## 3. Environment targeting, versions, promotion

### One file set, environment at command time

- `--environment <slug>` exists on every workflow command; when omitted the CLI uses "the account's default environment". Before environments are enabled that is production; after enabling environments, development becomes the default. Sources: <https://docs.knock.app/cli/workflow/push>, <https://docs.knock.app/version-control/environments#what-changes-when-you-enable-environments>.
- There is **no environment-keyed directory layout and no per-environment override file**. `workflow.json` contains no `environment` field (it is stripped on pull). The same bytes are pushed to whichever environment you name.
- Branches are the only "alternate target" mechanism: `knock branch switch <slug> [--create]` writes `.knockbranch`, and `--branch` targets it. Branch content lives under development. Sources: <https://docs.knock.app/cli#branches>, <https://docs.knock.app/version-control/branches>.
- The environments docs explicitly endorse using the CLI to move one file set between environments: "use the CLI or Management API to pull production resources and push them to development in bulk". Source: <https://docs.knock.app/version-control/environments#what-changes-when-you-enable-environments>.
- Docs also state the model that constrains this: "Content can be created in any environment. Content can be promoted upwards through environments. Content can only be edited in the environment in which it was created." Source: <https://docs.knock.app/version-control/environments#create-content-in-environments>.

### Push vs commit

- `knock push` upserts and leaves the change **uncommitted** (a draft) unless you pass `--commit`. Flags: `--commit`, `-m/--commit-message`, `--allow-empty`. Source: <https://docs.knock.app/cli/workflow/push>.
- "A commit is not a save ... Saved changes ... do not apply to workflow runs ... invoked through the API. To test changes through the API, you must commit them." Source: <https://docs.knock.app/version-control/commits>.
- Commits are per environment. `knock commit` commits all changes in the target/default environment (optionally scoped with `--resource-type` / `--resource-id`). `knock commit list`, `knock commit get <id>`. Source: <https://docs.knock.app/cli#commits>.
- Promotion is commit-level, not workflow-level: `knock commit promote --to=production` (promotes everything from the immediately preceding environment) or `--only=<commit_id>`. **There is no `knock workflow promote` command.** The CLI's workflow commands are only `activate, generate-types, get, list, new, open, pull, push, run, validate`. Sources: <https://docs.knock.app/cli#promote-changes>, <https://github.com/knocklabs/knock-cli/tree/main/src/commands/workflow>.
- `--allow-empty` (with `--commit`) creates a new version with identical content so an unchanged resource can still be promoted. Source: <https://docs.knock.app/version-control/commits#empty-commits>.
- `knock workflow activate --environment=<env> [--status=false]` toggles activation immediately, without promotion. `active` is read-only in `workflow.json`, so pushing does not activate a workflow. Source: <https://docs.knock.app/cli/workflow#activate-workflow>.

### Cross-environment write restriction

The management API documents a server-side environment check on upsert:

> "The write targets the environment in the request. Accounts that allow writes in every environment can create and update in that environment. Pass `force` to write outside the request's origin environment. When writes are limited to development, this endpoint accepts the development environment unless `force` is set."
>
> `force`: "forces the upsert to override existing content regardless of environment restrictions. This bypasses the development-only environment check and origin environment checks."

Source: <https://docs.knock.app/mapi-reference/workflows/upsert>.

So a push into an environment that is not the resource's "origin environment", or into production when the account limits writes to development, can require `--force`. The docs never define "origin environment" precisely, and the CLI flag help only says "Force pushes ... overwriting whatever is currently stored" (<https://docs.knock.app/cli/workflow/push>). This is the one place where the CLI help and the API reference describe the same flag differently.

---

## 4. Creating vs updating; dashboard-only workflows

- Upsert semantics: "Knock will update an existing workflow by the matching workflow key, or create a new workflow if it does not exist yet." Source: <https://docs.knock.app/cli/workflow/push>. Same wording in the management API: "Updates a workflow of a given key, or creates a new one if it does not yet exist." Source: <https://docs.knock.app/mapi-reference/workflows/upsert>.
- No dashboard pre-creation is required.
- A workflow that exists in the dashboard but not in the repo is **not deleted or archived**. `knock workflow push --all` enumerates directories on disk and upserts each; nothing iterates the remote collection. There is no `workflow delete`/`archive` command at all in the CLI (management API has archive/unarchive, the CLI does not). Sources: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/workflow/push.ts>, <https://github.com/knocklabs/knock-cli/blob/main/src/commands/push.ts>, <https://github.com/knocklabs/knock-cli/tree/main/src/commands/workflow>.
- Conversely, `knock pull --all` **does prune local directories** that no longer exist remotely (`pruneWorkflowsIndexDir` removes any local workflow dir whose key is not in the fetched set). Source: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/marshal/workflow/writer.ts>.
- Push validates every workflow first and aborts on the first error; a bulk `knock push` pushes resource types sequentially and can leave a partially pushed state on failure (explicit source comment). Source: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/push.ts>.

---

## 5. Channel steps and the in-app channel

### How the step references the channel

By **key**, not UUID:

```json
{
  "type": "channel",
  "ref": "in_app_feed_1",
  "channel_key": "in-app-feed",
  "channel_type": "in_app_feed",
  "template": { "...": "..." }
}
```

Sources: <https://github.com/knocklabs/templates/blob/main/workflows/comments/workflow.json>, schema `WorkflowInAppFeedStep` at <https://schemas.knock.app/cli/workflow.json> ("The key of a specific configured channel instance (e.g., 'knock-email', 'postmark', 'sendgrid-marketing')"), <https://docs.knock.app/mapi-reference/workflows/upsert> (example uses `"channel_key": "in-app-feed"`).

`channel_key` and `channel_group_key` are mutually exclusive; one is required for a valid channel step (schema description).

### Creation and cross-environment identity

- Channels are created and managed **only in the dashboard**: "You can create and manage channels within Knock from the dashboard ... only admins and owners on an account can manage channels." Source: <https://docs.knock.app/concepts/channels#managing-channels>.
- The same page: "A created channel exists across all environments in your Knock account and **uses the same ID for each environment**."
- The CLI can only list channels (`knock channel list`); there is no create command. Source: <https://docs.knock.app/cli#channels>.
- Channel **settings/credentials** are per environment and are not versioned: "you'll need to configure each channel per environment"; "channel settings are never versioned". Source: <https://docs.knock.app/concepts/channels#channel-settings>.
- Therefore:
  - one committed `"channel_key": "..."` works in every environment of an account;
  - the in-app feed **channel ID** (the UUID the React SDK takes as `feedId` / `KNOCK_FEED_CHANNEL_ID`) is the same across environments of that account, because the channel is the same account-level object;
  - it **differs per Knock account**, so each developer's own free account has a different channel ID.
- The React docs confirm `KNOCK_FEED_CHANNEL_ID` is "the channel ID for the in-app feed", copied from "Channels and sources": <https://docs.knock.app/in-app-ui/react/feed>.
- If a channel key does not exist, validation fails; `knock workflow new` falls back to the literal placeholder `"<IN_APP_FEED CHANNEL KEY>"` when the account has no in-app feed channel, and the source's own guidance is "Run `knock channel list` to get valid `channel_key` values" before creating workflows. Sources: <https://github.com/knocklabs/knock-cli/blob/main/src/lib/marshal/workflow/generator.ts>, <https://github.com/knocklabs/templates/blob/main/.agents/skills/knock-cli/SKILL.md>.

---

## 6. Validation, drift detection, dry runs

### Exists

- `knock workflow validate <key>` and `knock workflow validate --all --workflows-dir=<dir>`: "Knock will validate the given workflow payload in the same way as it would with the `workflow push` command, except without persisting those changes." Source: <https://docs.knock.app/cli/workflow/validate>.
- Equivalent `validate` commands exist for audiences, broadcasts, layouts, goals, guides, message types, partials, reusable requests.
- `knock workflow get <key> --json` returns the remote resource (read-only inspection). Source: <https://docs.knock.app/cli/workflow/get>.
- `--hide-uncommitted-changes` on `get`/`list`/`pull` hides drafts and returns the last committed state. Source: <https://docs.knock.app/cli/workflow/pull>.
- The pulled JSON carries `__readonly.valid` (boolean) from the server. Source: <https://github.com/knocklabs/knock-cli/blob/main/test/lib/marshal/workflow/processor.test.ts>.

### Does not exist

- No `--dry-run` on push/pull. (The command/flag list in <https://docs.knock.app/cli> and the `src/commands` tree contain none.)
- No `diff` command, no `lint` command.
- No documented drift detection between dashboard state and repo, and no documented CI check that fails on drift. There is no `knock pull --check` / `--exit-code` analogue.
- The only sanctioned comparison method is indirect: pull into a scratch directory and compare with git (`knock pull --all --knock-dir=<tmp> --hide-uncommitted-changes`, then diff). This is **not documented anywhere**; it is an inference from the available flags, so treat it as undocumented behaviour.
- `knock workflow validate` only checks that the local payload is *valid*, not that it matches the dashboard. It cannot detect dashboard-only edits.

---

## 7. CLI in CI

Documented GitHub Actions pattern (<https://docs.knock.app/tutorials/integrating-into-cicd>):

```yaml
- name: Install Knock CLI
  run: npm install -g @knocklabs/cli

- name: Push and commit changes
  env:
    KNOCK_SERVICE_TOKEN: ${{ secrets.KNOCK_SERVICE_TOKEN }}
  run: |
    knock push --branch=${{ github.ref_name }} --knock-dir=.knock --commit \
      -m "Sync with git commit ${GITHUB_SHA:0:7}"
```

Other documented steps in the same tutorial:

```bash
knock branch switch <git-branch> --create --force
knock branch merge <git-branch> --force
knock commit promote --to=staging
knock commit promote --to=production
knock push --force --commit -m "Revert to git commit <sha>"
```

Facts:

- Service token is passed via the `KNOCK_SERVICE_TOKEN` secret/environment variable; the tutorial never stores it in the repo. Source: same page.
- **Exit codes:** success is `0`; `this.error(...)` exits with **`2`**. The CLI source says so explicitly: `// The same code `this.error` exits with.` above `const EXIT_CODE_FAILED = 2;`. Source: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/agent.ts>. This is not documented on the docs site.
- **Non-interactive use:** many commands prompt for confirmation; `--force` skips the prompt (`pull`, `commit promote`, `branch merge`, `workflow activate`, `asset archive`). `knock push` does not prompt (it validates and pushes). `knock init` and `knock workflow new` are interactive wizards; pass their explicit flags to avoid prompts. Sources: flag help across <https://docs.knock.app/cli>, and Knock's agent skill: <https://github.com/knocklabs/templates/blob/main/.agents/skills/knock-cli/SKILL.md>.
- **Rate limits:** the docs do not document any rate limit specific to the CLI or the Management API. The general API rate-limit page describes per-endpoint tiers (1, 5, 60, 200, 1,000 requests/second), scoped by the authorizing credential/environment, returning `429 Too Many Requests`. Source: <https://docs.knock.app/api-reference/overview/rate-limits>. The management API overview lists only HTTP success/error classes — <https://docs.knock.app/mapi-reference/overview> — and the published OpenAPI operation for workflow upsert carries no rate-limit tier (<https://docs.knock.app/mapi/openapi.json>, checked directly). **Silent on whether the CLI's calls are subject to those tiers.**
- CLI request volume per `knock push`: one `PUT .../validate` plus one `PUT /workflows/{key}` per workflow, done sequentially in a loop; `knock push` (all resources) runs resource types sequentially. Source: <https://github.com/knocklabs/knock-cli/blob/main/src/commands/workflow/push.ts>, <https://github.com/knocklabs/knock-cli/blob/main/src/commands/push.ts>.

---

## 8. Dashboard editing after a push; locks

- A Member (or higher) can edit workflows in the dashboard: "Member. For users who are editing notification workflows and templates in Knock. This role can manage workflows..." Source: <https://docs.knock.app/manage-your-account/roles-and-permissions>.
- Dashboard edits are drafts until committed: "When you make a change to a content resource in the Knock dashboard, you save it as a draft. You need to commit the draft before it goes live." Source: <https://docs.knock.app/version-control/commits>.
- The next `knock push` sends the full workflow payload from disk and upserts it, replacing the draft. There is **no documented merge, conflict detection, or "remote is newer" check**. The CLI flag help describes `--force` as "overwriting whatever is currently stored", which implies plain push already overwrites the stored resource; the API reference describes `force` only as bypassing environment restrictions (see §3). Sources: <https://docs.knock.app/cli/workflow/push>, <https://docs.knock.app/mapi-reference/workflows/upsert>.
- The closest thing to a warning in the docs is about the reverse direction: "any uncommitted changes pushed to Knock can be overwritten by another user working on the same resource. Always commit changes you want to persist." Source: <https://docs.knock.app/tutorials/integrating-into-cicd>.
- **No lock or per-workflow read-only mode exists.** Available account-level controls:
  - "Modify resources in any environment" disabled → every environment except development is read-only for members; they create in development and promote. Source: <https://docs.knock.app/version-control/environments#modify-resources-in-any-environment>.
  - `Support` role: view-only. `Production-only member`: production only. Source: <https://docs.knock.app/manage-your-account/roles-and-permissions>.
  - Custom permission groups (Enterprise) can grant `View` or `Manage` per environment for Workflows/Content/Release management. Source: same page.
- Docs are **silent** on what happens if a dashboard draft and a repo push both changed the same template; the observable behaviour of an upsert is "last write wins" on the whole resource.

---

## 9. In-app feed template shape, multi-line copy, Liquid

### Shape

The in-app feed template is a flat object, not a blocks array:

```json
"template": {
  "markdown_body": "Hello **{{ recipient.name }}**",
  "action_url": "{{ data.linkPath }}",
  "action_buttons": [{ "label": "View", "action": "{{ data.linkPath }}" }]
}
```

Schema (`InAppFeedTemplate`): properties `action_buttons` (array of `{label, action}`), `action_url` (nullable string, "The URL to navigate to when the in-app feed is tapped. Can be omitted for multi-action templates"), `markdown_body@` / `action_url@` (file pointers). The inline `markdown_body` is used by the schema's own `example` and by every API example, but is missing from `properties` (see §2). Source: <https://schemas.knock.app/cli/workflow.json>.

Docs: "Your in-app notification template has three variants: Standard ... Single-action ... Multi-action." Source: <https://docs.knock.app/integrations/in-app/feeds#template-variants>.

There is **no `blocks` array for in-app feed**. Visual blocks / `visual_blocks.json` are the email editor's representation (see the email example in <https://docs.knock.app/cli/workflow/file-structure>). In-app content is markdown.

### Multi-line copy

By default the markdown body is extracted to a real file:

```
workflows/<key>/in_app_feed_1/markdown_body.md
```

referenced from JSON as `"markdown_body@": "in_app_feed_1/markdown_body.md"`. The file contains literal newlines, Liquid tags, blockquotes, etc. Real example (a multi-line `{% if %}` template): <https://github.com/knocklabs/templates/blob/main/workflows/comments/in_app_feed_1/markdown_body.md>.

Inline `"markdown_body": "line 1\nline 2"` is also accepted by the schema ("Either use this field (a path) or `markdown_body`, but not both").

### Action URL and Liquid

- Documented: "The action URL is the URL that will be opened when a user clicks on the notification cell ... You can provide a static URL, or configure a dynamic URL using a Liquid variable." Source: <https://docs.knock.app/integrations/in-app/feeds#action-url>.
- `data.*` is the trigger payload namespace: "All variables sent in the `data` payload of your workflow trigger call ... reference this as `{{ data.a_variable }}`". Source: <https://docs.knock.app/template-editor/overview#data-payload-variables>.
- Real example of a dynamic action URL: `"action_url": "{{ vars.app_url }}/pages/{{page_id}}"` (<https://github.com/knocklabs/templates/blob/main/workflows/comments/workflow.json>) and `"action_url": "{{ data.onboarding_url }}"` (<https://docs.knock.app/mapi-reference/workflows/schemas/workflow>). `{{ data.linkPath }}` is therefore a supported shape.
- Multi-action buttons take the same Liquid strings in `action`.

### Escaping gotchas

- JSON strings still obey JSON escaping: a Liquid filter with double-quoted arguments must escape them:
  `"subject": "{{ total_activities | pluralize: \"alert\", \"alerts\" }}"`.
  Real example: <https://github.com/knocklabs/templates/blob/main/workflows/alerts/workflow.json>.
- Putting the body in `markdown_body.md` avoids JSON escaping entirely (quotes, newlines, backslashes all literal). This is the default pull/scaffold format.
- Docs are **silent** on any special escaping rules for Liquid inside JSON beyond ordinary JSON string rules. There is no documented alternative delimiter for Liquid.
- `action_url` may be an empty string to disable the click action (real example: `"action_url": ""` in <https://github.com/knocklabs/templates/blob/main/workflows/alerts/workflow.json>).

---

## Documented contradictions and silences (consolidated)

| Topic | What conflicts / is missing | Sources |
| ----- | --------------------------- | ------- |
| Node version | Docs 16.14+, CI tutorial 20.19+, package `engines` `>=24`, agent skill 18+ | install docs, CI tutorial, `package.json`, skill |
| `knockDir` resolution | CLI docs + source resolve relative to **cwd**; agent skill says relative to `knock.json` | CLI docs, `project-config.ts`, skill |
| `knock.json` fields | Only `knockDir` exists; no `defaultEnvironment`; `$schema` written by `init` but not in schema | CLI docs, `project-config.ts`, `init.ts` |
| `knock.json` commit policy | Never stated | — |
| `--force` meaning | CLI help: "overwriting whatever is currently stored"; API reference: bypasses environment/origin checks, not a concurrency guard | CLI docs, mAPI upsert |
| Dashboard edit vs push | Docs never say what a push does to a newer dashboard draft, or whether any conflict check exists | — |
| Drift detection | No diff/dry-run/lint; no documented CI drift check | CLI reference |
| Rate limits | General tier page exists for the Knock API; nothing specific to Management API or CLI | rate-limits page, mAPI overview |
| Exit codes | Only discoverable from CLI source (`2`); not documented | `agent.ts` |
| `knock auth login` | Agent skill says `knock auth login`; the actual command is `knock login` (no `auth` topic in `src/commands`) | skill vs `src/commands/login.ts` |
| Layout dir/command names | Agent skill says `email-layouts/` and `knock email-layout push`; CLI/docs use `layouts/` and `knock layout push` | skill vs CLI directory-structure docs |
| `in-app-feed` vs `in_app_feed` | `knock workflow new --steps` examples use `in-app-feed`; the CLI normalizes to the canonical `in_app_feed` | CLI workflow docs, `generator.ts` tests |
| Node `engines` vs docs | The published package would refuse Node 16/18/20 even though docs say 16.14+ / 20.19+ | `package.json` |

---

## Appendix: exact commands referenced

```bash
# install + auth
npm install -g @knocklabs/cli
knock login
knock whoami
export KNOCK_SERVICE_TOKEN=knock_st_...

# pull one / all
knock workflow pull refund-requested --environment=development
knock pull --all --knock-dir=.knock --environment=development

# push one / all (upsert + optional commit)
knock workflow push refund-requested --commit -m "Add refund-requested workflow"
knock push --knock-dir=.knock --environment=production --commit -m "Deploy"

# validate without persisting
knock workflow validate refund-requested
knock workflow validate --all --workflows-dir=.knock/workflows

# commits / promotion
knock commit list --environment=development --no-promoted
knock commit promote --to=production
knock commit promote --only=<commit-id>

# activation (not covered by push)
knock workflow activate refund-requested --environment=production

# discovery
knock channel list
knock environment list
```
