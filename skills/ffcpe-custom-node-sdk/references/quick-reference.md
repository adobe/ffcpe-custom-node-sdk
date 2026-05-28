# Quick reference — App Builder custom-action apps

## Bootstrap (new project from scratch)

| Step | Command | Notes |
|------|---------|-------|
| Create Console project | `aio console project create -n <name> -t "Title" --json` | Captures `id` for next steps |
| Select project | `aio console project select <name>` | Stage workspace is auto-created |
| Select workspace | `aio console workspace select Stage --projectId <id>` | Positional arg + `--projectId`; no `--projectName` flag |
| Init App Builder project | `aio app init -y --no-login --standalone-app --no-install` | Run inside your project directory |
| Download workspace config | `aio console workspace download` | Saves `<orgId>-<project>-Stage.json` — **contains secrets; add to `.gitignore` before `git add`** |
| Protect secrets | `echo '<orgId>-<project>-Stage.json' >> .gitignore` | Generated `.gitignore` does NOT cover this file; also verify `.env*` is present |
| Wire local app to Console | `aio app use <orgId>-<project>-Stage.json` | **Do not use `--no-input` alone** — it fails without a config file when `.aio` is empty |
| Clean up scaffold | `rm -rf web-src actions/generic actions/publish-events test e2e` | init-bare generates these; a headless FFCPE app doesn't need them |
| Fix `app.config.yaml` | Remove `web: web-src` line; replace actions with FFCPE web + worker pair | Leaving `web: web-src` causes the frontend build step to fail |
| Replace webpack-config.js | Full replacement with `esbuild-loader` + `libraryTarget: "commonjs2"` | Generated file uses `ts-loader` and wrong output shape; see **`ffcpe-app-builder-actions`** skill |
| Install FFCPE packages | `npm install @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder hono hono-openwhisk-adapter` | |
| Build | `aio app build` | |
| Deploy | `aio app deploy` | Prints deployed action URLs |

### Console CLI flag gotchas

Commands have **inconsistent flag shapes** — mismatches throw `NonExistentFlagsError`:

| Command | Uses |
|---------|------|
| `aio console workspace create` | `--projectName <name>` |
| `aio console workspace select` | positional `[NAME_OR_ID]` + `--projectId <id>` |
| `aio console workspace list`   | `--projectId <id>` (not `--projectName`) |
| `aio console workspace download` | optional positional `[DESTINATION]` |

---

## Packages

| NPM | Role |
|-----|------|
| `@adobe/ffcpe-custom-node-core` | Contract types, input/output helpers, HTTP/runtime primitives, IMS inbound auth helpers |
| `@adobe/ffcpe-custom-node-app-builder` | `mountFfcpeNodeRoutes`, `createFfcpeNodeWorker`, aio-lib-state `JobStore`, OpenWhisk orchestrator, `buildStatusUrl`, `createAioLogger` |

## Local SDK (`pnpm` / `npm link`)

| Step | Command / note |
|------|----------------|
| Build SDK | From SDK monorepo root: **`pnpm run build`** or **`npm run build`** (use **`pnpm run dev`** / **`npm run dev`** while iterating). |
| Link into consumer (pnpm) | **`pnpm link …/packages/core`** then **`pnpm link …/packages/app-builder`** (core first). |
| Link into consumer (npm) | **`npm link …/packages/core`** then **`npm link …/packages/app-builder`** (core first). |
| Unlink | **`pnpm unlink …`** or **`npm unlink …`**, then reinstall. |

If global **`pnpm link --global`** breaks on **`workspace:*`**, use directory **`pnpm link`** / **`npm link`** or **`pnpm.overrides`** for **`@adobe/ffcpe-custom-node-core`** → **`packages/core`** path. Details: SDK **`README.md`**.

## Custom action file layout (recommended)

Co-locate each action’s **web**, **worker**, and **catalog entry** with the same **`<action-name>`** prefix:

```text
actions/<action-name>/
  <action-name>.web.ts
  <action-name>.worker.ts
  <action-name>.entry.json    ← run-workflow catalog entry (aio ffcpe catalog validate/register)
```

Example: **`actions/resize-image/resize-image.entry.json`** beside **`resize-image.web.ts`** and **`resize-image.worker.ts`**. See **`ffcpe-app-builder-actions`** and **`ffcpe-catalog-entry-json`**.

