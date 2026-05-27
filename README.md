# FFCPE custom nodes (TypeScript)

**FFCPE** — _Firefly Creative Production for Enterprise_. These SDKs support **custom actions** built on **Adobe App Builder**

---

## Packages

| Package     | NPM name                               | Role                                                                                                                                                    |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core        | `@adobe/ffcpe-custom-node-core`        | FFCPE contract types, `JobStore` / `JobOrchestrator`, `runWorkerJob`, IMS inbound auth, `handleFfcpeSubmit` / `handleFfcpeStatus`, input/output helpers |
| App Builder | `@adobe/ffcpe-custom-node-app-builder` | Reference wiring: AIO `JobStore`, OpenWhisk orchestrator, `mountFfcpeNodeRoutes`, `createFfcpeNodeWorker`, `createAioLogger`, `buildStatusUrl`          |
| CLI plugin  | `@adobe/aio-cli-plugin-ffcpe`          | [`aio ffcpe catalog`](https://github.com/adobe/aio-cli-plugin-ffcpe) — validate, register, and manage `catalog-entry.json` in the run-workflow catalog |

---

## Quick Start for App Builder

Let's build a node to resize an input image with Jimp.

### 1. Install Dependencies

```bash
# with npm
npm install @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder
# OR pnpm
pnpm add @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder
```

### 2. The Worker

```typescript
// actions/thumbnail/thumbnail.worker.ts
import { init  } from "@adobe/aio-lib-files";
import { Jimp } from "jimp";
import {
    createImageOutput,
    getImageInput,
    type FfcpeNodeWorkerHandler,
} from "@adobe/ffcpe-custom-node-core";
import { createFfcpeNodeWorker } from "@adobe/ffcpe-custom-node-app-builder";

const handler: FfcpeNodeWorkerHandler = async ({ inputs, params, jobId }) => {
    // input
    const url = getImageInput(inputs, "imageIn");
    if (!url) return { status: "failed", error: 'Missing image on port "imageIn"' };

    // params
    const width = params.width;
    const height = params.height;

    // resize
    const image = await Jimp.read(url);
    image.resize({ w: width, h: height });
    const png = await image.getBuffer("image/png");

    // upload result, get presigned url
    const files = await init();
    const remotePath = `public/thumbnails/${jobId}.png`;
    await files.write(remotePath, png);
    await presignedUrl = generatePresignURL(filePath, {
      expiryInSeconds: 18000, // 5 hour
      permissions: "r", // read and write permissions
      urlType: "external",
    });


    return {
        status: "completed",
        outputs: [
            createImageOutput(presignedUrl, {
                port: "imageOut",
                name: "thumb.png",
                mimeType: "image/png",
            }),
        ],
    };
};

// expose worker
export const main = createFfcpeNodeWorker(handler, { requiredInputNames: ["imageIn"] });
```

### 3. Web action

exposes /submit and /status path handlers.

```typescript
import { Hono } from "hono";
import { ToOpenWhiskAction } from "hono-openwhisk-adapter";
import { mountFfcpeNodeRoutes } from "@adobe/ffcpe-custom-node-app-builder";

const app = new Hono();

mountFfcpeNodeRoutes(app, {
    // required. on submit, calls this worker
    worker: { package: "my-ffcpe-app", name: "my-worker" },
    // requiored. this web function, so the "status" path can returns the right url
    web: { package: "my-ffcpe-app", name: "my-web-action" },
});

export const main = ToOpenWhiskAction(app);
```

### 4. Declare the actions in manifest

On **Adobe App Builder**, the web action should use `web: "raw"` and `require-adobe-auth: false`

```yaml
runtimeManifest:
    packages:
        my-ffcpe-app:
            actions:
                my-web-action:
                    function: actions/my-web-action.ts
                    web: "raw"
                    runtime: nodejs:22
                    annotations:
                        require-adobe-auth: false
                my-worker:
                    function: actions/my-worker.ts
                    runtime: nodejs:22
```

---

## How it fits together

1. FFCPE **POST**s a job to **`/submit`**; the web action validates auth, stores the job, invokes the worker asynchronously.
2. The worker runs your handler, and persists job status
3. FFCPE polls the status url until the job is **completed** or **failed**.
4. Before workflows can use your node, register a **`catalog-entry.json`** with **`aio ffcpe catalog register`** (see [Catalog CLI](#catalog-cli) below).

> The HTTP shapes are documented in **[docs/custom-action-requests.md](docs/custom-action-requests.md)**.

---

---

## Peer dependencies (App Builder)

Typical App Builder projects already ship these; align versions with your extension template. **npm 7+** usually pulls them in when you install **`@adobe/ffcpe-custom-node-app-builder`**; **pnpm** needs **`auto-install-peers=true`** (see above) or an explicit **`pnpm add`** for the peers you do not already have.

- `@adobe/aio-lib-core-logging`
- `@adobe/aio-lib-state`
- `@adobe/aio-lib-ims`
- `openwhisk`
- `hono`
- `hono-openwhisk-adapter`

---

## Catalog CLI

After you deploy web and worker actions, register them with the run-workflow catalog so FFCPE workflows can invoke your node. Use the [Adobe I/O CLI plugin](https://github.com/adobe/aio-cli-plugin-ffcpe) — do not hand-craft HTTP calls to the catalog API.

```bash
# Adobe I/O CLI (Node 18+)
npm install -g @adobe/aio-cli

# FFCPE catalog commands
aio plugins:install @adobe/aio-cli-plugin-ffcpe

aio login
aio console org select

# Local validation (no network), then register
aio ffcpe catalog validate --file ./catalog-entry.json
aio ffcpe catalog register --file ./catalog-entry.json
```

Common commands: **`list`**, **`inspect ACTIONTYPE`**, **`update ACTIONTYPE --file …`**, **`disable`**, **`enable`**, **`delete`**. See the [plugin README](https://github.com/adobe/aio-cli-plugin-ffcpe) for flags (`--base-url`, `--org-id`, `--strict`, …).

**`catalog-entry.json`** must set **`handlerType: "custom-action"`**, **`customActionConfig.submitEndpoint`** / **`statusEndpoint`** (HTTPS URLs matching your deployed web action), and input/output ports that align with your worker. Authoring rules and examples live in the plugin’s **`ffcpe-catalog-entry-json`** agent skill.

---

## Agent skills

Coding-agent skills cover the full custom-node path: SDK implementation, App Builder wiring, catalog JSON, and CLI registration. Install with the [open agent skills CLI](https://github.com/vercel-labs/skills):

```bash
# SDK skills (this repo)
npx skills add adobe/ffcpe-custom-node-sdk --list
npx skills add adobe/ffcpe-custom-node-sdk --all -y

# CLI + catalog-entry.json skills
npx skills add adobe/aio-cli-plugin-ffcpe --list
npx skills add adobe/aio-cli-plugin-ffcpe --all -y
```

| Repo | Skills |
| ---- | ------ |
| **This repo** | `ffcpe-custom-node-sdk`, `ffcpe-app-builder-actions` |
| **[aio-cli-plugin-ffcpe](https://github.com/adobe/aio-cli-plugin-ffcpe)** | `aio-ffcpe-cli`, `ffcpe-catalog-entry-json` |

See [`skills/README.md`](skills/README.md) for the end-to-end workflow and install options (global, specific agents, local checkout).

---

## Advanced: core only

If you are not on Hono / OpenWhisk, **`@adobe/ffcpe-custom-node-core`** alone gives you:

- **`handleFfcpeSubmit(request, options)`** / **`handleFfcpeStatus(request, options)`** — WinterTC **`Request` → `Response`**. `options` includes **`jobStore`**, **`orchestrator`**, **`logger`**, **`buildStatusUrl`**, optional **`authenticate`**, optional **`jobMetadata`**.
- **`runWorkerJob({ jobStore, logger, execute, payload })`** — runs your **`execute`** hook and persists success/failure. Returns a **`WorkerInvokeResult`** envelope you map to your platform’s response.
- **`createConsoleLogger(prefix?)`** — simple **`Logger`** for tests without AIO logging.

---

## Implementing on another serverless platform

The core package does **not** assume OpenWhisk. To port to Lambda, Cloudflare Workers, etc., implement the same responsibilities the App Builder package wires today (use **`packages/app-builder/src`** as a checklist):

1. **`JobStore`** — `create` / `get` / `complete` / `fail` (and optional activation metadata if you store invocation ids). Reference: [`aio-job-store.ts`](packages/app-builder/src/job/aio-job-store.ts).
2. **`JobOrchestrator`** — after submit, invoke the worker with **`{ jobId, inputs, params, authContext }`**. Reference: [`openwhisk-job-orchestrator.ts`](packages/app-builder/src/job/openwhisk-job-orchestrator.ts).
3. **HTTP** — routes matching the [custom-action contract](docs/custom-action-requests.md), calling **`handleFfcpeSubmit` / `handleFfcpeStatus`**. Reference: [`mount-ffcpe-node-routes.ts`](packages/app-builder/src/actions/mount-ffcpe-node-routes.ts).
4. **Worker entry** — map the runtime event to **`WorkerPayload`** and **`runWorkerJob`** (or **`createFfcpeNodeWorker`** on OpenWhisk). Reference: [`create-ffcpe-node-worker.ts`](packages/app-builder/src/actions/create-ffcpe-node-worker.ts).
5. **`buildStatusUrl`** — URLs your clients can poll. Reference: [`status-url.ts`](packages/app-builder/src/status-url.ts).
6. **`Logger`** — no secrets in logs. Reference: [`aio-logger.ts`](packages/app-builder/src/logging/aio-logger.ts).

Swap **`createImsInboundAuth`** for your own **`InboundAuth`** when you mount routes if IMS is not your boundary.

---

## Use a local SDK checkout (`pnpm link` / `npm link`)

To depend on this monorepo before packages are published:

1. From the repo root, install and build both packages: **`pnpm install && pnpm run build`** or **`npm install && npm run build`**. For continuous rebuilds: **`pnpm run dev`** or **`npm run dev`**.
2. In your consumer app:

    **pnpm:**

    ```bash
    pnpm link /absolute/path/to/ffcpe-custom-node-sdk/packages/core
    pnpm link /absolute/path/to/ffcpe-custom-node-sdk/packages/app-builder
    ```

    **npm:**

    ```bash
    npm link /absolute/path/to/ffcpe-custom-node-sdk/packages/core
    npm link /absolute/path/to/ffcpe-custom-node-sdk/packages/app-builder
    ```

    Link **core** first so **`@adobe/ffcpe-custom-node-core`** resolves cleanly for app-builder.

3. To revert:

    ```bash
    pnpm unlink @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder && pnpm install
    # or: npm unlink @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder && npm install
    ```

**Global link (optional, pnpm):** from each of **`packages/core`** and **`packages/app-builder`**, run **`pnpm link --global`**, then in the consumer **`pnpm link --global @adobe/ffcpe-custom-node-core`** and **`pnpm link --global @adobe/ffcpe-custom-node-app-builder`**. If **`workspace:*`** resolution fails outside the monorepo, prefer directory links or a **`pnpm.overrides`** entry for **`@adobe/ffcpe-custom-node-core`**.

**npm / Yarn** use different link commands; this repo is validated with **pnpm** and **npm**.

---

## Monorepo (contributors)

Uses **[pnpm](https://pnpm.io/)** workspaces and **[Turborepo](https://turbo.build/)**.

```bash
corepack enable
corepack prepare pnpm@11.3.0 --activate
pnpm install
pnpm run lint
pnpm test
pnpm run build
```

Scoped tasks:

```bash
pnpm exec turbo run build --filter=@adobe/ffcpe-custom-node-core
pnpm exec turbo run test --filter=@adobe/ffcpe-custom-node-app-builder
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Releases & migrations

See [CHANGELOG.md](CHANGELOG.md) and [MIGRATION.md](MIGRATION.md).
