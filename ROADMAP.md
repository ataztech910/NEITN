# neitn Roadmap

## Product Direction

`neitn` is a workflow engineering toolkit for n8n and agentic workflow runtimes.

It starts as a workflow-as-code layer for n8n:

```txt
AI -> patch -> migrate -> validate -> doctor -> build -> compile -> n8n workflow JSON
```

Over time, it grows into a portable workflow engineering and runtime control layer:

```txt
neitn DSL
├─ n8n target
└─ ADK target
```

The goal is not to replace n8n immediately. The goal is to make workflows versioned, testable, migratable, AI-editable, and portable.

---

## v0.1 — Core MVP

### Status

Mostly implemented / in progress.

### Scope

- `neitn init`
- `neitn validate`
- `neitn doctor`
- `neitn compile`
- `neitn apply`
- `neitn migrate`
- Patch Schema v0
- migration-compatible patch files
- AI-generated patch workflow
- basic DSL:
  - `flow.yaml`
  - `nodes/*.yaml`
  - `edges/*.yaml`
- n8n workflow JSON compile target
- basic import/export fidelity

### Goal

Prove the core loop works:

```txt
DSL -> patch/migrate -> validate -> doctor -> compile
```

### Acceptance Criteria

- AI can create migration patch files
- patches can be migrated safely
- workflow graph validates
- data-flow doctor runs
- n8n JSON compiles successfully
- repeated migrations skip already applied patches

---

## v0.2 — Production-Safe Workflow-as-Code

### Scope

- snapshots before migration
- rollback support
- `neitn snapshot`
- `neitn rollback`
- `neitn rollback <snapshot-id>`
- `neitn migration-status`
- `neitn diff`
- better import round-trip checks
- stricter validation
- stable project metadata

### Snapshot Strategy

Use snapshot restore, not reverse patches.

Before applying a migration patch, store:

```txt
.workflow/snapshots/<timestamp>-before-<patch-id>/
  flow.yaml
  nodes/
  edges/
  code/
  .workflow/state/
```

### Goal

Make workflow changes safe enough for real projects.

### Acceptance Criteria

- every migration can be rolled back
- failed migrations do not corrupt the project
- historical patches remain immutable
- users can inspect pending/applied migrations
- users can preview changes before applying them

---

## v0.3 — Code Node Engineering

### Scope

- `params.jsCodeFrom`
- external source files for n8n Code nodes
- code split:
  - pure logic module
  - runtime wrapper
  - unit test
- `neitn code:scaffold`
- `neitn code:scaffold <node_id> --node`
- `neitn code:test`
- `neitn code:build`
- `neitn build`
- import Code nodes into split source structure

### Code Node Structure

```txt
code/
  assemble_final_response.ts
  assemble_final_response.runtime.ts
  __tests__/
    assemble_final_response.test.ts
```

Node DSL:

```yaml
params:
  jsCodeFrom: code/assemble_final_response.runtime.ts
```

### Goal

Turn large inline n8n Code nodes into testable TypeScript modules.

### Acceptance Criteria

- imported Code nodes are extracted from inline `jsCode`
- runtime wrappers are compiled and injected into final n8n JSON
- pure logic can be unit tested without n8n runtime
- final compiled workflow contains `parameters.jsCode`
- final compiled workflow does not contain `jsCodeFrom`

---

## v0.4 — n8n Integration

### Scope

- `neitn n8n:init`
- local Docker Compose scaffold
- `.env.example`
- `.gitignore` updates
- Postgres-backed local n8n
- credential references
- `neitn n8n:import`
- `neitn n8n:export`
- optional n8n API deploy/import

### Runtime Bundle

```txt
docker-compose.yml
.env.example
.n8n/
```

### Goal

Close the loop with real n8n runtime usage.

### Acceptance Criteria

- local n8n starts with Docker Compose
- compiled workflows can be imported into n8n
- exported n8n workflows can be imported back into DSL
- secrets are not committed
- credential references are preserved safely

---

## v0.5 — AI Workflow Authoring

### Scope

