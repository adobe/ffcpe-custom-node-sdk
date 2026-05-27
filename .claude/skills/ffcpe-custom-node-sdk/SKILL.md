---
name: ffcpe-custom-node-sdk
description: >-
    Helps Adobe App Builder developers build FFCPE (Firefly Creative Production for Enterprise) custom actions using
    @adobe/ffcpe-custom-node-core and @adobe/ffcpe-custom-node-app-builder (OpenWhisk web + worker actions, Hono,
    submit/status HTTP contract, inputs/outputs, IMS-aware routes). Use when the user is wiring a
    custom-action app in App Builder, implementing FfcpeNodeWorkerHandler, mounting routes with
    mountFfcpeNodeRoutes, configuring raw-http OpenWhisk actions, debugging submit/statusUrl polling,
    handling Text/Image/Video/Json inputs, or producing action outputs for run-workflow.
---

# FFCPE custom actions on App Builder (`@adobe/ffcpe-custom-node-core`, `@adobe/ffcpe-custom-node-app-builder`)

## Audience

Use this skill when assisting **consumers** of the NPM packages: teams shipping an App Builder application that Workflow Builder invokes as a **`custom-action`** (async submit + status polling).

For **contributing to the SDK source repository** (monorepo, Turbo, releases), see **`README.md`** (“Monorepo (contributors)”) and **`CONTRIBUTING.md`** next to the SDK sources (internal mirror or published repo checkout).

## Install packages

with **npm**:

```bash
npm install @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder
```

or **pnpm** — set **`auto-install-peers=true`** in the app’s **`.npmrc`**, then:

```bash
pnpm add @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder
```

**Explicit peers** — if you prefer every peer in **`package.json`**, or your tool does not auto-install peers (e.g. Yarn Classic):

```bash
npm install @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder hono hono-openwhisk-adapter
```

```bash
pnpm add @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder hono hono-openwhisk-adapter
```

Typical peers (confirm versions against your template and Adobe docs):

- `@adobe/aio-lib-core-logging`, `@adobe/aio-lib-state`, `@adobe/aio-lib-ims`, `openwhisk`, `hono`, `hono-openwhisk-adapter`

## Link a local SDK checkout (`pnpm link`)

Use this when the consumer app should load **`@adobe/ffcpe-custom-node-core`** / **`@adobe/ffcpe-custom-node-app-builder`** from a nearby clone of the SDK monorepo instead of the registry.

1. In the SDK monorepo (after **`pnpm install`**), build **`dist/`** for both packages:

    ```bash
    pnpm run build
    ```

    For tight iteration, run **`pnpm run dev`** from the SDK root so **`dist/`** rebuilds on change.

2. In **the consumer App Builder project**, link **core** first, then **app-builder**, using absolute or relative paths to those package directories:

    ```bash
    pnpm link /path/to/ffcpe-custom-node-sdk/packages/core
    pnpm link /path/to/ffcpe-custom-node-sdk/packages/app-builder
    ```

3. To restore registry packages:

    ```bash
    pnpm unlink @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder
    pnpm install
    ```

**Optional global link:** register each package with **`pnpm link --global`** from **`packages/core`** and **`packages/app-builder`**, then in the consumer **`pnpm link --global @adobe/ffcpe-custom-node-core`** and **`pnpm link --global @adobe/ffcpe-custom-node-app-builder`**. If **`workspace:*`** fails to resolve for app-builder, keep using directory **`pnpm link /path/to/...`** or add a consumer **`pnpm.overrides`** pinning **`@adobe/ffcpe-custom-node-core`** to the **`packages/core`** path.

Full wording lives next to install instructions in the SDK **`README.md`** (“Use a local SDK checkout”).

## Install this skill (Claude Code)

The skill is the directory **`ffcpe-custom-node-sdk`** containing **`SKILL.md`** and **`references/`**. Install it either **inside the consumer repo** (team-friendly, version with git) or **globally** on the machine (all projects).

### A. Consumer repo (project-local)

1. Open a terminal at the **root of the consumer repository** (where **`package.json`** lives).
2. Create the skills folder if needed:

    ```bash
    mkdir -p .claude/skills
    ```

3. Install the skill **either** by copy **or** by symlink (symlink stays updated when the SDK repo changes):

    ```bash
    # Copy (snapshot)
    cp -R /path/to/ffcpe-custom-node-sdk/.claude/skills/ffcpe-custom-node-sdk .claude/skills/

    # Symlink (live updates from SDK checkout; adjust relative path)
    ln -s ../../ffcpe-custom-node-sdk/.claude/skills/ffcpe-custom-node-sdk .claude/skills/ffcpe-custom-node-sdk
    ```

4. Confirm **`SKILL.md`** exists at **`.claude/skills/ffcpe-custom-node-sdk/SKILL.md`**.
5. Commit **`.claude/skills/`** if teammates should get the same guidance via git.

### B. Global (user-wide)

1. Ensure the global skills directory exists:

    ```bash
    mkdir -p ~/.claude/skills
    ```

