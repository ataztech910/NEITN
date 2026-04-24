# 07 — Patch Delivery and Execution Flow v0

## Purpose

Define how AI-generated patches are delivered, stored, reviewed, and applied in the system.

This closes the loop between:

AI → Patch → Engine → Validate → Compile

---

## Core Principle

AI does NOT modify project files directly.

AI MUST:
- generate a patch file
- store it in a predictable location
- follow Patch Schema v0 strictly

System MUST:
- apply patch
- validate project
- compile output

---

## Directory Structure

Add this to your project:

```
.workflow/
  patches/
  logs/
```

### Explanation

- `patches/` — AI-generated patch files
- `logs/` — results of apply / validate / compile

---

## Patch File Naming Convention

Format:

```
<timestamp>-<action>.patch.json
```

Example:

```
2026-04-23T12-30-00-create-initial-flow.patch.json
```

### Rules

- ISO timestamp
- kebab-case action description
- always `.patch.json`

---

## Patch File Location

All patches MUST be saved to:

```
.workflow/patches/
```

Never store patches in:
- root
- docs
- nodes/
- edges/

---

## Patch Content Rules

Each patch file MUST:

- follow Patch Schema v0
- include:
  - version
  - targetProject
  - summary
  - operations[]

### Forbidden

- raw YAML file dumps
- mixed text + JSON
- partial patches
- missing `reason`

---

## Execution Flow

### Step 1 — AI generates patch

Output:

```
.workflow/patches/<file>.patch.json
```

---

### Step 2 — Review (optional but recommended)

User or system reviews:

- operations
- affected files
- intent

---

### Step 3 — Apply patch

Command:

```
neitn apply <patch-file>
```

Example:

```
neitn apply .workflow/patches/2026-04-23T12-30-00-create-initial-flow.patch.json
```

---

### Step 4 — Validate

```
neitn validate
```

Must pass before continuing.

---

### Step 5 — Compile

```
neitn compile
```

Output:

```
dist/<flow.id>.workflow.json
```

---

## Logs

After each operation, system MAY write logs:

```
.workflow/logs/
  apply.log
  validate.log
  compile.log
```

---

## Failure Handling

### Patch failure

If patch fails:

- DO NOT modify project files
- return diagnostics
- log error

---

### Validation failure

If validation fails:

- abort compile
- display errors
- require fix

---

## Safe Mode (Recommended)

Before applying patch:

- preview changes
- show affected files
- confirm action

Future CLI:

```
neitn apply --dry-run <patch>
```

---

## Anti-Patterns (Forbidden)

AI must NOT:

- edit files directly
- regenerate entire project
- modify dist/*
- skip patch layer
- output raw file content as main result

---

## Minimal Working Loop

```
User → AI → patch.json
      → neitn apply
      → neitn validate
      → neitn compile
```

---

## System Responsibility Split

| Component | Responsibility |
|----------|--------------|
| AI | Generate patch |
| Patch file | Transport change |
| Engine | Apply patch |
| Validator | Ensure correctness |
| Compiler | Build workflow |

---

## Why This Matters

This flow gives:

- determinism
- auditability
- reproducibility
- safety
- version control compatibility

---

## Definition of Done

Flow is correct when:

- AI always outputs patch file
- patches are stored in `.workflow/patches`
- engine applies patches safely
- validation passes
- compile produces valid workflow JSON

---

## Next Step

After implementing this flow:

- integrate into CLI
- connect AI → patch generation
- run end-to-end tests
