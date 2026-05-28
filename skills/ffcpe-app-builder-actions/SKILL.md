---
name: ffcpe-app-builder-actions
description: >-
  Describes how to implement FFCPE (Firefly Creative Production for Enterprise) custom-action web
  and worker OpenWhisk actions using @adobe/ffcpe-custom-node-core and @adobe/ffcpe-custom-node-app-builder (Hono, mountFfcpeNodeRoutes,
  createFfcpeNodeWorker, submit/status contract). Describes adding actions to existing Adobe App
  Builder repos: co-located <action-name>.web|worker|entry files, *.config.yaml updates, and
  webpack + esbuild-loader partial for TypeScript with CommonJS output. Use when scaffolding or
  migrating FFCPE web/worker pairs, fixing ext.config.yaml / runtimeManifest, or debugging
  hono-openwhisk-adapter web actions (web: raw).   After deploy, use aio ffcpe catalog with co-located <action-name>.entry.json (skills in
  adobe/aio-cli-plugin-ffcpe) to register the action.
---

# FFCPE App Builder actions (`@adobe/ffcpe-custom-node-core`, `@adobe/ffcpe-custom-node-app-builder`)

Use this skill when implementing or extending **Workflow Builder custom actions** in an **Adobe App Builder** (OpenWhisk) repo with **`@adobe/ffcpe-custom-node-core`** and **`@adobe/ffcpe-custom-node-app-builder`**.

