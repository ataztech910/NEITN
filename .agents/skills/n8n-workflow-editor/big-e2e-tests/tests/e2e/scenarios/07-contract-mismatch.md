# Scenario 07 — Contract Mismatch Detection

## Goal

Ensure wf doctor catches missing fields.

## Codex prompt

```text
Use the n8n workflow editor skill.

Create migration-compatible patch files only.
Write patches to .workflow/patches/.
Do not apply patches.

Create workflow:

manual_trigger
→ http_request
→ telegram_send

Set http_request contract output to only:
- email: string

Set telegram_send text to reference:
- {{$json.name}}

Set telegram_send input contract to require:
- name: string

Do not create flow.yaml.
```

## Verification

```bash
wf migrate .
wf validate .
wf doctor .
```

## Expected doctor warning

telegram_send requires or uses field `name`, but upstream does not provide it.
