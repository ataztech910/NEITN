# 10 — Local n8n Runtime Integration (Roadmap Extension)

## Purpose

Add optional local runtime support using Docker for running n8n alongside the DSL system.

This allows:

- local testing of compiled workflows
- easier debugging of real executions
- full development loop without external infrastructure

---

## Scope

This phase is OPTIONAL and must not affect core workflow DSL functionality.

Core system must work without Docker or n8n runtime.

---

## Commands

### Option A — extend init

```bash
wf init <project> --with-n8n
```

### Option B — separate command (preferred)

```bash
wf n8n:init
```

---

## Generated Files

```txt
docker-compose.yml
.env.example
.n8n/
```

Optional (not auto-created):

```txt
.env
```

---

## docker-compose.yml

Minimal services:

- n8n
- postgres

Example structure:

```yaml
version: '3.8'

services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    env_file:
      - .env
    depends_on:
      - postgres
    volumes:
      - ./.n8n:/home/node/.n8n

  postgres:
    image: postgres:14
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## .env.example

```env
N8N_PORT=5678
N8N_HOST=localhost
N8N_PROTOCOL=http
N8N_ENCRYPTION_KEY=change_me_32_chars_min

POSTGRES_USER=n8n
POSTGRES_PASSWORD=change_me
POSTGRES_DB=n8n
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=change_me
```

---

## .gitignore additions

```txt
.env
.n8n/
postgres_data/
```

---

## Usage Flow

```bash
wf compile
docker compose up -d
```

Then:

- open http://localhost:5678
- import workflow JSON from `dist/`

---

## Future Extensions

### CLI integrations

```bash
wf n8n:start
wf n8n:stop
wf n8n:logs
wf n8n:import dist/<flow>.workflow.json
wf n8n:export
```

---

## Security Rules

- never commit `.env`
- never include real credentials in repo
- only `.env.example` is tracked
- users must manually create `.env`

---

## Acceptance Criteria

- docker-compose starts successfully
- n8n UI accessible locally
- Postgres used as database
- workflows can be imported manually
- no secrets committed

---

## Non-goals

- no cloud deployment
- no secret management
- no runtime orchestration beyond local docker

---

## Position in Roadmap

Add after:

- Patch engine
- Migrations
- Node contracts

Before:

- Advanced AI skill improvements
- Production deployment features

---

## Codex Prompt

```text
Implement optional n8n runtime bootstrap.

Tasks:
1. Add command wf n8n:init
2. Generate docker-compose.yml
3. Generate .env.example
4. Add .gitignore entries
5. Do not override existing files without confirmation
6. Keep implementation simple and deterministic

Rules:
- runtime is optional
- do not affect DSL or compiler
- do not add secrets
```
