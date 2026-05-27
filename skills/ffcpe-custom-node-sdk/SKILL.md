---
name: ffcpe-custom-node-sdk
description: >-
    Helps Adobe App Builder developers build FFCPE (Firefly Creative Production for Enterprise) custom actions using
    @adobe/ffcpe-custom-node-core and @adobe/ffcpe-custom-node-app-builder (OpenWhisk web + worker actions, Hono,
    submit/status HTTP contract, inputs/outputs, IMS-aware routes). Use when the user is wiring a
    custom-action app in App Builder, implementing FfcpeNodeWorkerHandler, mounting routes with
    mountFfcpeNodeRoutes, configuring web: raw OpenWhisk actions, debugging submit/statusUrl polling,
    handling Text/Image/Video/Json inputs, or producing action outputs for run-workflow. For
    catalog-entry.json and aio ffcpe catalog CLI, use companion skills from adobe/aio-cli-plugin-ffcpe.
---

# FFCPE custom actions on App Builder (`@adobe/ffcpe-custom-node-core`, `@adobe/ffcpe-custom-node-app-builder`)

## Audience

Use this skill when assisting **consumers** of the NPM packages: teams shipping an App Builder application that Workflow Builder invokes as a **`custom-action`** (async submit + status polling).

For **contributing to the SDK source repository** (monorepo, Turbo, releases), see **`README.md`** (“Monorepo (contributors)”) and **`CONTRIBUTING.md`** next to the SDK sources (internal mirror or published repo checkout).

For **scaffolding web/worker files, webpack, and `ext.config.yaml`**, use **`ffcpe-app-builder-actions`**.

