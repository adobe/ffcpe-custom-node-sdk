# Quick reference — App Builder custom-action apps

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

## Catalog CLI (`@adobe/aio-cli-plugin-ffcpe`)

| Step | Command |
|------|---------|
| Install Adobe I/O CLI | **`npm install -g @adobe/aio-cli`** |
| Install FFCPE plugin | **`aio plugins:install @adobe/aio-cli-plugin-ffcpe`** |
| Auth | **`aio login`**, **`aio console org select`** |
| Validate entry | **`aio ffcpe catalog validate -f ./catalog-entry.json`** |
| Register | **`aio ffcpe catalog register -f ./catalog-entry.json`** |
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
