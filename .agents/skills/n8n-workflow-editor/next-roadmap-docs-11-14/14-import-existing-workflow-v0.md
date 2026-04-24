# 14 — Import Existing n8n Workflow v0

## Purpose

Allow importing an existing n8n workflow JSON into the modular DSL project structure.

This is required for:

- demos
- migration from existing workflows
- AI patching on legacy workflows
- extracting large inline Code nodes into files

---

## Command

```bash
wf import existing-workflow.json
```

Optional:

```bash
wf import existing-workflow.json --extract-code
wf import existing-workflow.json --overwrite
```

---

## Input

A standard n8n workflow JSON:

```json
{
  "name": "Idea Evaluator MVP",
  "nodes": [],
  "connections": {},
  "settings": {},
  "active": false
}
```

---

## Output Structure

In current project root:

```txt
flow.yaml
nodes/
  <node_id>.yaml
edges/
  main.yaml
code/
  <node_id>.ts
```

If the project does not exist yet, importer may create the structure.

---

## Flow Mapping

### Input

```json
{
  "name": "Idea Evaluator MVP",
  "settings": {
    "executionOrder": "v1"
  },
  "active": false
}
```

### Output

```yaml
id: idea_evaluator_mvp
name: Idea Evaluator MVP
version: 1
entry: webhook
settings:
  executionOrder: v1
```

`entry` should be inferred as a node with no incoming edges, preferring webhook/manual trigger nodes.

---

## Node ID Normalization

n8n node names are human-readable and may contain spaces.

DSL ids must be snake_case.

Examples:

```txt
"Normalize Input" -> normalize_input
"LLM Step 1 - Claude Packaging" -> llm_step_1_claude_packaging
"DataForSEO CPC Competition" -> dataforseo_cpc_competition
```

Rules:

- lowercase
- spaces and separators become `_`
- remove unsupported characters
- collapse duplicate underscores
- ensure uniqueness with numeric suffix if needed

---

## Node Mapping

### Input

```json
{
  "id": "1f2a...",
  "name": "Normalize Input",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [-2260, 0],
  "parameters": {
    "jsCode": "const item = $input.first();"
  }
}
```

### Output

```yaml
id: normalize_input
name: Normalize Input
type: n8n-nodes-base.code
typeVersion: 2
params:
  jsCodeFrom: code/normalize_input.ts
ui:
  x: -2260
  y: 0
```

---

## UI Mapping

Imported workflows may use absolute n8n positions.

DSL should support import-preserving UI:

```yaml
ui:
  x: -2260
  y: 0
```

Compiler must prefer absolute `ui.x/ui.y` when present.

Fallback remains:

```txt
x = column * 300
y = row * 200
```

---

## Code Node Extraction

If node:

```json
"type": "n8n-nodes-base.code"
```

and:

```json
"parameters": {
  "jsCode": "..."
}
```

Then importer should:

1. create `code/<node_id>.ts`
2. move code into the file
3. replace node params with:

```yaml
params:
  jsCodeFrom: code/<node_id>.ts
```

### Code File Content

For v0, preserve original code as-is.

Do not wrap unless necessary.

---

## Non-code Parameters

All other `parameters` are stored as `params` unchanged.

Expressions remain strings.

Example:

```json
"jsonBody": "={{ { model: $json.llm.model } }}"
```

becomes:

```yaml
params:
  jsonBody: "={{ { model: $json.llm.model } }}"
```

No parsing.

---

## Top-level Node Fields

Known fields map directly:

- id
- name
- type
- typeVersion
- position
- parameters
- credentials

Unknown safe fields go to `extra`.

Example:

```json
{
  "webhookId": "idea-evaluator"
}
```

DSL:

```yaml
extra:
  webhookId: idea-evaluator
```

Compiler must merge `extra` back into final node JSON.

---

## Credentials Mapping

Input:

```json
"credentials": {
  "httpHeaderAuth": {
    "id": "abc",
    "name": "Anthropic Header Auth"
  }
}
```

Output:

```yaml
credentials:
  httpHeaderAuth: Anthropic Header Auth
```

Rules:

- do not store secret values
- preserve credential names where available
- if only id is available, store id as reference

---

## Connections Mapping

n8n connections use node names:

```json
"connections": {
  "Webhook": {
    "main": [
      [
        { "node": "Normalize Input", "type": "main", "index": 0 }
      ]
    ]
  }
}
```

DSL uses node ids:

```yaml
connections:
  - from: webhook
    to: normalize_input
```

Importer must build:

```txt
node.name -> node.id
```

and use that map.

---

## Branch Mapping

For n8n output slots:

- output index `0` -> `branch: true` or `main`
- output index `1` -> `branch: false`

For IF nodes:

```yaml
connections:
  - from: if_paid
    to: send_paid
    branch: true
  - from: if_paid
    to: send_failed
    branch: false
```

For non-IF nodes, output index 0 can omit branch.

---

## Compiler Compatibility

After import, this should work:

```bash
wf validate .
wf doctor .
wf build .
```

and produce an importable workflow JSON.

---

## Import Safety

If target files already exist:

- fail by default
- allow overwrite only with `--overwrite`

Importer must not overwrite existing files silently.

---

## Non-goals

- no automatic data contracts in v0
- no semantic code analysis
- no secret extraction
- no credential creation in n8n
- no perfect roundtrip for every n8n internal field

---

## Acceptance Criteria

- imports large n8n JSON
- creates `flow.yaml`
- creates one YAML file per node
- creates `edges/main.yaml`
- extracts Code node JS into `code/*.ts`
- preserves typeVersion
- preserves webhookId and other safe top-level fields via `extra`
- maps connections by name to DSL ids
- `wf validate` passes
- `wf build` compiles back to workflow JSON

---

## Codex Prompt

```text
Implement wf import for existing n8n workflows.

Read:
- docs/11-dsl-compat-upgrades-v0.md
- docs/12-code-node-source-files-v0.md
- docs/13-build-pipeline-v0.md
- docs/14-import-existing-workflow-v0.md

Tasks:
1. Add CLI command wf import <workflow.json>.
2. Parse n8n workflow JSON.
3. Create or update flow.yaml.
4. Normalize node names into stable snake_case ids.
5. Create one nodes/<id>.yaml per node.
6. Preserve node.name, node.type, node.typeVersion.
7. Map parameters -> params.
8. Extract Code node parameters.jsCode into code/<id>.ts and set params.jsCodeFrom.
9. Preserve credentials as safe references.
10. Preserve unknown safe top-level node fields in extra.
11. Convert n8n connections by node name into edges/main.yaml using DSL ids.
12. Infer flow.entry.
13. Do not overwrite existing files unless --overwrite is passed.
14. Add tests using a fixture workflow with:
    - webhook node
    - code node
    - http request node
    - if node
    - branch connections
    - webhookId
    - typeVersion 4.2

Rules:
- do not store secrets
- do not parse expressions
- preserve expressions as strings
- keep output deterministic
```
