# Agent skills

Reusable instruction sets for coding agents (Claude Code, Cursor, Codex, and [50+ others](https://github.com/vercel-labs/skills)) that help build **FFCPE custom actions** on Adobe App Builder and register them in the run-workflow catalog.

Skills follow the [open agent skills](https://github.com/vercel-labs/skills) format (`SKILL.md` with YAML frontmatter). Install with the [`skills` CLI](https://skills.sh):

```bash
npx skills add adobe/ffcpe-custom-node-sdk --list
npx skills add adobe/aio-cli-plugin-ffcpe --list
```

## End-to-end workflow

| Step | Tool | Skill / doc |
| ---- | ---- | ----------- |
| 1. Implement web + worker actions | [`@adobe/ffcpe-custom-node-core`](https://www.npmjs.com/package/@adobe/ffcpe-custom-node-core), [`@adobe/ffcpe-custom-node-app-builder`](https://www.npmjs.com/package/@adobe/ffcpe-custom-node-app-builder) | **`ffcpe-custom-node-sdk`**, **`ffcpe-app-builder-actions`** |
| 2. Deploy to App Builder | Adobe I/O Runtime | **`ffcpe-app-builder-actions`** |
| 3. Author `<action-name>.entry.json` (co-located with web/worker) | — | **`ffcpe-catalog-entry-json`** ([CLI plugin repo](https://github.com/adobe/aio-cli-plugin-ffcpe)) |
| 4. Validate and register | [`@adobe/aio-cli-plugin-ffcpe`](https://github.com/adobe/aio-cli-plugin-ffcpe) (`aio ffcpe catalog …`) | **`aio-ffcpe-cli`** ([CLI plugin repo](https://github.com/adobe/aio-cli-plugin-ffcpe)) |

Install **all four skills** (both repos) in one session:

```bash
npx skills add adobe/ffcpe-custom-node-sdk --all -y
npx skills add adobe/aio-cli-plugin-ffcpe --all -y
```

## Skills in this repo (SDK)

| Skill | Use when |
| ----- | -------- |
| **`ffcpe-custom-node-sdk`** | Installing packages (npm or pnpm), local SDK linking, HTTP submit/status contract, worker handlers, security |
| **`ffcpe-app-builder-actions`** | Scaffolding web/worker action pairs, `ext.config.yaml`, webpack + TypeScript in App Builder repos |

## Skills in the CLI plugin repo

Bundled in [adobe/aio-cli-plugin-ffcpe](https://github.com/adobe/aio-cli-plugin-ffcpe) under `skills/`:

| Skill | Use when |
| ----- | -------- |
| **`aio-ffcpe-cli`** | Installing the plugin, auth, `aio ffcpe catalog` commands (validate, register, list, update, …) |
| **`ffcpe-catalog-entry-json`** | Authoring or reviewing catalog entry JSON — prefer **`<action-name>.entry.json`** beside web/worker (ports, `customActionConfig`, discovery fields) |

## Adobe I/O CLI plugin (quick install)

The plugin manages catalog entries against the run-workflow API. It uses the same IMS session as **`aio login`**.

```bash
# Adobe I/O CLI (Node 18+)
npm install -g @adobe/aio-cli

# FFCPE catalog plugin
aio plugins:install @adobe/aio-cli-plugin-ffcpe

# Auth and org context
aio login
aio console org select

# Validate and register a catalog entry
aio ffcpe catalog validate --file ./actions/my-action/my-action.entry.json
aio ffcpe catalog register --file ./actions/my-action/my-action.entry.json
```

Full command reference: [aio-cli-plugin-ffcpe README](https://github.com/adobe/aio-cli-plugin-ffcpe).

## Install agent skills

### From GitHub (consumer App Builder repo)

**SDK skills** (this repo):

```bash
npx skills add adobe/ffcpe-custom-node-sdk --all -y
```

**CLI + catalog JSON skills** ([CLI plugin repo](https://github.com/adobe/aio-cli-plugin-ffcpe)):

```bash
npx skills add adobe/aio-cli-plugin-ffcpe --all -y
```

Install specific skills:

```bash
npx skills add adobe/ffcpe-custom-node-sdk \
  --skill ffcpe-custom-node-sdk \
  --skill ffcpe-app-builder-actions \
  -y

npx skills add adobe/aio-cli-plugin-ffcpe \
  --skill aio-ffcpe-cli \
  --skill ffcpe-catalog-entry-json \
  -y
```

Target Claude Code and Cursor explicitly:

```bash
npx skills add adobe/ffcpe-custom-node-sdk --all -a claude-code -a cursor -y
npx skills add adobe/aio-cli-plugin-ffcpe --all -a claude-code -a cursor -y
```

Global install (available in every project on your machine):

```bash
npx skills add adobe/ffcpe-custom-node-sdk --all -g -y
npx skills add adobe/aio-cli-plugin-ffcpe --all -g -y
```

### From a local checkout

SDK skills (this monorepo):

```bash
npx skills add ./skills --all -y
```

CLI plugin skills (clone of [aio-cli-plugin-ffcpe](https://github.com/adobe/aio-cli-plugin-ffcpe)):

```bash
npx skills add /path/to/aio-cli-plugin-ffcpe --all -y
```

### Update or remove

```bash
npx skills update ffcpe-custom-node-sdk ffcpe-app-builder-actions aio-ffcpe-cli ffcpe-catalog-entry-json
npx skills remove ffcpe-custom-node-sdk ffcpe-app-builder-actions
```

## Layout (this repo)

```
skills/
├── README.md
├── ffcpe-custom-node-sdk/
│   ├── SKILL.md
│   └── references/
│       └── quick-reference.md
└── ffcpe-app-builder-actions/
    └── SKILL.md
```

The `npx skills` CLI symlinks (or copies) from each repo’s `skills/` folder into agent directories — for example `.claude/skills/` (Claude Code) and `.agents/skills/` (Cursor). One canonical copy per repo keeps guidance identical across agents.
