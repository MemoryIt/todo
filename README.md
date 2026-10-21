# Todo

A small full-stack Todo app built with Bun, Hono, Vite, and React, organized as
a TypeScript monorepo.

## Stack

- [Bun](https://bun.sh) — runtime and package manager
- [Hono](https://hono.dev) — backend API
- [Vite](https://vitejs.dev) + [React](https://react.dev) — frontend
- [Turbo](https://turbo.build) — monorepo task runner
- TypeScript types shared between client and server

## Structure

```
.
├── client/             # Vite + React SPA
├── server/             # Hono API (in-memory todo store)
├── shared/             # Shared TypeScript types
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
| GET    | `/api/health`   | Health check (`{ ok: true }`)   |

Todos are stored in an in-memory `Map` inside the server process and are
cleared when the process restarts.

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

## Architecture

C4 diagrams live in [`docs/architecture`](docs/architecture). Render them with:

```bash
bun run diagrams:render
```
