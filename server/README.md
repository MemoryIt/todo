# server

Hono API for the Todo application, running on Bun.

- `src/store.ts` — in-memory `Map` store
- `src/domain.ts` — title validation and business rules
- `src/api.ts` — `/api/todo` routes
- `src/index.ts` — app assembly, `/api/health`, production static serving

Run from the repository root with `bun run dev`, or directly:

```sh
bun --watch run src/index.ts
```

The server listens on `:3000` (override with `PORT`). In production
(`NODE_ENV=production`) it also serves the built client from `../client/dist`.
