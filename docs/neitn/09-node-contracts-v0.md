# 09 — Node Contracts and Data Flow v0

## Purpose

Introduce a lightweight data contract system for nodes to enable:

- AI to reason about data flow
- validation of field usage
- safer workflow composition
- advisory diagnostics (not hard failures)

This does NOT affect n8n runtime output.
This is an internal DSL enhancement only.

---

## Core Idea

Each node may declare:

- what data it expects (input)
- what data it produces (output)

This is optional but recommended.

---

## DSL Extension

Add optional `contract` field to node files:

```yaml
contract:
  input:
    fields:
      email: string
      name: string
  output:
    fields:
      email: string
      status: string
```

---

## Field Types (v0)

Keep simple:

- string
- number
- boolean
- object
- any

No nesting enforcement in v0.

---

## Examples

### HTTP Node

```yaml
contract:
  output:
    fields:
      email: string
      name: string
```

---

### Code Node

```yaml
contract:
  input:
    fields:
      email: string
  output:
    fields:
      email: string
      normalized: boolean
```

---

### Telegram Node

```yaml
contract:
  input:
    fields:
      email: string
```

---

## Expression Awareness

System should detect usage like:

```text
={{ $json.email }}
```

Extract referenced fields:
- email

---

## New CLI Command

```bash
wf doctor
```

---

## Doctor Checks (Warnings only)

### 1. Missing upstream field

If node uses `$json.email` but upstream does not provide `email`:

```text
WARN: Node telegram_send uses field 'email' not declared in upstream contract
```

---

### 2. IF node condition mismatch

If IF checks field not present:

```text
WARN: IF node checks 'status' but upstream does not define it
```

---

### 3. Contract mismatch

If node declares input fields not provided:

```text
WARN: Node expects 'user_id' but upstream does not provide it
```

---

### 4. Missing contract (optional)

```text
INFO: Node http_request has no contract defined
```

---

## Behavior Rules

- `wf validate` remains strict structural validation
- `wf doctor` is advisory only
- no blocking errors in v0

---

## Compile Behavior

Contracts must NOT be included in compiled workflow JSON.

They are ignored by compiler.

---

## AI Skill Update

AI should:

- generate `contract` when possible
- infer fields from context
- not hallucinate complex schemas
- keep contracts minimal

---

## Example AI Output

```yaml
id: http_request
contract:
  output:
    fields:
      email: string
```

---

## Acceptance Criteria

- DSL supports contract field
- compile ignores contract
- `wf doctor` detects field mismatches
- no breaking changes to existing system

---

## Codex Prompt

```text
Implement node contracts and wf doctor.

Tasks:
1. Extend node DSL with optional contract field
2. Do not break existing loader/validator/compile
3. Implement expression parser to extract $json.field references
4. Build upstream field set per node via graph traversal
5. Implement wf doctor:
   - missing upstream field
   - IF mismatch
   - input contract mismatch
   - missing contract info (optional)
6. Output warnings, not errors
7. Add tests for:
   - valid flow
   - missing field usage
   - IF mismatch
   - contract mismatch

Rules:
- do not modify compile output
- contracts are internal only
- keep implementation simple
```
