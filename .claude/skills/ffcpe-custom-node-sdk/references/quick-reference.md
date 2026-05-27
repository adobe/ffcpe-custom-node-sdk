# Quick reference — App Builder custom-action apps

## Packages

| NPM | Role |
|-----|------|
| `@adobe/ffcpe-custom-node-core` | Contract types, input/output helpers, HTTP/runtime primitives, IMS inbound auth helpers |
| `@adobe/ffcpe-custom-node-app-builder` | `mountFfcpeNodeRoutes`, `createFfcpeNodeWorker`, aio-lib-state `JobStore`, OpenWhisk orchestrator, `buildStatusUrl`, `createAioLogger` |

## Local SDK (`pnpm link`)

| Step | Command / note |
|------|----------------|
| Build SDK | From SDK monorepo root: **`pnpm run build`** (use **`pnpm run dev`** while iterating). |
| Link into consumer | From consumer project: **`pnpm link …/packages/core`** then **`pnpm link …/packages/app-builder`** (core first). |
| Unlink | **`pnpm unlink @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder`** then **`pnpm install`**. |

If global **`pnpm link --global`** breaks on **`workspace:*`**, use directory **`pnpm link`** or **`pnpm.overrides`** for **`@adobe/ffcpe-custom-node-core`** → **`packages/core`** path. Details: SDK **`README.md`**.

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

## OpenWhisk annotations (web action)

Ensure the **web** action matches **hono-openwhisk-adapter** requirements, e.g.:

- `raw-http: true`
- `web-export: raw` (when using that adapter mode)

Misconfiguration often surfaces as wrong request/response mapping or broken status URLs.

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Workflow Builder never leaves “processing” | **`statusUrl`** reachable from Adobe infra; **GET /status** returns `processing` → `completed`/`failed`; auth headers match catalog |
| 401/403 on submit or status | IMS / `x-api-key` / `InboundAuth` vs catalog `authentication` and `headers` |
| Worker never runs | **`worker.package` / `worker.name`** match deployed action; OpenWhisk invoke permissions; async invoke errors in logs |
| Missing outputs | Handler returns **`completed`** with **`outputs`**; MIME/port/name fields match FFCPE expectations |

## Contract details

Full submit/status schema and polling behavior: **`docs/custom-action-requests.md`** in the SDK repo (or published doc mirror).
