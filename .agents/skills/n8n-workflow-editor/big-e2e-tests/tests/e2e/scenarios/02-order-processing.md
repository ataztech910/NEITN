# Scenario 02 — Order Processing

## Goal

Generate order processing workflow with payment check and branches.

## Codex prompt

```text
Use the n8n workflow editor skill.

Create migration-compatible patch files only.
Do not edit workflow DSL files directly.
Do not apply patches.
Write patches to .workflow/patches/.

Create a workflow:

webhook_order
→ normalize_order
→ check_payment_http
→ if_paid

If paid:
  → create_invoice_code
  → send_telegram_paid

If unpaid:
  → send_telegram_failed

Requirements:
- include contracts for order_id, customer_email, amount, payment_status
- payment_status should be available before if_paid
- Telegram nodes must only reference available fields
- create ordered migration patch files
- do not create flow.yaml
```

## Expected nodes

- webhook_order
- normalize_order
- check_payment_http
- if_paid
- create_invoice_code
- send_telegram_paid
- send_telegram_failed

## Verification

```bash
wf migrate .
wf validate .
wf doctor .
wf compile .
```

## Pass criteria

- branches compile correctly
- doctor does not report missing order_id or payment_status
