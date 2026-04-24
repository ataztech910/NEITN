# 15 — Code Node Scaffold and Import Split v0

## Purpose

Make n8n Code nodes maintainable by splitting imported inline `jsCode` into:

1. a pure TypeScript logic module
2. a thin n8n runtime wrapper
3. a test file

This turns large n8n Code nodes into testable TypeScript modules.

---

## Core Idea

Instead of storing all Code node logic as one inline block:

```yaml
params:
  jsCode: |
    const data = $input.first().json;
    return [{ json: { ok: true } }];
```

store a reference to a runtime wrapper:

```yaml
params:
  jsCodeFrom: code/assemble_final_response.runtime.ts
```

The runtime wrapper imports and calls a pure function:

```ts
import { assembleFinalResponse } from './assemble_final_response';

const data = $input.first().json;

return [{ json: assembleFinalResponse(data) }];
```

The pure function is testable without n8n:

```ts
export function assembleFinalResponse(data: any) {
  return {
    input: data.input,
    result: data.final_decision,
  };
}
```

---

## File Layout

For a Code node named:

```txt
Assemble Final Response
```

Normalized id:

```txt
assemble_final_response
```

Generated files:

```txt
code/
  assemble_final_response.ts
  assemble_final_response.runtime.ts
  __tests__/
    assemble_final_response.test.ts
```

Node DSL:

```yaml
id: assemble_final_response
name: Assemble Final Response
type: n8n-nodes-base.code
typeVersion: 2
params:
  jsCodeFrom: code/assemble_final_response.runtime.ts
```

---

## Responsibilities

### Pure logic file

Path:

```txt
code/<node_id>.ts
```

Purpose:

- contains business logic
- exports named functions
- does not access n8n globals directly
- can be unit tested

Example:

```ts
export function assembleFinalResponse(data: any) {
  const finalDecision = data.final_decision;

  return {
    input: data.input,
    llm: data.llm,
    validation: finalDecision.synthetic_validation,
    result: {
      decision: finalDecision.decision,
      confidence: finalDecision.confidence,
      reasoning: finalDecision.reasoning,
      action_plan: finalDecision.action_plan,
    },
  };
}
```

---

### Runtime wrapper file

Path:

```txt
code/<node_id>.runtime.ts
```

Purpose:

- reads from n8n runtime globals
- calls pure logic
- returns n8n-compatible array

Example:

```ts
import { assembleFinalResponse } from './assemble_final_response';

const data = $input.first().json;

return [{ json: assembleFinalResponse(data) }];
```

Runtime wrapper is the file referenced by `jsCodeFrom`.

---

### Test file

Path:

```txt
code/__tests__/<node_id>.test.ts
```

Purpose:

- imports pure logic
- tests without n8n runtime
- uses fixtures/mocks as plain objects

Example:

```ts
import { describe, expect, it } from 'vitest';
import { assembleFinalResponse } from '../assemble_final_response';

describe('assembleFinalResponse', () => {
  it('assembles final response', () => {
    const result = assembleFinalResponse({
      input: { idea: 'test' },
      llm: { provider: 'claude' },
      final_decision: {
        synthetic_validation: { pain_intensity: 5 },
        decision: 'GO',
        confidence: 0.7,
        reasoning: ['ok'],
        action_plan: [],
      },
    });

    expect(result.result.decision).toBe('GO');
    expect(result.validation.pain_intensity).toBe(5);
  });
});
```

---

## Import Behavior

When importing existing n8n JSON with Code nodes, importer should split each Code node.

### Input

```json
{
  "name": "Assemble Final Response",
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "const data = $input.first().json;\nreturn [{ json: data }];"
  }
}
```

### Output files

```txt
code/assemble_final_response.ts
code/assemble_final_response.runtime.ts
code/__tests__/assemble_final_response.test.ts
```

### Output node

```yaml
params:
  jsCodeFrom: code/assemble_final_response.runtime.ts
```

---

## Import Split Strategy v0

Automatic perfect extraction of pure logic from arbitrary inline n8n code is hard.

So v0 should use a safe mechanical strategy.

### Strategy A — safe wrapper fallback

For imported code, create:

```txt
code/<node_id>.ts
```

with a placeholder pure function:

```ts
export function <camelNodeId>Logic(input: unknown) {
  return input;
}
```

And create:

```txt
code/<node_id>.runtime.ts
```

with the original n8n code preserved as-is.

This guarantees import/build compatibility but does not fully modularize logic.

### Strategy B — assisted extraction marker

When importer can safely detect this pattern:

```ts
const data = $input.first().json;
// logic
return [{ json: SOME_OBJECT }];
```

it may generate:

```ts
export function <camelNodeId>(data: any) {
  // extracted logic
  return SOME_OBJECT;
}
```

and wrapper:

```ts
import { <camelNodeId> } from './<node_id>';

const data = $input.first().json;

return [{ json: <camelNodeId>(data) }];
```

### MVP decision

Use Strategy A by default.

Add optional flag later:

```bash
wf import workflow.json --extract-code-logic
```

For now:

```bash
wf import workflow.json
```

must preserve behavior first.

---

## Scaffold Command