For **`catalog-entry.json`** authoring and **`aio ffcpe catalog`** (validate, register, list, update), install skills from **[adobe/aio-cli-plugin-ffcpe](https://github.com/adobe/aio-cli-plugin-ffcpe)**: **`ffcpe-catalog-entry-json`** and **`aio-ffcpe-cli`**.

```bash
npx skills add adobe/aio-cli-plugin-ffcpe --all -y
```

## End-to-end checklist

1. **Install SDK packages** (npm or pnpm) and implement web + worker actions.
2. **Deploy** the App Builder app; note HTTPS **`submitEndpoint`** and **`statusEndpoint`** URLs.
3. **Author `catalog-entry.json`** — ports must match worker input/output names; endpoints must match deployed routes (default **`/submit`** and **`/status`** unless customized).
4. **Validate and register** with the CLI — never raw curl:

    ```bash
    aio ffcpe catalog validate --file ./catalog-entry.json
    aio ffcpe catalog register --file ./catalog-entry.json
    ```

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

## Link a local SDK checkout

Use this when the consumer app should load **`@adobe/ffcpe-custom-node-core`** / **`@adobe/ffcpe-custom-node-app-builder`** from a nearby clone of the SDK monorepo instead of the registry.

1. In the SDK monorepo, install and build **`dist/`** for both packages:

    ```bash
    pnpm install && pnpm run build
    # or: npm install && npm run build
    ```

    For tight iteration, run **`pnpm run dev`** (or **`npm run dev`**) from the SDK root so **`dist/`** rebuilds on change.

2. In **the consumer App Builder project**, link **core** first, then **app-builder**:

    **pnpm:**

    ```bash
    pnpm link /path/to/ffcpe-custom-node-sdk/packages/core
    pnpm link /path/to/ffcpe-custom-node-sdk/packages/app-builder
    ```

    **npm:**

    ```bash
    npm link /path/to/ffcpe-custom-node-sdk/packages/core
    npm link /path/to/ffcpe-custom-node-sdk/packages/app-builder
    ```

3. To restore registry packages:

    ```bash
    pnpm unlink @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder && pnpm install
    # or: npm unlink @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder && npm install
    ```

**Optional global link (pnpm):** register each package with **`pnpm link --global`** from **`packages/core`** and **`packages/app-builder`**, then in the consumer **`pnpm link --global @adobe/ffcpe-custom-node-core`** and **`pnpm link --global @adobe/ffcpe-custom-node-app-builder`**. If **`workspace:*`** fails to resolve for app-builder, keep using directory links or add a consumer **`pnpm.overrides`** pinning **`@adobe/ffcpe-custom-node-core`** to the **`packages/core`** path.

Full wording lives in the SDK **`README.md`** (“Use a local SDK checkout”).

## Install agent skills

Skills live in the SDK repo under **`skills/`** and install via the [open agent skills CLI](https://github.com/vercel-labs/skills). One canonical copy is symlinked into each agent (Claude Code, Cursor, etc.) so guidance stays identical.

### From GitHub (consumer repo)

```bash
# List available skills
npx skills add adobe/ffcpe-custom-node-sdk --list

# Install all FFCPE skills (project-local)
npx skills add adobe/ffcpe-custom-node-sdk --all -y

# Install only this skill
npx skills add adobe/ffcpe-custom-node-sdk --skill ffcpe-custom-node-sdk -y

# Claude Code + Cursor
npx skills add adobe/ffcpe-custom-node-sdk --all -a claude-code -a cursor -y

# Global (all projects on this machine)
npx skills add adobe/ffcpe-custom-node-sdk --all -g -y
```

### From a local SDK checkout

```bash
npx skills add /path/to/ffcpe-custom-node-sdk/skills --all -y
```

See **`skills/README.md`** in this repo for update/remove commands and skill layout.

**CLI plugin skills** (separate repo):

```bash
npx skills add adobe/aio-cli-plugin-ffcpe --all -y
```

Reference skills by **`name`** in each **`SKILL.md`** frontmatter: **`ffcpe-custom-node-sdk`**, **`ffcpe-app-builder-actions`**, **`aio-ffcpe-cli`**, **`ffcpe-catalog-entry-json`**.

## Catalog CLI (`@adobe/aio-cli-plugin-ffcpe`)

Install the [Adobe I/O CLI plugin](https://github.com/adobe/aio-cli-plugin-ffcpe) for catalog operations after deploy:

```bash
npm install -g @adobe/aio-cli
aio plugins:install @adobe/aio-cli-plugin-ffcpe
aio login
aio console org select
```

| Command | Purpose |
| ------- | ------- |
| **`aio ffcpe catalog validate -f ./catalog-entry.json`** | Local JSON validation (no API call) |
| **`aio ffcpe catalog register -f ./catalog-entry.json`** | Register a new custom action |
| **`aio ffcpe catalog inspect ACTIONTYPE`** | Fetch one entry |
| **`aio ffcpe catalog list`** | List custom actions (add **`--include-core`** for Adobe built-ins) |
| **`aio ffcpe catalog update ACTIONTYPE -f …`** | Full PUT replace |
| **`aio ffcpe catalog disable` / `enable` / `delete`** | Lifecycle |

Use **`--strict`** on register/update to fail on validation warnings. Override API host with **`AIO_FFCPE_CATALOG_BASE_URL`** or **`--base-url`**. Prefer **`aio ffcpe catalog`** over hand-written HTTP — auth uses the same IMS session as **`aio login`**.

Align **`customActionConfig.submitEndpoint`** / **`statusEndpoint`** in catalog JSON with your deployed web action URLs and route paths from **`mountFfcpeNodeRoutes`**. Port **`name`** values in catalog **`inputs`** / **`outputs`** must match what the worker reads via **`getTextInput`**, **`getImageInput`**, etc.

## Two OpenWhisk actions (recommended shape)

1. **Web action** — HTTP entry for FFCPE: **`POST /submit`**, **`GET /status`**. Build a Hono app, call **`mountFfcpeNodeRoutes`**, export **`main`** with **`ToOpenWhiskAction`** from **hono-openwhisk-adapter**.
2. **Worker action** — Long-running job: export **`main`** from **`createFfcpeNodeWorker(handler, options)`**.

Use **`ext.config.yaml`** (or equivalent) so the **web** action uses **`web: "raw"`** and **`annotations.require-adobe-auth: false`** (see **`README.md`** manifest example). Match **`worker`** / **`web`** package and action **names** to what **`mountFfcpeNodeRoutes`** receives.

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

For import cheat sheets, **`pnpm link`**, and troubleshooting (status URL, web manifest), see [references/quick-reference.md](references/quick-reference.md).
