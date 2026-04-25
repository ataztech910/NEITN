# Patch Examples

These files are the canonical patch shape for AI agents.

## Simple Start Prompt

This is the shortest intended first prompt for an AI agent:

```text
Use the neitn skill for this project.

Add:
- a webhook node `lead_webhook`
- an HTTP Request node `send_lead`
- a connection from `lead_webhook` to `send_lead`
- set `flow.entry` to `lead_webhook`
```

For the first demo, the agent should follow the two examples below:

- `create-webhook-http-flow.patch.json`
- `set-flow-entry.patch.json`

Use these rules:

- prefer `op` instead of `type`
- prefer `target` instead of `path`
- use `payload` for `create_file`
- use `updates` for `update_fields`

Examples:

- `create-webhook-http-flow.patch.json`
- `set-flow-entry.patch.json`

For DSL YAML files:

- `payload` should usually be an object

For source files such as `code/*.ts`:

- `payload` may be a string with the file contents

## Demo Guidance

For the first demo:

- prefer webhook + http request + edge + flow entry
- avoid Code node patching until the basic patch flow is confirmed
- copy the example field shape exactly

These operational defaults are assumed by the skill and do not need to be repeated in the user prompt:

- create patch files under `.workflow/patches/`
- choose a timestamped descriptive filename automatically
- use the canonical patch shape from these examples
