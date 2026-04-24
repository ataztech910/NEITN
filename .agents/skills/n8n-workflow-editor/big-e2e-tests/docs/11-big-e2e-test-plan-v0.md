# 11 — Big E2E Test Plan v0

## Purpose

Validate that the system can generate, migrate, validate, doctor, and compile larger workflow projects.

Core loop:

```txt
wf init <project>
AI creates patches in .workflow/patches/
wf migrate .
wf validate .
wf doctor .
wf compile .
```

## Global pass criteria

A scenario passes when:

- Codex creates patch files only
- patches are stored in `.workflow/patches/`
- patch files follow Patch Schema v0
- `wf migrate .` succeeds
- `wf validate .` succeeds
- `wf doctor .` has no critical data-flow warnings for intended fields
- `wf compile .` succeeds
- compiled JSON contains expected nodes and connections
- repeated `wf migrate .` skips already applied patches