Add command:

```bash
wf code:scaffold <node_id>
```

Example:

```bash
wf code:scaffold assemble_final_response
```

Creates:

```txt
code/assemble_final_response.ts
code/assemble_final_response.runtime.ts
code/__tests__/assemble_final_response.test.ts
```

---

## Scaffold With Node

Optional:

```bash
wf code:scaffold assemble_final_response --node
```

Creates:

```txt
nodes/assemble_final_response.yaml
```

Example node:

```yaml
id: assemble_final_response
name: Assemble Final Response
type: n8n-nodes-base.code
typeVersion: 2
params:
  jsCodeFrom: code/assemble_final_response.runtime.ts
ui:
  column: 1
  row: 1
```

---

## Naming Rules

Input id must be normalized:

```txt
Assemble Final Response -> assemble_final_response
assemble-final-response -> assemble_final_response
assemble_final_response -> assemble_final_response
```

Function name uses camelCase:

```txt
assemble_final_response -> assembleFinalResponse
```

Files use snake_case.

---

## Generated Templates

### Pure logic template

```ts
export function assembleFinalResponse(data: any) {
  return data;
}
```

---

### Runtime wrapper template

```ts
import { assembleFinalResponse } from './assemble_final_response';

const data = $input.first().json;

return [{ json: assembleFinalResponse(data) }];
```

---

### Test template

```ts
import { describe, expect, it } from 'vitest';
import { assembleFinalResponse } from '../assemble_final_response';

describe('assembleFinalResponse', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = assembleFinalResponse(input);

    expect(result).toEqual(input);
  });
});
```

---

## Build Integration

`wf code:build` must build runtime wrappers.

For a node using:

```yaml
params:
  jsCodeFrom: code/assemble_final_response.runtime.ts
```

compiler injects the built wrapper output into `parameters.jsCode`.

The pure logic module may be bundled into the runtime output.

---

## Test Integration

`wf code:test` runs tests against pure logic modules.

It should not need n8n runtime.

---

## AI Skill Update

When AI creates a new Code node, it should prefer this structure:

```txt
code/<node_id>.ts
code/<node_id>.runtime.ts
code/__tests__/<node_id>.test.ts
nodes/<node_id>.yaml
```

AI should edit pure logic files when changing business logic.

AI should edit runtime wrappers only when changing n8n input/output integration.

---

## Patch Behavior

Patch files may create or update:

```txt
code/*.ts
code/**/*.test.ts
nodes/*.yaml
edges/*.yaml
```

For a new Code node, AI patch should usually include:

1. `create_file` for pure logic
2. `create_file` for runtime wrapper
3. `create_file` for test
4. `create_file` for node YAML
5. `update_fields` for edges

---

## Validation Rules

Validator should check:

- `jsCodeFrom` points to a runtime file if using split convention
- runtime file exists
- imported pure logic file exists if referenced
- test file is optional but recommended

Doctor may warn:

```txt
INFO: Code node assemble_final_response has no test file
```

---

## Non-goals

- no automatic perfect refactoring of arbitrary inline jsCode
- no full n8n runtime simulation
- no automatic type inference
- no mandatory tests in v0 unless `wf build` requires them

---

## Acceptance Criteria

This feature is complete when:

- `wf code:scaffold <node_id>` creates logic/runtime/test files
- `wf code:scaffold <node_id> --node` also creates node YAML
- imported Code nodes use `jsCodeFrom`
- imported Code nodes preserve original runtime behavior
- `wf code:test` can test pure logic
- `wf code:build` builds runtime wrapper
- `wf compile` injects built JS into n8n JSON
- AI can edit pure logic without touching workflow JSON

---

## Codex Prompt

```text
Implement Code Node Scaffold and Import Split v0.

Read:
- docs/12-code-node-source-files-v0.md
- docs/13-build-pipeline-v0.md
- docs/14-import-existing-workflow-v0.md
- docs/15-code-node-scaffold-and-import-split-v0.md

Tasks:
1. Add CLI command wf code:scaffold <node_id>.
2. Normalize node_id to snake_case.
3. Generate:
   - code/<node_id>.ts
   - code/<node_id>.runtime.ts
   - code/__tests__/<node_id>.test.ts
4. Generate camelCase function name from node_id.
5. Add --node flag to also create nodes/<node_id>.yaml.
6. For imported Code nodes, generate split files:
   - code/<node_id>.ts
   - code/<node_id>.runtime.ts
   - code/__tests__/<node_id>.test.ts
7. For v0 import, preserve original jsCode in runtime wrapper when safe extraction is not implemented.
8. Set node params.jsCodeFrom to code/<node_id>.runtime.ts.
9. Ensure wf code:test works against generated tests.
10. Ensure wf code:build bundles runtime wrapper and pure module.
11. Ensure wf compile injects built runtime JS into parameters.jsCode.
12. Add tests for:
    - scaffold files
    - scaffold --node
    - import code split
    - build/compile injection
    - no jsCodeFrom in final workflow JSON

Rules:
- preserve behavior first
- do not attempt unsafe automatic refactoring
- pure logic extraction can be conservative in v0
- keep output deterministic
```
