# Changelog

## 0.1.0

First public release of `neitn`.

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
