# Scenario 01 — Lead Intake

## Goal

Generate a lead intake workflow with validation and notifications.

## Codex prompt

```text
Use the n8n workflow editor skill.

Create migration-compatible patch files only.
Do not edit workflow DSL files directly.
Do not apply patches.
Write patches to .workflow/patches/.

Create a workflow:

webhook_lead
→ normalize_lead
→ validate_lead
→ if_lead_valid

If valid:
  → send_telegram_success
  → crm_create_lead

If invalid:
  → send_telegram_error

Requirements:
- use snake_case ids
- include node contracts
- include expressions only for fields declared in upstream contracts
- create patches as ordered migrations with stable ids
- do not create flow.yaml if project already exists
- do not edit dist/*
```

## Expected nodes

- webhook_lead
- normalize_lead
- validate_lead
- if_lead_valid
- send_telegram_success
- crm_create_lead
- send_telegram_error

## Verification

```bash
wf migrate .
wf validate .
wf doctor .
wf compile .
cat dist/*.workflow.json
```

## Pass criteria

- compiled JSON has all expected nodes
- IF branch has true and false outputs
- doctor does not warn about expected fields missing
