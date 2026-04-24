Ок, давай сразу зафиксируем это как два полноценных spec-файла, чтобы ты мог отдать в Codex и он собрал это без догадок.

⸻

📄 11-code-node-source-files-v0.md

# Code Node Source Files (jsCodeFrom)

## Problem

Inline `jsCode` inside workflow nodes does not scale:
- hard to read
- impossible to test
- no typing
- bloats patches and AI context

## Solution

Allow referencing external TypeScript/JavaScript files:

```yaml
params:
  jsCodeFrom: code/normalize_input.ts

Directory Structure

code/
  normalize_input.ts
  classify_idea.ts
  validate_packaging.ts

  __tests__/
    normalize_input.test.ts

Compiled output:

dist/code/
  normalize_input.js

Compiler Behavior

During wf compile:
	1.	Detect nodes with jsCodeFrom
	2.	Resolve file path
	3.	Ensure code is built (run code:build if needed)
	4.	Load compiled JS
	5.	Inject into:

parameters.jsCode

	6.	Remove jsCodeFrom from final output

Supported Fields

params:
  jsCodeFrom: string

Mutually exclusive with:

params:
  jsCode: string

If both present → error.

Errors
	•	File not found → fail
	•	Build missing → auto-build or fail (see build spec)
	•	Empty output → fail

TypeScript Support
	•	Use esbuild or tsup
	•	Target: Node.js (same as n8n runtime)
	•	Output: CommonJS

Testing

Tests live in:

code/**/*.test.ts

Executed via:

wf code:test

Benefits
	•	typed code
	•	unit tests
	•	small YAML
	•	AI edits focused code files
	•	maintainable large workflows

---

# 📄 `12-build-pipeline-v0.md`

```md
# Build Pipeline

## Overview

Provide both atomic commands and a full pipeline.

## Commands

### wf code:test

Runs tests for code nodes:

code/**/*.test.ts

Fails on any error.

---

### wf code:build

Builds TypeScript code:

Input:

code/**/*.ts

Output:

dist/code/**/*.js

Tooling:
- esbuild or tsup

---

### wf compile

Compiles workflow DSL into n8n JSON.

Steps:

1. Load DSL
2. Resolve nodes
3. Process `jsCodeFrom`:
   - run `code:build` if needed
   - inject compiled JS into `parameters.jsCode`
4. Output workflow JSON

Behavior:
- does NOT run tests
- DOES auto-build code if needed

---

### wf build

Full pipeline:

wf validate
→ wf doctor
→ wf code:test
→ wf code:build
→ wf compile

This is the default command for:
- CI
- production builds

---

## Flags

### wf build

–skip-tests
–skip-doctor

### wf compile

–no-code-build

---

## Failure Modes

### compile

Fails if:
- jsCodeFrom file missing
- build fails
- injected code empty

### build

Fails if:
- tests fail
- doctor fails
- compile fails

---

## CI Usage

```bash
wf build


⸻

Local Development

Change YAML only

wf compile

Change code node

wf build


⸻

Design Principles
	•	Fast iteration (compile)
	•	Safe pipeline (build)
	•	Explicit debugging (code:test, code:build)

---
