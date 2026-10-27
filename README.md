# Todo

A small full-stack Todo app built with Bun, Hono, Vite, and React, organized as
a TypeScript monorepo.

## Stack

- [Bun](https://bun.sh) — runtime and package manager
- [Hono](https://hono.dev) — backend API
- [SQLite](https://bun.sh/docs/api/sqlite) — persistence via Bun's built-in `bun:sqlite`
- [Vite](https://vitejs.dev) + [React](https://react.dev) — frontend
- [CopilotKit](https://www.copilotkit.ai) + [Mastra](https://mastra.ai) — Todo agent
- [Langfuse](https://langfuse.com) — optional tracing for agent, tool, and model spans
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
├── data/               # SQLite databases (created at runtime, git-ignored)
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

Mastra agent memory is stored separately in `data/memory.db`, configurable with
`MEMORY_DATABASE_PATH` (default `./data/memory.db`). The AI edge creates the
file and its parent directory on first use, and keeps each AG-UI thread's
conversation history in Mastra's `mastra_threads` / `mastra_messages` tables.
The Mastra instance owns the single SQLite storage connection. Each agent owns
its own Memory instance, and Mastra injects the shared storage when the agent
first resolves it.

Semantic recall, working memory, and observational memory stay disabled. Message
history is bounded only by `messageHistory.maxTokens = 800_000`, so normal
conversations are sent in full without summarization; older messages are dropped
only if that budget is exceeded. This can produce large prompts and increase
latency and cost as a thread grows. In Docker, the memory file lives on the same
`todo-data` volume and is closed during graceful shutdown.

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

Conversation history is persisted by Mastra Memory in SQLite, so later turns in
the same AG-UI thread see the earlier messages without the browser resending
them. The history is scoped to the thread; starting a new thread starts a new
conversation. The deployment is single-user, so the agent id is also used as the
stable Memory `resource` id.

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

### Tracing

Langfuse tracing is opt-in and server-only. Set the Langfuse credentials and
origin in `.env` to export Mastra agent runs, tool calls, model generations, and
their nested spans:

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=http://langfuse-web:3000
```

`LANGFUSE_BASE_URL` must be the Langfuse origin, without `/api/public`;
`LANGFUSE_HOST` is also accepted as a fallback. Because tracing is optional, a
deployment without these keys keeps running normally.

The exporter uses `OTEL_SERVICE_NAME` (default `todo-ai`) as the service name and
records the CopilotKit thread id as the Langfuse session. Streaming model chunks
are excluded to keep trace volume down. Run with `LANGFUSE_REALTIME=true` to
flush after every event while debugging; production batches spans and flushes
them through `mastra.shutdown()` on `SIGINT`/`SIGTERM`.

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
proxy network.

`docker compose` forwards the server-only `LLM_*` and `LANGFUSE_*` variables
from `.env` into the container (see `.env.example`). Without them the todo UI
still works; only the agent sidebar fails. `NODE_ENV` and `PORT` are fixed by
the compose file, while `APP_TAG` and `BUN_IMAGE` are used at build time.

When tracing with a self-hosted Langfuse, make sure the app container can
resolve the configured `LANGFUSE_BASE_URL`; a Docker service name such as
`langfuse-web` only resolves when both containers share a network.

Todos live in the `todo-data` named volume mounted at `/app/data`, so they
survive image rebuilds and container re-creation. SQLite is a single-writer
engine: keep this service at one replica and do not place the volume on a
network filesystem.

## Architecture

C4 diagrams live in [`docs/architecture`](docs/architecture). Render them with:

```bash
bun run diagrams:render
```