## Catalog CLI (`@adobe/aio-cli-plugin-ffcpe`)

| Step | Command |
|------|---------|
| Install Adobe I/O CLI | **`npm install -g @adobe/aio-cli`** |
| Install FFCPE plugin | **`aio plugins:install @adobe/aio-cli-plugin-ffcpe`** |
| Auth | **`aio login`**, **`aio console org select`** |
| Validate entry | **`aio ffcpe catalog validate -f ./actions/<action-name>/<action-name>.entry.json`** |
| Register | **`aio ffcpe catalog register -f ./actions/<action-name>/<action-name>.entry.json`** |
| List / inspect | **`aio ffcpe catalog list`**, **`aio ffcpe catalog inspect ACTIONTYPE`** |

Agent skills: **`aio-ffcpe-cli`**, **`ffcpe-catalog-entry-json`** — install with **`npx skills add adobe/aio-cli-plugin-ffcpe --all -y`**. Plugin repo: [github.com/adobe/aio-cli-plugin-ffcpe](https://github.com/adobe/aio-cli-plugin-ffcpe).

## Imports (typical)

**From `@adobe/ffcpe-custom-node-core`**

- Handler types: `FfcpeNodeWorkerHandler`, `FfcpeNodeWorkerResult`, `FfcpeInput`, `TextInput`, …
- Input helpers: `findInputByName`, `getTextInput`, `getImageInput`, …
- Outputs: `createTextOutput`, `createImageOutput`, `createVideoOutput`, `createJsonOutput`, …
- Errors: `FfcpeJobFailedError`

**From `@adobe/ffcpe-custom-node-app-builder`**

- `mountFfcpeNodeRoutes`, `createFfcpeNodeWorker`, `buildStatusUrl`, `createAioLogger` (as needed)

**From `hono` / `hono-openwhisk-adapter`**

- `Hono`, `ToOpenWhiskAction` (web action export pattern)

## `mountFfcpeNodeRoutes(app, options)` (summary)

| Option | Notes |
|--------|--------|
| `worker` | `{ package, name }` — OpenWhisk action invoked asynchronously |
| `web` | `{ package, name }` — **required** for correct **`statusUrl`** in submit response |
| `routes` | Optional `{ submit?, status? }`; default `/submit`, `/status` |
| `authenticate` | Omit → default IMS; `null` → no auth |
| `jobStore`, `loggerName`, `jobMetadata` | Optional overrides |

## `createFfcpeNodeWorker(handler, options?)` (summary)

| Option | Notes |
|--------|--------|
| `requiredInputNames` | Validates presence of input **names** after submit JSON is parsed |
| `jobStore`, `loggerName` | Optional overrides |

## Web action manifest (`runtimeManifest`)

Ensure the **web** action uses **`web: "raw"`** and **`require-adobe-auth: false`**:

```yaml
my-web-action:
    function: actions/my-web-action.ts
    web: "raw"
    runtime: nodejs:22
    annotations:
        require-adobe-auth: false
```

Misconfiguration often surfaces as wrong request/response mapping or broken status URLs.

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Workflow Builder never leaves “processing” | **`statusUrl`** reachable from Adobe infra; **GET /status** returns `processing` → `completed`/`failed`; auth headers match catalog |
| 401/403 on submit or status | IMS / `x-api-key` / `InboundAuth` vs catalog `authentication` and `headers` |
| Worker never runs | **`worker.package` / `worker.name`** match deployed action; OpenWhisk invoke permissions; async invoke errors in logs |
| Missing outputs | Handler returns **`completed`** with **`outputs`**; MIME/port/name fields match FFCPE expectations |
| Catalog register fails | Run **`aio ffcpe catalog validate -f …`**; check HTTPS endpoints, required **`relatedActions`** / **`usage`** fields; see **`ffcpe-catalog-entry-json`** skill |
| Action not in workflow UI | **`workflowEnabled: true`**, not **`disabled`**; run **`aio ffcpe catalog list --workflow-enabled`** |

## Contract details

Full submit/status schema and polling behavior: **`docs/custom-action-requests.md`** in the SDK repo (or published doc mirror).
