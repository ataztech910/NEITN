# 08 — Patch Migrations v0

## Purpose

Define how patch files can be applied as ordered migrations.

This extends the current patch flow:

- `wf apply <patch-file>` applies one patch manually
- `wf migrate` applies all pending patches in order

The goal is to make workflow changes reproducible, auditable, and safe.

---

## Core idea

Patch files are not only one-off proposals.

They can also behave like database migrations:

1. AI creates patch files in `.workflow/patches/`
2. CLI detects which patches have not been applied
3. CLI applies pending patches in deterministic order
4. CLI records applied patches in state
5. CLI never applies the same patch twice

---

## Directory structure

Add:

```txt
.workflow/
  patches/
  logs/
  state/
    applied-patches.json
```

---

## Patch file location

All migration patches live in:

```txt
.workflow/patches/
```

Only files matching this pattern are considered migration candidates:

```txt
*.patch.json
```

---

## Patch ordering

Patches are applied in lexicographic filename order.

Recommended filename format:

```txt
YYYY-MM-DDTHH-MM-SS-<slug>.patch.json
```

Example:

```txt
2026-04-24T10-00-00-create-manual-http-telegram.patch.json
2026-04-24T10-05-00-update-telegram-message.patch.json
```

This gives deterministic ordering without needing a separate sequence system.

---

## Patch id

Migration-compatible patch files SHOULD contain a stable `id` field.

Example:

```json
{
  "version": 1,
  "id": "2026-04-24T10-00-00-create-manual-http-telegram",
  "targetProject": "skill_test_flow",
  "summary": "Create manual HTTP Telegram workflow",
  "operations": []
}
```

### Rules

- `id` must be unique within the project
- `id` should match the filename without `.patch.json`
- `id` must not change after the patch is applied

---

## Backward compatibility

Patch files without `id` may still be applied with `wf apply <file>`.

For `wf migrate`, if `id` is missing, CLI may derive patch id from filename.

Recommended behavior:

```txt
patch id = basename(filename, ".patch.json")
```

---

## Applied patch state

State file:

```txt
.workflow/state/applied-patches.json
```

Shape:

```json
{
  "version": 1,
  "applied": [
    {
      "id": "2026-04-24T10-00-00-create-manual-http-telegram",
      "file": ".workflow/patches/2026-04-24T10-00-00-create-manual-http-telegram.patch.json",
      "sha256": "abc123",
      "appliedAt": "2026-04-24T10:05:00.000Z"
    }
  ]
}
```

---

## Hashing rule

Before recording a patch as applied, CLI computes SHA-256 of the patch file content.

If a patch id already exists in applied state:

### Case 1 — same hash

Skip patch.

```txt
✓ skipped already applied patch
```

### Case 2 — different hash

Fail migration.

```txt
✖ patch id already applied with different hash
```

This prevents silent mutation of historical patches.

---

# `wf migrate`

## Purpose

Apply all pending patches in `.workflow/patches/`.

## Signature

```bash
wf migrate [path]
```

If path is omitted, use current directory.

## Behavior

1. Load project
2. Load applied patch state
3. Find `.workflow/patches/*.patch.json`
4. Sort lexicographically by filename
5. For each patch:
   - resolve patch id
   - compute sha256
   - skip if already applied with same hash
   - fail if already applied with different hash
   - apply patch using the same engine as `wf apply`
   - validate final project state
   - persist project files
   - record applied state
6. Print summary

---

## Important rule

Each patch must be applied atomically.

If patch N fails:

- project files must not be partially changed by patch N
- patch N must not be recorded as applied
- patches after N must not run

Patches before N remain applied.

---

## Output example

```txt
Applying pending patches:

✓ 2026-04-24T10-00-00-create-manual-http-telegram
✓ 2026-04-24T10-05-00-update-telegram-message

2 applied, 0 skipped
```

If already applied:

```txt
No pending patches.
3 already applied.
```

If hash mismatch:

```txt
Migration failed:
Patch 2026-04-24T10-00-00-create-manual-http-telegram was already applied with a different hash.
Historical patch files must not be modified.
```

---

# `wf migration-status`

Optional v0+ command.

Shows applied and pending patches.

Signature:

