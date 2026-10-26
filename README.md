# Todo

A small full-stack Todo app built with Bun, Hono, Vite, and React, organized as
a TypeScript monorepo.

## Stack

- [Bun](https://bun.sh) — runtime and package manager
- [Hono](https://hono.dev) — backend API
- [SQLite](https://bun.sh/docs/api/sqlite) — persistence via Bun's built-in `bun:sqlite`
- [Vite](https://vitejs.dev) + [React](https://react.dev) — frontend
- [CopilotKit](https://www.copilotkit.ai) + [Mastra](https://mastra.ai) — Todo agent
- [AG-UI](https://docs.ag-ui.com) — protocol between the runtime and the agent
- [Turbo](https://turbo.build) — monorepo task runner
- TypeScript types shared between client and server

## Structure

```
.
├── client/             # Vite + React SPA + collapsible agent sidebar
├── server/             # Hono API (SQLite todo store) + composition root
├── ai/                 # Embedded AI edge (CopilotKit runtime + Mastra agent)
├── shared/             # Shared TypeScript types, AGENT_IDS, TodoPort
├── data/               # SQLite database (created at runtime, git-ignored)
├── docs/architecture/  # C4 diagrams
├── Dockerfile
└── docker-compose.yml
```

## API

| Method | Path            | Description                     |
| ------ | --------------- | ------------------------------- |
| GET    | `/api/todo`     | List todos (`{ todos }`)        |
| POST   | `/api/todo`     | Create a todo (`{ title }`)     |
| PATCH  | `/api/todo/:id` | Set completed (`{ completed }`) |
| DELETE | `/api/todo/:id` | Delete a todo                   |
| GET    | `/api/health`   | Health check (also probes the database) |
| POST   | `/api/copilotkit` | CopilotKit runtime (single-route) |

## Storage

Todos are persisted in SQLite through Bun's built-in `bun:sqlite` driver. The
connection is opened at boot from `DATABASE_PATH` (default `./data/todo.db`),
the schema is migrated automatically, and the same store backs both the HTTP API
and the Todo agent. WAL mode is enabled, and the connection is closed on
`SIGINT`/`SIGTERM` so the write-ahead log is checkpointed.

```bash
DATABASE_PATH=./data/todo.db   # :memory: for an ephemeral database
```

`data/` and `*.db*` files are git-ignored. Schema changes are versioned with
`PRAGMA user_version` in `server/src/db.ts` — append a new migration and bump
`SCHEMA_VERSION` instead of editing one that has shipped.

## Todo Agent (AI)

The AI edge lives in `ai/` and is embedded into the server process. It exposes
the CopilotKit runtime at `/api/copilotkit` and backs it with a Mastra agent
(`@ag-ui/mastra` over AG-UI 1.x). The agent uses **server-side tools** that call
the existing domain service through an in-process `TodoPort`:

| Tool | Behaviour |
| ---- | --------- |
| `listTodos` | List/search todos (optional status / query) |
| `addTodo` | Add a todo by title |
| `toggleTodo` | Mark completed / cancel completion by id |
| `removeTodo` | Delete by id |

The frontend has no tools: it only renders the official collapsible
`CopilotSidebar`. Because the agent mutates data outside React state, the
sidebar refetches the list after each run. The manual UI keeps working even
when the LLM is not configured — only the sidebar fails.

Configure the server-only model endpoint in `.env` (see `.env.example`):

```bash
LLM_BASE_URL=http://litellm-app:4000/v1   # must include /v1
LLM_API_KEY=<secret>
LLM_MODEL=deepseek/deepseek-v4-flash
```

`server` loads `.env` via `--env-file=../.env`; the LLM key never reaches the
client bundle.

## Development

```bash
bun install
bun run dev
```

- Vite dev server: <http://localhost:5173>
- Hono API: <http://localhost:3000> (Vite proxies `/api` to it)

## Build

```bash
bun run build
```

In production the Hono server serves the built client from `client/dist` and
the API from the same origin.

## Docker / Portainer

The repository ships a single-container image (`Dockerfile` +
`docker-compose.yml`).

```bash
docker compose up --build
```

The container listens on port 3000 and is not published to the host by default;
publish it (`ports: "3000:3000"`) or reach it through Portainer / an attached
proxy network. All environment variables have defaults — see `.env.example`.

Todos live in the `todo-data` named volume mounted at `/app/data`, so they
survive image rebuilds and container re-creation. SQLite is a single-writer
engine: keep this service at one replica and do not place the volume on a
network filesystem.

## Architecture

C4 diagrams live in [`docs/architecture`](docs/architecture). Render them with:

```bash
bun run diagrams:render
```
