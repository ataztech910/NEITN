# Scenario 05 — Refactor Existing Flow

## Goal

Test incremental AI edits on an existing flow.

## Setup

Run this scenario after a flow already exists with:

manual_trigger -> http_request -> telegram_send

## Codex prompt

```text
Use the n8n workflow editor skill.

Create migration-compatible patch files only.
Write patches to .workflow/patches/.
Do not apply patches.

Refactor the existing workflow:

1. Insert deduplicate_code between http_request and telegram_send
2. Change telegram_send text to:
   "Processed {{$json.count}} unique records"
3. Add or update contracts so doctor understands count is produced before telegram_send
4. Do not rewrite unrelated nodes
5. Do not create flow.yaml
```

## Verification

```bash
wf migrate .
wf validate .
wf doctor .
wf compile .
```

## Pass criteria

- deduplicate_code exists
- graph routes http_request -> deduplicate_code -> telegram_send
- telegram_send text changed
- doctor does not warn that count is missing