```bash
wf migration-status [path]
```

Output example:

```txt
Applied:
- 2026-04-24T10-00-00-create-manual-http-telegram
- 2026-04-24T10-05-00-update-telegram-message

Pending:
- 2026-04-24T10-10-00-insert-logger
```

This command is useful but not required for the first migration implementation.

---

## Interaction with `wf apply`

`wf apply <patch-file>` remains supported.

Recommended behavior:

- applies one patch immediately
- does not require patch to live in `.workflow/patches`
- may optionally record it if the file is inside `.workflow/patches`

MVP decision:

```txt
wf apply = manual one-off application, does not update migration state
wf migrate = migration application, updates migration state
```

This keeps behavior simple and explicit.

---

## AI skill rule update

For workflow-editing tasks, AI should create migration-compatible patch files.

Required patch file behavior:

- save file in `.workflow/patches/`
- filename must be lexicographically ordered
- include stable `id`
- `id` should match filename without `.patch.json`
- do not apply patch unless explicitly requested

Example filename:

```txt
.workflow/patches/2026-04-24T10-00-00-update-telegram-message.patch.json
```

Example patch header:

```json
{
  "version": 1,
  "id": "2026-04-24T10-00-00-update-telegram-message",
  "targetProject": "skill_test_flow",
  "summary": "Update Telegram message",
  "operations": []
}
```

---

## Safety rules

### Never modify applied patches

Once a patch is applied through `wf migrate`, it must be treated as immutable.

If a correction is needed, create a new patch.

### Do not auto-delete patches

Patch files are source history. They should remain in `.workflow/patches/`.

### Do not migrate dist artifacts

Migration only mutates DSL source files:

- `flow.yaml`
- `nodes/*.yaml`
- `edges/*.yaml`

It must never modify:

- `dist/*.workflow.json`

---

## Acceptance criteria

Patch migrations v0 is complete when:

- `wf migrate` finds pending patches
- applies them in deterministic order
- skips already applied patches
- records applied patches with hash
- rejects modified already-applied patches
- fails atomically on invalid patch
- does not apply later patches after a failure
- leaves `wf apply` working as before

---

## Suggested tests

### Test 1 — apply pending patch

Given:
- one patch in `.workflow/patches/`
- empty applied state

Expected:
- patch applied
- state file created
- patch recorded

### Test 2 — skip already applied patch

Given:
- same patch already recorded with same hash

Expected:
- patch skipped
- no project changes

### Test 3 — reject modified applied patch

Given:
- patch id already recorded
- patch file content changed

Expected:
- migration fails
- clear hash mismatch diagnostic

### Test 4 — stop on invalid patch

Given:
- two pending patches
- first valid
- second invalid
- third valid

Expected:
- first applied
- second fails
- third not applied

### Test 5 — deterministic order

Given:
- multiple patch files

Expected:
- apply lexicographically by filename

---

## Codex implementation prompt

Use this prompt to implement the migration layer:

```text
Implement patch migrations v0.

Read:
- docs/02-patch-schema-v0.md
- docs/04-engine-spec-v0.md
- docs/07-patch-delivery-and-execution-flow.md
- docs/08-patch-migrations-v0.md

Tasks:
1. Add `.workflow/state/applied-patches.json` support.
2. Implement `wf migrate [path]`.
3. Find pending patch files in `.workflow/patches/*.patch.json`.
4. Sort patches lexicographically by filename.
5. Resolve patch id from `patch.id`, or from filename if missing.
6. Compute sha256 for each patch file.
7. Skip patch if id already applied with same hash.
8. Fail if id already applied with different hash.
9. Apply pending patches using existing patch engine.
10. After each successful patch, record id, file, sha256, appliedAt.
11. Stop migration on first failure.
12. Ensure failed patch is not recorded as applied.
13. Ensure later patches are not applied after failure.
14. Keep `wf apply` behavior unchanged.
15. Add tests for:
    - apply pending patch
    - skip already applied patch
    - reject modified applied patch
    - stop on invalid patch
    - deterministic patch order

Rules:
- do not mutate dist artifacts
- migration applies only DSL source changes
- keep output human-readable
- keep implementation minimal and deterministic
```
