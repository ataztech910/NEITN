# Changelog

## 0.4.1

Stabilization release for the public `@neitn/cli` package.

Included in this release:

- scoped npm package name: `@neitn/cli`
- `help` / `--help` / `-h` CLI support
- `--version` / `-v` CLI support
- version output now reads from `package.json` instead of a hardcoded string
- runtime packaging fix for published CLI:
  - `esbuild` moved to runtime dependencies
- AI contract install flow:
  - `neitn init <name> --ai codex`
  - `neitn agents:install . --ai codex`
- stronger AI contract for patch generation:
  - patch files go to `.workflow/patches/`
  - timestamped patch filenames are a skill default
  - file-writing AI agents create patch files directly
- canonical patch authoring references for AI agents:
  - `docs/neitn/patch-schema.v0.json`
  - `docs/neitn/examples/README.md`
  - `docs/neitn/examples/create-webhook-http-flow.patch.json`
  - `docs/neitn/examples/set-flow-entry.patch.json`
- simplified demo UX:
  - user prompt can stay intent-only
  - patch path, filename convention, and patch shape are now skill-level defaults

Current model:

- humans primarily edit DSL files directly
- AI agents use the `neitn` skill and emit or create patch files
- `neitn` applies, validates, migrates, builds, and compiles
- `dist/*.workflow.json` remains generated output, not source of truth

## 0.1.0

First public release of `neitn`.

Published as:

- `@neitn/cli`

Included in this release:

- modular workflow DSL with `flow.yaml`, `nodes/*.yaml`, `edges/*.yaml`
- compile pipeline from DSL to standard n8n workflow JSON
- validate, doctor, build, compile, apply, and migrate commands
- import from existing n8n workflow JSON into DSL projects
- Code node scaffold with split files:
  - `code/<node_id>.ts`
  - `code/<node_id>.runtime.ts`
  - `code/__tests__/<node_id>.test.ts`
- TypeScript and JavaScript Code node build pipeline into `dist/code/*.js`
- workflow round-trip fidelity improvements for:
  - `typeVersion`
  - `webhookId`
  - workflow metadata
  - connection names in final n8n JSON
- bundled AI contract:
  - `.agents/AGENTS.md`
  - `.agents/skills/neitn/SKILL.md`
  - `docs/neitn/*`
- AI contract install into workflow projects:
  - `neitn init <name> --ai codex`
  - `neitn agents:install . --ai codex`

Current v0 model:

- humans work directly with the DSL files
- AI agents can edit DSL files directly or generate patch JSON
- `neitn` applies, validates, migrates, builds, and compiles
- `neitn` does not yet generate patches from natural language by itself
