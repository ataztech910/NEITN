# Scenario 03 — Data Enrichment Pipeline

## Goal

Generate a multi-step enrichment flow.

## Codex prompt

```text
Use the n8n workflow editor skill.

Create migration-compatible patch files only.
Write patches to .workflow/patches/.
Do not apply patches.

Create workflow:

manual_trigger
→ fetch_users_http
→ normalize_users_code
→ enrich_users_http
→ merge_enrichment_code
→ send_telegram_summary

Requirements:
- include data contracts
- fetch_users_http outputs users
- normalize_users_code outputs user_id, email, name
- enrich_users_http outputs user_id, company, score
- merge_enrichment_code outputs total_users and high_score_count
- telegram summary references only total_users and high_score_count
- do not create flow.yaml
```

## Expected nodes

- manual_trigger
- fetch_users_http
- normalize_users_code
- enrich_users_http
- merge_enrichment_code
- send_telegram_summary

## Verification

```bash
wf migrate .
wf validate .
wf doctor .
wf compile .
```

## Pass criteria

- all nodes exist
- linear graph compiles
- doctor does not report missing summary fields
