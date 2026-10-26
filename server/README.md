# server

Hono API for the Todo application, running on Bun.

- `src/db.ts` — SQLite connection (pragmas), versioned migrations, row mapping
- `src/store.ts` — `TodoStore` contract + `createSqliteTodoStore()` (the
  in-memory implementation is kept for tests and embedded use)
- `src/domain.ts` — title/completion validation and business rules
- `src/api.ts` — `/api/todo` routes
- `src/index.ts` — app assembly, `/api/health`, database lifecycle,
  production static serving
- `test/` — `bun:test` suites; `test/contract/` holds the shared store/service
  contracts that both implementations must satisfy

Run from the repository root with `bun run dev`, or directly:

```sh
bun --watch run src/index.ts
```

The server listens on `:3000` (override with `PORT`). In production
(`NODE_ENV=production`) it also serves the built client from `../client/dist`.

## Database

Todos are stored in SQLite via `bun:sqlite`, opened from `DATABASE_PATH`
(default `./data/todo.db`; the parent directory is created on boot). Migrations
are applied at startup using `PRAGMA user_version`, so append a new entry to
`MIGRATIONS` and bump `SCHEMA_VERSION` in `src/db.ts` instead of editing an
existing statement.

The database file is a single-writer resource: run one process per file and do
not keep it on a network filesystem. `SIGINT`/`SIGTERM` close the connection so
the WAL is checkpointed. `/api/health` returns `503` when the probe fails.

## Tests

```sh
bun test
```