- hardened `AGENTS.md`
- workflow editor skill templates
- patch request templates
- migration patch generation rules
- AI-safe refactor patterns
- large E2E scenario suite
- node template library
- workflow recipe library

### Goal

Make AI reliably create and modify large workflows without directly editing generated artifacts.

### Acceptance Criteria

- AI consistently writes patches to `.workflow/patches/`
- AI does not edit `dist/*`
- AI creates migration-compatible patch files with stable ids
- AI can insert, remove, and refactor nodes through patches
- AI can create multi-step migration sequences
- generated workflows pass `validate`, `doctor`, and `build`

---

## v0.6 — ADK Runtime Adapter Prototype

### Scope

- `neitn compile --target adk`
- generate ADK-compatible project/app
- map neitn/n8n-style nodes to ADK execution units
- support initial node types:
  - webhook/input
  - code
  - httpRequest
  - if
  - respondToWebhook
- n8n-style item model:
  ```txt
  [{ json: ... }]
  ```
- minimal expression resolver:
  ```txt
  $json.foo
  $input.first().json
  $('Node Name').first().json
  ```

### Goal

Use ADK as the execution substrate while preserving n8n-like workflow semantics.

### Non-Goal

Do not build a custom runtime server in this version.

### Acceptance Criteria

- a simple workflow can compile to ADK
- code nodes can execute through generated ADK app structure
- HTTP nodes can be represented as ADK tools/functions
- IF branches route correctly
- n8n-style item payloads are preserved across steps

---

## v0.7 — Runtime Control Plane

### Scope

- Postgres-backed run database
- run history
- step history
- logs
- artifacts
- errors
- deployment records
- CLI process monitor:
  - `neitn runs`
  - `neitn run <flow>`
  - `neitn logs <run-id>`
  - `neitn inspect <run-id>`
  - `neitn retry <run-id>`
  - `neitn cancel <run-id>`

### Data Model

Minimum tables:

```txt
runs
run_steps
logs
artifacts
deployments
snapshots
```

Run statuses:

```txt
queued
running
success
failed
cancelled
```

### Goal

Provide visibility into workflow execution without building a visual workflow editor.

### Acceptance Criteria

- runs are recorded
- step logs are recorded
- failed runs can be inspected
- retries are possible
- users can see what version of a workflow was executed

---

## v0.8 — Deployment Layer

### Scope

- `neitn deploy --target n8n`
- `neitn deploy --target adk`
- deployment registry
- deployment rollback
- environment profiles:
  - dev
  - staging
  - prod
- deployment status tracking

### Goal

Move from local workflow engineering to deployable workflow operations.

### Acceptance Criteria

- compiled artifacts can be deployed to supported targets
- deployment history is stored
- rollback deployment is possible
- environment-specific configuration is supported
- secrets remain external to the repo

---

## v1.0 — Stable Public Release

### Scope

- stable DSL
- stable patch schema
- stable migration format
- stable compile targets
- production-ready import/export
- complete documentation
- example workflows
- E2E test suite
- CI-ready command set
- clean CLI UX

### Goal

Make `neitn` safe to publish and use as a serious open-source workflow engineering toolkit.

### Acceptance Criteria

- public README is complete
- install instructions are clear
- demo workflow works end-to-end
- migration/rollback are stable
- code-node testing is stable
- n8n import/export is reliable
- ADK target has documented limitations
- no known data-loss bugs in migration flow

---

## Recommended Implementation Order

```txt
v0.1 Core MVP
v0.2 Rollback / diff / safety
v0.3 Code node engineering
v0.4 n8n integration
v0.5 AI authoring hardening
v0.6 ADK adapter
v0.7 Runtime control plane
v0.8 Deployment layer
v1.0 Stable release
```

---

## Strategic Positioning

`neitn` is not just a DSL.

It is:

```txt
Git + migrations + TypeScript + AI-safe editing for workflows
```

Short positioning:

```txt
Versioned, testable workflows for n8n and agentic runtimes.
```

Long positioning:

```txt
neitn turns n8n workflows into modular, testable, versioned source files that AI can safely edit through migration patches. It compiles back to n8n today and is designed to target agentic runtimes such as ADK next.
```
