# Roadmap MVP — modular n8n workflow system

## Goal

Build a system where AI works with a modular workflow project instead of a monolithic n8n JSON export.

Target loop:

`AI -> patch -> apply -> validate -> compile -> workflow.json`

---

## Product foundation

The system has five core layers:

1. **DSL v0** — project source format
2. **Patch schema v0** — how AI requests changes
3. **Engine v0** — load, validate, apply, persist
4. **Compiler v0** — DSL to n8n workflow JSON
5. **CLI v0** — operational entrypoint

AI does not edit files directly.  
AI produces patches.  
The engine applies them.  
The compiler produces the final n8n artifact.

---

## Recommended implementation order

Do not start with the full compiler or a giant AI prompt.

Build in this order:

1. Skill contract
2. Engine core
3. Compiler v0
4. End-to-end tests
5. Expansion

---

# Phase 1 — AI skill contract

## Objective

Define how AI behaves when creating and editing workflow projects.

## Deliverables

- `docs/06-ai-skill-contract-v0.md`
- prompt template for system usage
- patch output rules
- file mutation rules
- safety and minimal-change rules

## Required rules

AI must:

- work through DSL only
- output patch JSON only
- avoid rewriting the whole project
- change only affected files
- never mutate `flow.id`
- never mutate `node.id`
- always provide a reason for each operation
- use `assert_exists` / `assert_not_exists` when appropriate

## Acceptance criteria

- AI can propose a valid patch for:
  - new workflow creation
  - node update
  - node insertion
  - node deletion
  - edge update
- AI never outputs full monolithic workflow JSON as the main edit format

---

# Phase 2 — Engine core v0

## Objective

Implement the model layer that loads DSL, validates it, applies patches, and writes changes back.

## Scope

### Loader
- read `flow.yaml`
- read `nodes/*.yaml`
- read `edges/*.yaml`
- parse YAML
- build in-memory model

### Validator
- schema validation
- duplicate node id detection
- missing node references
- invalid entry node
- duplicate identical edges
- self-loop detection

### Patch applier
- `assert_exists`
- `assert_not_exists`
- `create_file`
- `update_fields`
- `delete_file`
- `rename_file`

### Writer
- deterministic YAML serialization
- write only changed files

## Acceptance criteria

- project can be loaded from disk
- invalid projects produce diagnostics
- valid patches update project state correctly
- invalid patches fail cleanly
- only changed files are written back

---

# Phase 3 — Compiler v0

## Objective

Transform validated DSL into deterministic n8n workflow JSON.

## Scope

### Flow mapping
- `flow.name -> workflow.name`
- `flow.settings -> workflow.settings`
- `active = false`

### Node mapping
- `node.id -> node.id`
- `node.name -> node.name`
- `node.type -> node.type`
- `node.params -> node.parameters`
- `node.credentials -> node.credentials`
- `typeVersion = 1`
- `ui.column/row -> position[x,y]`

### Edge mapping
- group by `from`
- convert edges into n8n `connections`
- support branches:
  - `main`
  - `true`
  - `false`
  - `error`

### Output
- `dist/<flow.id>.workflow.json`

## Acceptance criteria

- same DSL always produces same JSON
- compiler refuses invalid project input
- generated JSON matches compile contract v0
- output is importable into n8n for basic supported cases

---

# Phase 4 — CLI v0

## Objective

Provide a single operational entrypoint.

## Commands

- `wf init`
- `wf validate`
- `wf compile`
- `wf apply`
- `wf doctor`
- `wf inspect`

## Minimum sequence

### `wf init`
Create project skeleton.

### `wf validate`
Run strict validation.

### `wf apply`
Apply AI patch to project.

### `wf compile`
Build final n8n JSON.

## Acceptance criteria

- all core commands work on a real local project
- exit codes are consistent
- output is human-readable
- `apply` is the only DSL mutation command

---

# Phase 5 — End-to-end testing

## Objective

Validate the whole loop, not just individual modules.

## Core scenarios

### Scenario 1 — Create workflow
Input: user asks AI to create a simple workflow  
Expected:
- project files created
- project validates
- compile succeeds

### Scenario 2 — Update one node
Input: change HTTP endpoint or Telegram text  
Expected:
- only target node file changes
- validation passes
- compile succeeds

### Scenario 3 — Insert node
Input: insert deduplication between two nodes  
Expected:
- new node file created
- edges updated
- compile succeeds

### Scenario 4 — Delete node
Input: remove a logging node  
Expected:
- node removed
- edges repaired
- validation passes

### Scenario 5 — Invalid patch
Input: patch references missing file or illegal id mutation  
Expected:
- patch rejected
- files unchanged

## Acceptance criteria

- each scenario is reproducible
- failures are diagnosable
- no silent corruption

---

# Suggested delivery order for Codex

## Sprint 1
- repo bootstrap
- types
- loader
- YAML parser
- project model

## Sprint 2
- validator
- diagnostics
- fixture projects
- `wf validate`

## Sprint 3
- compiler
- `wf compile`
- golden output tests

## Sprint 4
- patch applier
- YAML writer
- `wf apply`

## Sprint 5
- AI skill file
- e2e scenarios
- polishing CLI

---

# Technical priorities

## Priority 1
Determinism

The same input must always produce the same output.

## Priority 2
Minimal diffs

Only changed files should be rewritten.

## Priority 3
Strict contracts

Do not allow fuzzy patch semantics.

## Priority 4
Clear diagnostics

Errors must explain what is wrong and where.

## Priority 5
Local-first workflow

All operations should work cleanly on local files before any integrations.

---

# What not to build in MVP

Do not add these in v0:

- reverse import from arbitrary n8n exports
- runtime execution of nodes
- visual graph editor
- credential secret storage
- subflow composition
- plugin architecture
- collaborative editing
- AI auto-fix loops
- advanced graph layouting

These are later-stage concerns.

---

# Practical recommendation

The fastest safe path is:

1. finish the AI skill contract
2. implement engine core
3. implement compiler
4. wire CLI
5. test on 3–5 real workflows
6. only then expand scope

Do not try to build the whole system in one shot.

---

# Definition of MVP done

MVP is done when all of the following are true:

- a user can initialize a workflow project
- AI can generate a valid patch for common edits
- the engine can apply the patch safely
- the project validates after changes
- the compiler emits valid workflow JSON
- the JSON can be imported into n8n for supported basic cases

---

# Next immediate step

Write:

- `docs/06-ai-skill-contract-v0.md`

Then start implementation in this order:

- engine loader
- validator
- compiler
- patch applier
- CLI commands
- end-to-end tests
