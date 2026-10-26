# client

Vite + React single-page app for the Todo application.

## Structure

- `src/App.tsx` — composition root: page shell, `TodoProvider`, Todo UI and agent sidebar
- `src/features/todo/` — Todo feature
  - `index.ts` — public feature API (`TodoProvider`, `TodoView`, `useTodoRefresh`)
  - `TodoProvider.tsx` — owns Todo state and exposes state/actions/refresh contexts
  - `TodoView.tsx` — Todo page content: filtering, loading, errors and list composition
  - `model.ts` — pure filter/derived helpers and empty-state copy
  - `api.ts` — HTTP client for `/api/todo`
  - `useTodos.ts` — server state hook (load, add, toggle, remove, refetch)
  - `components/` — Composer / Filter / Stats / TodoList
  - `todo.css` — Todo feature styles
- `src/features/agent/` — CopilotKit agent feature
  - `index.ts` — public feature API (`TodoAgentSidebar`)
  - `TodoAgentSidebar.tsx` — provider, error boundary and sidebar composition
  - `CopilotProvider.tsx` — CopilotKit v2 provider
  - `ErrorBoundary.tsx` — isolates sidebar failures from the manual UI
  - `useRefreshOnRunEnd.ts` — refreshes Todo data when an agent run finishes
  - `agent.css` — agent feature styles

`App.tsx` only assembles the two features. Cross-feature access goes through each
feature's `index.ts`; internal data, hooks and components stay private.

Run from the repository root with `bun run dev` (Vite on `:5173`, with `/api`
proxied to the Hono server on `:3000`).
