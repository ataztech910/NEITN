# Agents Documentation

## n8n Workflow Editor Skill

### DSL Conventions

For generated node DSL:
- Do not include `credentials: {}` when credentials are empty
- Use `ui.column` starting from 1
- Use `ui.row` starting from 1
- Keep ids snake_case
- Keep Patch Schema v0 unchanged