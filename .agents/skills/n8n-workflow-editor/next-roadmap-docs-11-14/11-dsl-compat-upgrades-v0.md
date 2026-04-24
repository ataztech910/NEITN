# 11 — DSL Compatibility Upgrades v0

## Purpose

Extend the DSL so it can represent real-world exported n8n workflows more faithfully.

This is required before importing larger existing workflows and compiling them back without losing important node metadata.

---

## Scope

This document adds support for:

1. `typeVersion`
2. `extra` top-level node fields
3. better credential references
4. preserving n8n-specific node metadata

---

## Problem

Current DSL v0 is intentionally minimal:

```yaml
id: http_request
name: HTTP Request
type: n8n-nodes-base.httpRequest
params: {}
```

But real n8n workflows contain fields such as:

```json
{
  "typeVersion": 4.2,
  "webhookId": "idea-evaluator",
  "retryOnFail": true,
  "credentials": {}
}
```

If unsupported, these fields are lost during import/compile.

---

## DSL Additions

### `typeVersion`

Optional field on each node:

```yaml
id: webhook_lead
name: Webhook Lead
type: n8n-nodes-base.webhook
typeVersion: 2
params:
  path: lead-intake
```

### Rules

- If present, compiler must use it.
- If absent, compiler may default to `1`.
- Supports integers and decimals:
  - `1`
  - `2`
  - `2.2`
  - `4.2`

---

## `extra`

Optional object for n8n top-level node fields not covered by DSL.

Example:

```yaml
id: webhook_lead
name: Webhook Lead
type: n8n-nodes-base.webhook
typeVersion: 2
params:
  path: lead-intake
extra:
  webhookId: idea-evaluator
```

Compiler output:

```json
{
  "id": "webhook_lead",
  "name": "Webhook Lead",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "parameters": {
    "path": "lead-intake"
  },
  "webhookId": "idea-evaluator"
}
```

---

## Compiler Merge Rule

Compiler builds node object in this order:

```text
base node fields
+ credentials if present
+ extra if present
```

`extra` must not override core fields:

- id
- name
- type
- typeVersion
- parameters
- position
- credentials

If `extra` attempts to override these fields, compiler must fail.

---

## Credentials

Credentials remain references only.

Example:

```yaml
credentials:
  httpHeaderAuth: anthropic_header_auth
```

No secrets are stored in DSL.

If imported n8n credentials contain `{ id, name }`, importer should preserve only the safe reference name.

---

## Compile Behavior

### Input DSL

```yaml
id: provider_switch
name: Provider Switch
type: n8n-nodes-base.if
typeVersion: 2.2
params:
  conditions: {}
ui:
  column: 4
  row: 1
extra:
  notesInFlow: true
```

### Output JSON

```json
{
  "id": "provider_switch",
  "name": "Provider Switch",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2.2,
  "position": [1200, 200],
  "parameters": {
    "conditions": {}
  },
  "notesInFlow": true
}
```

---

## Validation Rules

Validator must check:

- `typeVersion`, if present, is a number
- `extra`, if present, is an object
- `extra` does not contain protected keys
- credentials values are strings or safe credential references

---

## Non-goals

- no credential secret storage
- no n8n API credential lookup
- no semantic validation of every n8n node field

---

## Acceptance Criteria

- imported workflows preserve `typeVersion`
- imported workflows preserve safe top-level node metadata via `extra`
- compiler emits `typeVersion` from DSL
- compiler merges `extra` safely
- compile fails if `extra` overrides protected fields

---

## Codex Prompt

```text
Implement DSL compatibility upgrades v0.

Read:
- docs/01-dsl-v0.md
- docs/03-compile-contract-v0.md
- docs/11-dsl-compat-upgrades-v0.md

Tasks:
1. Add optional node.typeVersion support.
2. Compiler must use node.typeVersion if present, otherwise default to 1.
3. Add optional node.extra object.
4. Compiler must merge extra into compiled node output.
5. Prevent extra from overriding protected fields:
   id, name, type, typeVersion, parameters, position, credentials.
6. Update validator to check typeVersion and extra.
7. Add tests for typeVersion 2, 2.2, 4.2.
8. Add tests for extra.webhookId.
9. Add test that extra.id fails.

Rules:
- do not change patch schema
- do not change dist artifact format except intended fields
- keep output deterministic
```
