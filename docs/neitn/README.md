# Modular n8n Workflow System

## Overview

This project defines a workflow-as-code system for n8n with AI-driven editing.

## Architecture

AI → Patch → Engine → Validate → Compile → n8n JSON

## Specs

- 01-dsl-v0.md — project structure
- 02-patch-schema-v0.md — how AI modifies state
- 03-compile-contract-v0.md — DSL → n8n mapping
- 04-engine-spec-v0.md — core runtime
- 05-cli-spec-v0.md — CLI interface
- 06-ai-skill-contract-v0.md — AI behavior rules

## Canonical AI References

- patch-schema.v0.json — machine-readable patch contract
- examples/README.md — canonical patch authoring rules
- examples/create-webhook-http-flow.patch.json — minimal creation example
- examples/set-flow-entry.patch.json — minimal update example

## Simple Start

For a fresh AI session, the intended shortest bootstrap is:

```text
Use the neitn skill for this project.
```

For the first patch demo, the intended short task is:

```text
Use the neitn skill for this project.

Add:
- a webhook node `lead_webhook`
- an HTTP Request node `send_lead`
- a connection from `lead_webhook` to `send_lead`
- set `flow.entry` to `lead_webhook`
```

This simple path is the primary supported demo flow.

The following are skill-level defaults and should not need to be repeated by the user:

- create patch files under `.workflow/patches/`
- choose a timestamped descriptive filename automatically
- use the canonical patch shape from the docs examples

## Roadmap

See roadmap.md
