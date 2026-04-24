# 12 — Code Node Source Files v0

## Purpose

Support external source files for n8n Code nodes.

This prevents huge inline `jsCode` blocks from bloating YAML, patches, and AI context.

---

## Problem

Real n8n Code nodes often contain large JavaScript blocks:

```json
{
  "parameters": {
    "jsCode": "const item = $input.first();\n..."
  }
}
```

This is hard to:

- read
- test
- version
- patch
- maintain
- review

---

## Solution

Allow node DSL to reference source code files:

```yaml
id: normalize_input
name: Normalize Input
type: n8n-nodes-base.code
typeVersion: 2
params:
  jsCodeFrom: code/normalize_input.ts
```

Compiler/build pipeline injects compiled JavaScript into final n8n JSON:

```json
{
  "parameters": {
    "jsCode": "compiled javascript here"
  }
}
```

---

## Directory Structure

```txt
code/
  normalize_input.ts
  classify_idea.ts
  validate_packaging.ts
  __tests__/
    normalize_input.test.ts

dist/
  code/
    normalize_input.js
```

---

## DSL Field

### `params.jsCodeFrom`

```yaml
params:
  jsCodeFrom: code/normalize_input.ts
```

Rules:

- path is relative to project root
- must point to `.ts` or `.js`
- intended mainly for `n8n-nodes-base.code`
- must not be emitted into final workflow JSON

---

## Mutual Exclusion

A node must not contain both:

```yaml
params:
  jsCode: "..."
  jsCodeFrom: code/file.ts
```

If both are present, validation must fail.

---

## Build Behavior

For each `jsCodeFrom` node:

1. Resolve source file
2. Build TypeScript/JavaScript
3. Read compiled JS
4. Replace `params.jsCodeFrom` with `parameters.jsCode`
5. Do not include `jsCodeFrom` in compiled JSON

---

## TypeScript Model

Source files should be authored as plain n8n Code node code.

Example:

```ts
const item = $input.first();
const body = item.json.body ?? item.json;

return [
  {
    json: {
      input: body,
    },
  },
];
```

The build process should preserve executable code for n8n.

---

## Testing

Tests may live in:

```txt
code/**/*.test.ts
code/**/__tests__/*.test.ts
```

Run:

```bash
wf code:test
```

---

## Important Runtime Note

n8n Code node runtime has globals such as:

- `$input`
- `$json`
- `$()`
- `items`

TypeScript tests may need mocks for these.

---

## Compile Behavior

### Input

```yaml
params:
  jsCodeFrom: code/normalize_input.ts
```

### Output

```json
"parameters": {
  "jsCode": "const item = $input.first();\n..."
}
```

---

## Validation Rules

Validator must check:

- `jsCodeFrom` path exists, or build step must fail clearly
- `jsCode` and `jsCodeFrom` are not both present
- referenced file has supported extension
- compiled JS is not empty

---

## Non-goals

- no full n8n runtime emulation
- no automatic semantic validation of code output
- no automatic contract inference from TypeScript
- no bundling external npm packages in v0 unless explicitly supported

---

## Acceptance Criteria

- Code node can reference `code/*.ts`
- `wf code:build` builds source files
- `wf compile` injects compiled JS into `parameters.jsCode`
- compiled workflow has no `jsCodeFrom`
- inline `jsCode` still works for small nodes
- tests can be run with `wf code:test`

---

## Codex Prompt

```text
Implement Code Node Source Files v0.

Read:
- docs/12-code-node-source-files-v0.md
- docs/03-compile-contract-v0.md
- docs/12-build-pipeline-v0.md

Tasks:
1. Add support for params.jsCodeFrom in node DSL.
2. Validate that jsCode and jsCodeFrom are mutually exclusive.
3. Implement code source discovery.
4. Implement wf code:build.
5. Build code/*.ts or code/*.js into dist/code/*.js.
6. During wf compile, replace jsCodeFrom with compiled jsCode.
7. Ensure compiled workflow JSON does not include jsCodeFrom.
8. Keep inline jsCode support working.
9. Add tests for:
   - jsCodeFrom injection
   - jsCode/jsCodeFrom conflict
   - missing source file
   - empty compiled output

Rules:
- keep implementation minimal
- do not emulate n8n runtime
- do not alter patch schema
```
