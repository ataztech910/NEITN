# Scenario 04 — Migration Sequence

## Goal

Force Codex to create multiple ordered patches instead of one huge patch.

## Codex prompt

```text
Use the n8n workflow editor skill.

Create exactly four migration-compatible patch files in .workflow/patches/.
Do not edit workflow files directly.
Do not apply patches.

The four patches must be:

1. create base webhook -> http flow
2. add normalization code node between webhook and http
3. add IF branching after http
4. add telegram notifications for true and false branches

Requirements:
- filename order must match migration order
- each patch must include stable id
- do not create flow.yaml
- every patch must leave the project valid after it is applied
```

## Verification

```bash
wf migrate .
wf validate .
wf doctor .
wf compile .
wf migrate .
cat .workflow/state/applied-patches.json
```

## Pass criteria

- 4 patches applied first run
- second migrate skips 4 patches
- state has 4 applied entries
