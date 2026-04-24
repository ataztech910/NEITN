# Engine Spec v0

Core responsibilities:

- Load project
- Build in-memory model
- Validate
- Apply patch
- Prepare compile input

## Pipeline

files → model → validate → patch → validate → compile