2. Link or copy the skill folder from the SDK checkout:

    ```bash
    ln -s "/absolute/path/to/ffcpe-custom-node-sdk/.claude/skills/ffcpe-custom-node-sdk" ~/.claude/skills/ffcpe-custom-node-sdk
    ```

3. Restart Claude Code if it does not pick up new skills immediately.

### Using the skill in Claude Code

Reference the skill by id **`ffcpe-custom-node-sdk`** (matches **`name`** in **`SKILL.md`** frontmatter): attach it to a session, select it from the Skills UI, or invoke it per the Claude Code docs for your client version. After edits to **`SKILL.md`**, reload or start a new conversation so the updated instructions load.

## Two OpenWhisk actions (recommended shape)

1. **Web action** — HTTP entry for FFCPE: **`POST /submit`**, **`GET /status`**. Build a Hono app, call **`mountFfcpeNodeRoutes`**, export **`main`** with **`ToOpenWhiskAction`** from **hono-openwhisk-adapter**.
2. **Worker action** — Long-running job: export **`main`** from **`createFfcpeNodeWorker(handler, options)`**.

Use **`ext.config.yaml`** (or equivalent) so the **web** action uses **`raw-http: true`** and **`web-export: raw`** as required by **hono-openwhisk-adapter**. Match **`worker`** / **`web`** package and action **names** to what **`mountFfcpeNodeRoutes`** receives.

## Web route wiring (`mountFfcpeNodeRoutes`)

- Pass **`worker: { package, name }`** — target for async OpenWhisk invoke after submit.
- Pass **`web: { package, name }`** — **required**; used to build **`statusUrl`** returned to Workflow Builder. Omitting or empty strings throws at mount time.
- Optional **`routes`** — defaults **`/submit`** and **`/status`**; align with catalog **`submitEndpoint`** / **`statusEndpoint`** paths.
- Optional **`authenticate`** — defaults to IMS bearer + `x-api-key` via **`createImsInboundAuth`**. Pass **`null`** to disable auth on those routes (only if product/security allows).
- Optional **`jobStore`**, **`loggerName`**, **`jobMetadata(submit)`** — advanced; default store is aio-lib-state-backed.

## Worker handler (`createFfcpeNodeWorker`)

- Implement **`FfcpeNodeWorkerHandler`**: async **`({ jobId, inputs, params, logger, authContext, args })`** — **`inputs`** is the validated FFCPE **`input[]`**; **`params`** is workflow parameters from run-workflow (submit **`parameters`**); **`args`** is the full worker invocation object (**OpenWhisk `main(args)`**).
- Return **`{ status: "completed", outputs?: ActionOutput[] }`** or **`{ status: "failed", error: string }`**.
- Use **`requiredInputNames`** in options to fail fast when submit payloads omit named inputs.
- Throw **`FfcpeJobFailedError`** only when intentionally mapping failures to the SDK’s failed-job behavior (the adapter already maps handler **`failed`** results).

Prefer **`findInputByName`**, **`getTextInput`**, etc., from **`@adobe/ffcpe-custom-node-core`**, and narrow with **`TextInput`**, **`ImageInput`**, **`VideoInput`**, **`JsonInput`**. Build outputs with **`createTextOutput`**, **`createImageOutput`**, **`createVideoOutput`**, **`createJsonOutput`** (and related helpers).

## HTTP contract (what Workflow Builder expects)

Workflow Builder **POST**s **`{ inputs, parameters }`** to **`submitEndpoint`** and polls status until **`completed`** or **`failed`**. Submit responses should include **`jobId`**, **`status`**, and ideally **`statusUrl`** for polling.

For header rules, response fields, and polling semantics, read **`docs/custom-action-requests.md`** from the SDK documentation bundle or source tree (same material ships beside the repo README for maintainers).

## Security and robustness (custom-action authors)

- Treat **`inputs`** and **`parameters`** as **untrusted**; validate types, sizes, and URLs before fetching or processing assets.
- Never log **tokens**, **API keys**, or raw **Authorization** headers; keep **`Logger`** output minimal.
- Use **HTTPS** asset URLs where possible; fail closed on suspicious schemes or redirects if implementing custom fetch logic outside the SDK.
- Keep auth enabled on submit/status unless there is an explicit, reviewed reason to pass **`authenticate: null`**.

## Advanced / escape hatches

- **Core-only HTTP** — **`handleFfcpeSubmit`**, **`handleFfcpeStatus`**, or **`runWorkerJob`** when not using Hono (still need **`JobStore`**, **`JobOrchestrator`**, **`InboundAuth`**, status URL builder).
- **Custom orchestration or storage** — implement core ports (**`JobStore`**, **`JobOrchestrator`**) and mirror the checklist in the upstream README section “Implementing for a different Cloud Functions Provider” (same ideas apply when forking adapter behavior).

## Quick lookup

For import cheat sheets, **`pnpm link`**, and troubleshooting (status URL, raw HTTP), see [references/quick-reference.md](references/quick-reference.md).
