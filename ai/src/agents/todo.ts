import { Agent } from "@mastra/core/agent"
import { createTool } from "@mastra/core/tools"
import { z } from "zod"
import { AGENT_IDS } from "shared"
import type { Todo, TodoList, TodoPort } from "shared"
import { createAgentMemory } from "../memory"
import { createLlmModel } from "../model"

export const TODO_AGENT_ID = AGENT_IDS.todo

const statusSchema = z.enum(["all", "active", "completed"])

/** Serialisable projection the model can reason over. */
function project(todo: Todo) {
  return { id: todo.id, title: todo.title, completed: todo.completed }
}

function filterTodos(
  todos: TodoList,
  status: "all" | "active" | "completed",
  query?: string,
): TodoList {
  const normalizedQuery = query?.trim().toLowerCase()

  return todos.filter((todo) => {
    if (status === "active" && todo.completed) return false
    if (status === "completed" && !todo.completed) return false
    if (normalizedQuery && !todo.title.toLowerCase().includes(normalizedQuery)) {
      return false
    }
    return true
  })
}

function createTodoTools(todoPort: TodoPort) {
  const listTodos = createTool({
    id: "listTodos",
    description:
      "List the user's todos. Optionally filter by completion status or a title query.",
    inputSchema: z.object({
      status: statusSchema
        .optional()
        .describe("Which todos to list; defaults to all."),
      query: z
        .string()
        .optional()
        .describe("Case-insensitive substring to match against titles."),
    }),
    execute: async ({ status = "all", query }) => {
      const items = filterTodos(await todoPort.list(), status, query).map(project)
      return { count: items.length, items }
    },
  })

  const addTodo = createTool({
    id: "addTodo",
    description: "Add a new todo with the given title.",
    inputSchema: z.object({
      title: z.string().describe("The task title to add."),
    }),
    execute: async ({ title }) => {
      const todo = await todoPort.create(title)

      return todo
        ? { ok: true, todo: project(todo) }
        : { ok: false, error: "create_failed" }
    },
  })

  const toggleTodo = createTool({
    id: "toggleTodo",
    description:
      "Mark a todo completed, or cancel its completion. Requires the todo id from listTodos.",
    inputSchema: z.object({
      id: z.string().describe("The exact todo id from listTodos."),
    }),
    execute: async ({ id }) => {
      const existing = (await todoPort.list()).find((todo) => todo.id === id)

      if (!existing) {
        return { ok: false, error: "not_found" }
      }

      const todo = await todoPort.setCompleted(id, !existing.completed)

      return todo
        ? { ok: true, todo: project(todo) }
        : { ok: false, error: "toggle_failed" }
    },
  })

  const removeTodo = createTool({
    id: "removeTodo",
    description: "Delete a todo. Requires the todo id from listTodos.",
    inputSchema: z.object({
      id: z.string().describe("The exact todo id from listTodos."),
    }),
    execute: async ({ id }) => {
      const removed = await todoPort.remove(id)

      return removed ? { ok: true, id } : { ok: false, error: "not_found" }
    },
  })

  return { listTodos, addTodo, toggleTodo, removeTodo }
}

const INSTRUCTIONS = [
  "You are a todo assistant for the user's Todo app.",
  "You can read and modify the user's todo list only through tools:",
  "- listTodos: list todos, optionally filtered by status (all/active/completed) or a title query.",
  "- addTodo: add a task with a title.",
  "- toggleTodo: mark a todo completed or cancel it. Requires the todo id.",
  "- removeTodo: delete a todo. Requires the todo id.",
  "",
  "Rules:",
  "- Always call a tool to make a change; never just describe the change.",
  "- To act on an existing todo, call listTodos first and use the exact id.",
  "- Never invent ids or todos. If several todos match, ask the user which one.",
  "- Earlier messages in this thread may be provided automatically by memory. Use them for continuity; do not claim you cannot remember the thread, but do not claim memory beyond it.",
  "- After an action, reply with one short confirmation that includes the title.",
  "- Keep replies short and in the user's language.",
].join("\n")

/**
 * The Mastra agent that operates the Todo data.
 *
 * All tools run server-side and delegate to {@link TodoPort}, so the agent never
 * depends on browser state and can work without a connected frontend.
 */
export function createTodoAgent(todoPort: TodoPort): Agent {
  return new Agent({
    id: TODO_AGENT_ID,
    name: "Todo Agent",
    model: createLlmModel(),
    memory: createAgentMemory(),
    tools: createTodoTools(todoPort),
    instructions: INSTRUCTIONS,
  })
}
