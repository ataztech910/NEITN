# Patch Schema v0

Defines how AI modifies the project.

Canonical field shape for AI agents:

- `op`
- `target`
- `payload`
- `updates`
- `reason`

## Operations

- create_file
- update_fields
- delete_file
- rename_file
- assert_exists
- assert_not_exists

## Key Rules

- No direct file editing
- Patch must be minimal
- Final state must validate
- Create patch files under `.workflow/patches/`
- For DSL YAML files, use object `payload`
- For source files such as `code/*.ts`, `payload` may be a string

Machine-readable schema:

- `patch-schema.v0.json`

Canonical examples:

- `examples/create-webhook-http-flow.patch.json`
- `examples/set-flow-entry.patch.json`
