---
name: ffcpe-app-builder-actions
description: >-
  Describes how to implement FFCPE (Firefly Creative Production for Enterprise) custom-action web
  and worker OpenWhisk actions using @adobe/ffcpe-custom-node-core and @adobe/ffcpe-custom-node-app-builder (Hono, mountFfcpeNodeRoutes,
  createFfcpeNodeWorker, submit/status contract). Describes adding actions to existing Adobe App
  Builder repos: co-located <action-name>.web|worker|entry files, *.config.yaml updates, and
  webpack + esbuild-loader partial for TypeScript with CommonJS output. Use when scaffolding or
  migrating FFCPE web/worker pairs, fixing ext.config.yaml / runtimeManifest, or debugging
  hono-openwhisk-adapter raw-http actions.
---

# FFCPE App Builder actions (`@adobe/ffcpe-custom-node-core`, `@adobe/ffcpe-custom-node-app-builder`)

Use this skill when implementing or extending **Workflow Builder custom actions** in an **Adobe App Builder** (OpenWhisk) repo with **`@adobe/ffcpe-custom-node-core`** and **`@adobe/ffcpe-custom-node-app-builder`**.

For HTTP field-level contract details, see **`docs/custom-action-requests.md`** in this SDK repo. For consumer install and examples, see **`README.md`**.

---

## Packages and peers

- **`@adobe/ffcpe-custom-node-core`** — contract types, **`handleFfcpeSubmit`** / **`handleFfcpeStatus`**, **`runWorkerJob`**, input/output helpers, IMS inbound auth helpers.
- **`@adobe/ffcpe-custom-node-app-builder`** — **`mountFfcpeNodeRoutes`**, **`createFfcpeNodeWorker`**, AIO **`JobStore`**, OpenWhisk orchestrator, **`buildStatusUrl`**, **`createAioLogger`**.

Declare **`hono`** as a peer (your app chooses the version). Typical App Builder peers also include **`@adobe/aio-lib-state`**, **`@adobe/aio-lib-ims`**, **`@adobe/aio-lib-core-logging`**, and **`openwhisk`** — align versions with your template’s **`package.json`**.

---

## Web action (Hono)

1. Import **`Hono`**, **`ToOpenWhiskAction`** from **`hono-openwhisk-adapter`**, and **`mountFfcpeNodeRoutes`** from **`@adobe/ffcpe-custom-node-app-builder`**.
2. **`const app = new Hono()`**, then **`mountFfcpeNodeRoutes(app, { worker: { package, name }, web: { package, name } })`**. **`web`** and **`worker`** must match OpenWhisk **package** and **action** names in your manifest (for **`statusUrl`** and async invoke).
3. Default routes are **`POST /submit`** and **`GET /status`**; omit **`routes`** unless paths differ from defaults.
4. **`export const main = ToOpenWhiskAction(app)`** (or the entry shape your bundler expects).

The **web** action in **`*.config.yaml`** / **`ext.config.yaml`** must use **`raw-http: true`**, **`web-export: raw`**, **`web: "yes"`**, and a supported Node runtime (e.g. **`nodejs:22`**).

---

## Worker action

1. Implement **`FfcpeNodeWorkerHandler`**: **`ctx`** has **`jobId`**, **`inputs`** (**`FfcpeInput[]`**), **`params`** (submit **`parameters`**), **`logger`**, optional **`authContext`**, **`args`** (full **`main(args)`**).
2. Return **`{ status: "completed", outputs?: Output[] }`** or **`{ status: "failed", error: string }`**. Use **`createTextOutput`**, **`createImageOutput`**, **`createVideoOutput`**, **`createJsonOutput`**.
3. **`export const main = createFfcpeNodeWorker(handler, options?)`**. **`requiredInputNames`** refers to each input’s **`port`**, not the display **`name`**.

Use **`getTextInput`**, **`getImageInput`**, etc. with **`ctx.inputs`** (helpers take the **inputs array**, not the full submit body).

**Manifest `inputs` (secrets):** usually **environment variables** — use **`process.env`**, not **`ctx.inputs`**. Do not log secrets.

---

## Adding actions to an existing App Builder repo

### 1. Co-located files

Same directory, named:

- **`<action-name>.web.ts`** or **`.js`**
- **`<action-name>.worker.ts`** or **`.js`**
- **`<action-name>.entry.json`**

Example: **`resize-image.web.ts`**, **`resize-image.worker.ts`**, **`resize-image.entry.json`**. JSON shape follows your App Builder template.

### 2. **`*.config.yaml`**

Update **`runtimeManifest`** (or equivalent): declare **web** (raw HTTP, web-export) and **worker** actions; **`function`** paths must match your build outputs. **`mountFfcpeNodeRoutes`** **`package`** / **`name`** must match this YAML.

### 3. TypeScript + webpack (CJS for `dist`)

Install:

```bash
pnpm add -D esbuild-loader
```

Merge into **`*webpack-config.js`** (preserve existing rules via **`webpack-merge`** or careful **`Object.assign`**):

```
  output: {
    libraryTarget: "commonjs2", // Important for CommonJS output
  },
  module: {
    rules: [
      {
        // Match `.js`, `.jsx`, `.ts` or `.tsx` files
        test: /\.[jt]sx?$/,
        loader: "esbuild-loader",
        options: {
          // JavaScript version to compile to
          target: "es2020",
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"], // Add .ts and .js to the list of extensions to resolve
  },
```

Deployed Runtime bundles are **CommonJS**; source can still be ESM-style TypeScript.

---

## Agent checklist

- Web + worker names align with **`mountFfcpeNodeRoutes`** and YAML.
- Web: **`raw-http: true`**, **`web-export: raw`**.
- Worker: FFCPE data from **`ctx.inputs`**; secrets from **`process.env`** only.
- TS build: **`libraryTarget: "commonjs2"`** + **`esbuild-loader`** as above.
