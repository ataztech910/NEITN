# 13 — Build Pipeline v0

## Purpose

Provide a single reliable build command while preserving atomic debug commands.

The full pipeline should support:

```txt
validate -> doctor -> code:test -> code:build -> compile
```

---

## Commands

### `wf code:test`

Runs tests for code node source files.

Expected test locations:

```txt
code/**/*.test.ts
code/**/__tests__/*.test.ts
```

---

### `wf code:build`

Builds code node source files.

Input:

```txt
code/**/*.ts
code/**/*.js
```

Output:

```txt
dist/code/**/*.js
```

---

### `wf compile`

Compiles DSL into n8n workflow JSON.

Behavior:

- does not run tests
- if `jsCodeFrom` exists, automatically runs or requires code build
- injects compiled JS into `parameters.jsCode`

Recommended default:

```txt
wf compile automatically runs code:build when jsCodeFrom is present
```

---

### `wf build`

Full pipeline:

```txt
wf validate
wf doctor
wf code:test
wf code:build
wf compile
```

This is the recommended CI command.

---

## Flags

### `wf build --skip-tests`

Runs:

```txt
validate -> doctor -> code:build -> compile
```

### `wf build --skip-doctor`

Runs:

```txt
validate -> code:test -> code:build -> compile
```

### `wf compile --no-code-build`

Fails if compiled code is missing.

Useful for CI environments that build code separately.

---

## Failure Behavior

### `wf code:test`

Fails if any test fails.

### `wf code:build`

Fails if code compilation fails.

### `wf compile`

Fails if:

- validation fails
- `jsCodeFrom` source missing
- compiled code missing
- compiled code empty
- code build fails

### `wf build`

Fails on first failed step.

---

## CI Usage

```bash
wf build
```

---

## Local Usage

### YAML-only change

```bash
wf compile .
```

### Code node change

```bash
wf build .
```

### Debug code only

```bash
wf code:test .
wf code:build .
```

---

## Output

`wf build` should end with compiled workflow:

```txt
dist/<flow.id>.workflow.json
```

---

## Design Principles

- atomic commands for debugging
- full pipeline for safety
- deterministic output
- no hidden dist mutation except documented build artifacts
- compile remains fast and usable

---

## Acceptance Criteria

- `wf code:test` works
- `wf code:build` works
- `wf compile` handles `jsCodeFrom`
- `wf build` runs the full pipeline
- `wf build --skip-tests` works
- `wf build --skip-doctor` works
- errors are human-readable
- CI can use `wf build`

---

## Codex Prompt

```text
Implement Build Pipeline v0.

Read:
- docs/12-code-node-source-files-v0.md
- docs/13-build-pipeline-v0.md

Tasks:
1. Add CLI command wf code:test.
2. Add CLI command wf code:build.
3. Add CLI command wf build.
4. wf build must run:
   validate -> doctor -> code:test -> code:build -> compile.
5. Implement flags:
   --skip-tests
   --skip-doctor
   --no-code-build for compile.
6. wf compile should auto-build code when jsCodeFrom exists unless --no-code-build is set.
7. Ensure all failures stop the pipeline.
8. Add tests for command sequencing and failure behavior.

Rules:
- keep commands deterministic
- do not change patch or migration behavior
- keep output human-readable
```
