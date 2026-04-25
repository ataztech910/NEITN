---
name: neitn
description: Edit modular neitn workflow projects through DSL and Patch Schema v0. Use when the task involves flow.yaml, nodes/*.yaml, edges/*.yaml, patch generation, validation, or compile planning. Do not use for general app coding unrelated to workflow DSL.
---

## DSL Conventions

For generated node DSL:
- Do not include `credentials: {}` when credentials are empty
- Use `ui.column` starting from 1
- Use `ui.row` starting from 1
- Keep ids snake_case
- Keep Patch Schema v0 unchanged

## Patch Output Rules

These are neitn defaults and should not need to be repeated by the user.

When the AI can write files in the project:
- Create a new patch file under `.workflow/patches/`
- Choose a timestamped filename in the form `YYYY-MM-DDTHH-mm-ss-short-description.patch.json`
- Write only valid Patch Schema v0 JSON into that file
- Do not return prose instead of creating the patch file

When the AI cannot write files:
- Return only valid Patch Schema v0 JSON
- Do not mix prose with the JSON block

## Simple Start

The shortest intended first prompt is:

```text
Use the neitn skill for this project.

Add:
- a webhook node `lead_webhook`
- an HTTP Request node `send_lead`
- a connection from `lead_webhook` to `send_lead`
- set `flow.entry` to `lead_webhook`
```

This simple form should be preferred for demos.

Primary behavior contract:
- `../../../docs/neitn/06-ai-skill-contract-v0.md`

Supporting references:
- `../../../docs/neitn/README.md`
- `../../../docs/neitn/patch-schema.v0.json`
- `../../../docs/neitn/examples/README.md`
- `../../../docs/neitn/examples/create-webhook-http-flow.patch.json`
- `../../../docs/neitn/examples/set-flow-entry.patch.json`
- `../../../docs/neitn/roadmap.md`
- `../../../docs/neitn/next-roadmap-docs-11-14/README.md`
