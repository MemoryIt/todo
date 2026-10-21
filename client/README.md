# client

Vite + React single-page app for the Todo application.

- `src/api.ts` — HTTP client for `/api/todo`
- `src/useTodos.ts` — todo state hook (load, add, toggle, remove)
- `src/TodoControls.tsx` — Composer / Filter / Stats
- `src/TodoList.tsx` — List / Item
- `src/App.tsx` — todo homepage

Run from the repository root with `bun run dev` (Vite on `:5173`, with `/api`
proxied to the Hono server on `:3000`).
