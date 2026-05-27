# Contributing

## Commits — Conventional Commits

This repository uses [Conventional Commits](https://www.conventionalcommits.org/). Messages are validated with **commitlint** (via Husky `commit-msg` hook).

Common types:

| Type | When to use |
|------|----------------|
| `feat` | New user-facing capability (API / behavior) |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Maintenance (tooling, CI, deps that do not change runtime behavior) |
| `test` | Test-only changes |
| `refactor` | Code change without behavior change |
| `perf` | Performance improvement |
| `ci` | CI workflow changes |

Examples:

```
feat(sdk): add retry options to HTTP client
fix(sdk): handle missing jobId in job-status action
chore(ci): run tests on Node 22 in GitHub Actions
docs: clarify peer dependency installation
```

Breaking changes **must** include a footer:

```
feat(sdk)!: rename HandlerConfig field

BREAKING CHANGE: processorActionName is now invokeTarget; see migration notes.
```

## Code of conduct

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Pull requests

- Prefer **small, focused PRs** with one clear intent.
- Fill in the PR template (problem, approach, testing).
- Ensure **`pnpm run lint`**, **`pnpm run format:check`**, and **`pnpm test`** pass from the repository root.

## Pre-commit

[Husky](https://typicode.github.io/husky/) runs **`lint-staged`** on commit: staged `packages/*/src/**/*.ts` and `packages/*/test/**/*.ts` are formatted with **Oxfmt** and auto-fixed with **Oxlint** (`oxfmt --write`, `oxlint --fix`). Install hooks after clone with **`pnpm install`** (root **`prepare`** runs `husky`).

## Workspace layout (pnpm + Turborepo)

Install from the repository root:

```bash
corepack enable
pnpm install
```

Packages live under `packages/`:

- `packages/core` — `@adobe/ffcpe-custom-node-core`
- `packages/app-builder` — `@adobe/ffcpe-custom-node-app-builder`

Workspace-wide scripts use **Turborepo** (`turbo run …`) from the root `package.json`:

| Script | Meaning |
|--------|---------|
| `pnpm run build` | `turbo run build` (core builds before app-builder) |
| `pnpm run lint` / `lint:fix` | Oxlint in each package |
| `pnpm run format` / `format:check` | Oxfmt (`--write` / `--check`) in each package |
| `pnpm test` / `test:coverage` | Vitest per package; tests depend on `^build` |
| `pnpm run dev` | `turbo watch build` for incremental rebuilds |

Run a task in one package:

```bash
pnpm --filter @adobe/ffcpe-custom-node-core build
pnpm exec turbo run test --filter=@adobe/ffcpe-custom-node-app-builder
```

Shared **TypeScript** defaults live in the repo root [`tsconfig.base.json`](tsconfig.base.json); each package’s `tsconfig.json` extends it (`extends: "../../tsconfig.base.json"`), and `tsconfig.build.json` extends the package config for declaration emits.

## Publishing (npm)

Both libraries ship as **`@adobe/ffcpe-custom-node-core`** and **`@adobe/ffcpe-custom-node-app-builder`**. Publishing requires npm (or your Artifactory) credentials with rights to the **`@adobe`** scope. Each package’s **`publishConfig`** should match the target registry.

**Release automation** uses **pnpm** and **semantic-release** (`release.config.js`) via **`.github/workflows/release.yml`**:

- Runs on push to **`main`** or **`beta`**
- **`@semantic-release/npm`** publishes **`packages/core`** and **`packages/app-builder`**
- **`@semantic-release/git`** commits version bumps and **`CHANGELOG.md`** back to the repo (with **`[skip ci]`** so the release commit does not re-trigger CI)

Org secret: **`ADOBE_BOT_NPM_TOKEN`** (mapped to **`NPM_TOKEN`** for semantic-release).

Adobe boilerplate workflows (**`on-push-publish-to-npm`**, **`version-bump-publish`**, **`prerelease`**) remain for parity with other aio-lib repos; this monorepo’s SDK packages are published by **`release.yml`**, not those single-package npm flows.

