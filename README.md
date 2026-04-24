![neitn logo](neitn.png)

neitn>_

`neitn` is an AI-native CLI for modular n8n workflows.

Instead of editing one large exported n8n JSON file, `neitn` works with a project DSL:

- `flow.yaml`
- `nodes/*.yaml`
- `edges/*.yaml`
- `code/*.ts`
- `code/*.runtime.ts`
- `code/__tests__/*.test.ts`

This keeps AI tasks smaller, diffs cleaner, and Code nodes testable.

## Why This Exists

Raw n8n workflow JSON is expensive for AI to edit well:

- too much context
- too easy to rewrite unrelated parts
- hard to patch safely
- hard to test Code nodes

`neitn` solves that by splitting workflow structure and code into small files, then compiling back to standard n8n workflow JSON.

## Install

### From npm

```bash
npm install -g neitn
```

### Local development

```bash
npm install
npm run build
npm run link:global
```

## Commands

```bash
neitn init my-flow
neitn validate .
neitn doctor .
neitn migrate .
neitn build .
neitn compile .
neitn import workflow.json
neitn code:scaffold assemble_final_response --node
neitn code:test .
neitn code:build .
```

## Workflow Lifecycle

### Import existing n8n workflow

```bash
neitn import workflow.json
```

This creates a modular project:

```txt
flow.yaml
nodes/
edges/
code/
dist/
```

### Validate and build

```bash
neitn validate .
neitn doctor .
neitn build .
```

### Compile only

```bash
neitn compile .
```

Output:

```txt
dist/<flow.id>.workflow.json
```

## Code Nodes

New Code nodes can be scaffolded:

```bash
neitn code:scaffold assemble_final_response --node
```

This generates:

```txt
code/assemble_final_response.ts
code/assemble_final_response.runtime.ts
code/__tests__/assemble_final_response.test.ts
nodes/assemble_final_response.yaml
```

The intended split is:

- `*.ts`: pure business logic
- `*.runtime.ts`: thin n8n runtime wrapper
- `__tests__/*.test.ts`: unit tests for pure logic

Build injects the compiled runtime wrapper into final n8n JSON as `parameters.jsCode`.

## AI Editing Model

`neitn` is built so an AI agent can make smaller, higher-quality changes.

Source of truth:

- `flow.yaml`
- `nodes/*.yaml`
- `edges/*.yaml`
- `code/*`

Generated artifact:

- `dist/*.workflow.json`

The intended editing pattern is:

1. read only affected DSL files
2. change the smallest possible set of files
3. run `neitn validate .`
4. run `neitn build .`

## Bundled Skills

The npm package includes the AI skills bundle under:

```txt
.agents/skills/neitn/
```

These files are intended for AI-assisted workflow editing, not for runtime execution.

They describe:

- DSL conventions
- patch/editing rules
- import/build behavior
- code node structure
- roadmap/spec decisions

If you install `neitn` from npm, the skills are shipped with the package so another agent can reuse the same editing contract with lower token cost.

The main skill entrypoint is:

```txt
.agents/skills/neitn/SKILL.md
```

The broader spec bundle lives under:

```txt
docs/neitn/
```

This keeps the installable skill entrypoint small while preserving the full AI contract and roadmap docs.

## Recommended Packaging Model

For distribution, treat `neitn` as two layers:

### Runtime layer

- CLI
- compiler
- validator
- import/build pipeline

### AI layer

- bundled skills
- workflow editing conventions
- specs and contract docs

That combination is what makes the system useful for AI-native workflow development.

## Current Scope

Included today:

- modular workflow DSL
- import from existing n8n workflow JSON
- validate / doctor / compile / build
- Code node scaffold
- Code node split runtime/pure/test files
- workflow round-trip fidelity improvements

Not the goal of v0:

- perfect automatic refactoring of arbitrary imported `jsCode`
- full n8n runtime simulation
- secret extraction or credential provisioning

## Example Flow

```bash
neitn import workflow.json
neitn build .
```

After that:

- edit `nodes/*.yaml`
- edit `code/*.ts`
- run tests with `neitn code:test .`
- rebuild with `neitn build .`

## Notes

- DSL internal edges use node ids
- final n8n JSON connections use node names
- `dist/*.workflow.json` is generated output, not the editable source format
