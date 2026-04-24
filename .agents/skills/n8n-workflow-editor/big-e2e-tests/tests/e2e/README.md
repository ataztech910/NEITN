# E2E Scenario Runner Notes

Each scenario is manual-assisted for now.

Recommended flow:

```bash
rm -rf <project-name>
wf init <project-name>
cd <project-name>
```

Then give Codex the scenario prompt from `scenarios/*.md`.

After Codex creates patches:

```bash
wf migrate .
wf validate .
wf doctor .
wf compile .
cat dist/*.workflow.json
cat .workflow/state/applied-patches.json
```