For HTTP field-level contract details, see **`docs/custom-action-requests.md`** in this SDK repo. For consumer install and examples, see **`README.md`**. For package install, local linking, and security guidance, see **`ffcpe-custom-node-sdk`**. For **`catalog-entry.json`** and **`aio ffcpe catalog`**, use **`ffcpe-catalog-entry-json`** and **`aio-ffcpe-cli`** from [adobe/aio-cli-plugin-ffcpe](https://github.com/adobe/aio-cli-plugin-ffcpe):

```bash
npx skills add adobe/aio-cli-plugin-ffcpe --all -y
```

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

The **web** action in **`*.config.yaml`** / **`ext.config.yaml`** must use **`web: "raw"`** and **`require-adobe-auth: false`**, plus a supported Node runtime (e.g. **`nodejs:22`**):

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

## Worker action

1. Implement **`FfcpeNodeWorkerHandler`**: **`ctx`** has **`jobId`**, **`inputs`** (**`FfcpeInput[]`**), **`params`** (submit **`parameters`**), **`logger`**, optional **`authContext`**, **`args`** (full **`main(args)`**).
2. Return **`{ status: "completed", outputs?: Output[] }`** or **`{ status: "failed", error: string }`**. Use **`createTextOutput`**, **`createImageOutput`**, **`createVideoOutput`**, **`createJsonOutput`**.
3. **`export const main = createFfcpeNodeWorker(handler, options?)`**. **`requiredInputNames`** refers to each input’s **`port`**, not the display **`name`**.

Use **`getTextInput`**, **`getImageInput`**, etc. with **`ctx.inputs`** (helpers take the **inputs array**, not the full submit body).

**Manifest `inputs` (secrets):** usually **environment variables** — use **`process.env`**, not **`ctx.inputs`**. Do not log secrets.

---

## Starting from scratch with `init-bare`

If you have no App Builder project yet, the fastest path is `aio app init --standalone-app` (or the `init-bare` script wrapper). **Warning: this generator produces more than a bare skeleton** — it scaffolds `web-src/`, `actions/generic/`, `actions/publish-events/`, `test/`, and `e2e/` that are irrelevant to a headless FFCPE action. Follow these steps in order:

### 1. Create the Console project and workspace

```bash
# Create the project
aio console project create -n my-project -t "My Project Title" --json

# Stage workspace is created automatically; select it (use the project ID from the create output)
aio console project select my-project
aio console workspace select Stage --projectId <PROJECT_ID>
```

**Console CLI flag reference** — flags differ by command; mismatches throw `NonExistentFlagsError`:

| Command | Key flags |
|---------|-----------|
| `aio console workspace create` | `--projectName <name>` (required), `--name <name>` (required) |
| `aio console workspace select` | positional `[WORKSPACEIDORNAME]` + `--projectId <id>` |
| `aio console workspace list`   | `--projectId <id>` (not `--projectName`) |
| `aio console workspace download` | positional `[DESTINATION]` + `--projectId <id>` |

### 2. Initialise the project

```bash
aio app init -y --no-login --standalone-app --no-install
```

### 3. Wire the local app to the Console workspace

**`aio app use --no-input` alone fails** after `init-bare` because the local `.aio` file has no org/project/workspace context yet. The correct sequence is:

```bash
# Download the workspace credentials/config from Console
aio console workspace download          # saves e.g. <orgId>-<project>-Stage.json

# Import that config — this populates .aio and .env
aio app use <orgId>-<project>-Stage.json
```

**The downloaded JSON file contains secrets (client credentials, API keys).** Add it to `.gitignore` immediately after downloading — before any `git add`. The generated `.gitignore` does not cover this file automatically:

```bash
# Add the specific file, or use the pattern [0-9]*-*-*.json to cover all workspaces
echo '<orgId>-<project>-Stage.json' >> .gitignore
```

Also confirm `.env` is ignored (the generated `.gitignore` covers this via `.env*`, but verify it is present).

### 4. Clean up the scaffolded files

The generator creates files that conflict with a headless FFCPE action. Remove them:

```bash
rm -rf web-src actions/generic actions/publish-events test e2e
```

### 5. Fix `app.config.yaml`

The generated YAML includes `web: web-src` at the application level, which causes the frontend build step to run (and fail) on a headless project. Remove that line and replace the scaffolded actions with your FFCPE pair:

```yaml
application:
  actions: actions
  runtimeManifest:
    packages:
      my-ffcpe-app:
        license: Apache-2.0
        actions:
          my-action-web:
            function: actions/my-action/my-action.web.ts
            web: "raw"
            runtime: nodejs:22
            annotations:
              require-adobe-auth: false
          my-action-worker:
            function: actions/my-action/my-action.worker.ts
            runtime: nodejs:22
            inputs:
              LOG_LEVEL: debug
```

### 6. Replace `webpack-config.js`

The generator emits a config that uses `ts-loader` and is missing `libraryTarget: "commonjs2"`. **Replace it entirely** (not a merge — the generated output section is wrong):

```js
// webpack-config.js
module.exports = {
  output: {
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        loader: 'esbuild-loader',
        options: { target: 'es2020' },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
}
```

Install the loader:

```bash
npm install -D esbuild-loader
# or: pnpm add -D esbuild-loader
```

### 7. Install FFCPE packages

```bash
npm install @adobe/ffcpe-custom-node-core @adobe/ffcpe-custom-node-app-builder hono hono-openwhisk-adapter
```

---

## Adding actions to an existing App Builder repo

### 1. Co-located files (recommended)

For each custom action, keep **web**, **worker**, and **catalog entry JSON** in the **same directory**, sharing the same **`<action-name>`** prefix:

- **`<action-name>.web.ts`** or **`.js`** — Hono submit/status web action
- **`<action-name>.worker.ts`** or **`.js`** — async worker
- **`<action-name>.entry.json`** — run-workflow **catalog entry** (same document you pass to **`aio ffcpe catalog validate`** / **`register`**)

Example layout:

```text
actions/
  resize-image/
    resize-image.web.ts
    resize-image.worker.ts
    resize-image.entry.json
```

The **`.entry.json`** file is not a separate template artifact — it **is** the catalog registration payload (**`handlerType: "custom-action"`**, ports, **`customActionConfig`**, discovery fields). Author it with skill **`ffcpe-catalog-entry-json`**.

Flat co-location (same folder, no subdir) is fine if your repo already uses **`actions/resize-image.web.ts`** next to **`actions/resize-image.worker.ts`** — still name the catalog file **`resize-image.entry.json`** beside them.

### 2. **`*.config.yaml`**

Update **`runtimeManifest`** (or equivalent): declare the **web** action with **`web: "raw"`** and **`annotations.require-adobe-auth: false`**, plus the **worker** action; **`function`** paths must match your build outputs. **`mountFfcpeNodeRoutes`** **`package`** / **`name`** must match this YAML.

### 3. TypeScript + webpack (CJS for `dist`)

Install:

```bash
npm install -D esbuild-loader
# or
pnpm add -D esbuild-loader
```

If the project was initialized with `init-bare`, **replace `webpack-config.js` entirely** — the generated file uses `ts-loader` and lacks `libraryTarget: "commonjs2"`. For other existing projects, merge into **`*webpack-config.js`** (preserve existing rules via **`webpack-merge`** or careful **`Object.assign`**):

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

## Register in the catalog (after deploy)

1. Deploy web + worker actions; collect HTTPS gateway URLs for **`/submit`** and **`/status`** (or your custom routes).
2. Fill in **`<action-name>.entry.json`** next to that action’s web/worker files — **`handlerType: "custom-action"`**, input/output port names matching the worker, and **`customActionConfig`** endpoints. Use skill **`ffcpe-catalog-entry-json`** ([CLI plugin repo](https://github.com/adobe/aio-cli-plugin-ffcpe)).
3. Install and auth the CLI plugin:

    ```bash
    npm install -g @adobe/aio-cli
    aio plugins:install @adobe/aio-cli-plugin-ffcpe
    aio login
    aio console org select
    ```

4. Validate and register — do not use raw curl (path is the co-located **`.entry.json`**):

    ```bash
    aio ffcpe catalog validate --file ./actions/resize-image/resize-image.entry.json
    aio ffcpe catalog register --file ./actions/resize-image/resize-image.entry.json
    ```

---

## Agent checklist

- **New project:** ran `init-bare` → downloaded workspace config → `aio app use <file>.json` → removed `web-src/`, `actions/generic/`, `actions/publish-events/`, `test/`, `e2e/`.
- **`app.config.yaml`:** no `web: web-src` line; only the FFCPE web + worker pair declared.
- **`webpack-config.js`:** `libraryTarget: "commonjs2"`, `esbuild-loader`, `.ts`/`.js` extensions — replace the `init-bare` generated file, don't merge.
- Web + worker names align with **`mountFfcpeNodeRoutes`** and YAML.
- Web: **`web: "raw"`**, **`annotations.require-adobe-auth: false`**.
- Worker: FFCPE data from **`ctx.inputs`**; secrets from **`process.env`** only.
- Catalog: **`<action-name>.entry.json`** co-located with web/worker; port names match worker ports; endpoints match deployed web action URLs; **`aio ffcpe catalog validate`** then **`register`** on that file (skill **`aio-ffcpe-cli`**).
