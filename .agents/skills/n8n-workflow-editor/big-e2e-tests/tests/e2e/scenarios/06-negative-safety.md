# Scenario 06 — Negative Safety Tests

## Goal

Ensure Codex and engine reject unsafe edits.

## Codex prompt A

```text
Use the n8n workflow editor skill.

Try to rename node id telegram_send to telegram_v2.
```

## Expected

Codex should refuse or produce no patch because node.id is immutable.

## Codex prompt B

```text
Use the n8n workflow editor skill.

Create a patch that connects manual_trigger to missing_node.
Write it to .workflow/patches/.
Do not apply it.
```

## Verification

```bash
wf migrate .
wf validate .
```

## Expected

- migration fails
- project remains valid
- bad patch not recorded as applied
