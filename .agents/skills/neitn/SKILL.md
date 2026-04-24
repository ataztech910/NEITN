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

Primary behavior contract:
- `../../../docs/neitn/06-ai-skill-contract-v0.md`

Supporting references:
- `../../../docs/neitn/README.md`
- `../../../docs/neitn/roadmap.md`
- `../../../docs/neitn/next-roadmap-docs-11-14/README.md`
