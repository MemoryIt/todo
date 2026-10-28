import type { Todo } from "shared"
import { toSnapshot } from "./snapshot"
import type { EvalCase } from "./types"

function todo(
  id: string,
  title: string,
  completed = false,
): Todo {
  return { id, title, completed }
}

const LIST_INITIAL = [
  todo("seed-1", "Buy milk"),
  todo("seed-2", "Write report", true),
]

const TOGGLE_COMPLETE_INITIAL = [
  todo("seed-1", "Buy milk"),
  todo("seed-2", "Write report", true),
]

const TOGGLE_UNCOMPLETE_INITIAL = [
  todo("seed-1", "Buy milk", true),
  todo("seed-2", "Write report"),
]

const REMOVE_INITIAL = [
  todo("seed-1", "Buy milk"),
  todo("seed-2", "Write report", true),
]

const AMBIGUOUS_INITIAL = [
  todo("seed-1", "Buy milk"),
  todo("seed-2", "Buy milk for the cat"),
]

/**
 * First evaluation batch.
 *
 * Targets are authored from content and completion only. Seed ids exist for
 * tool argument assertions but never participate in the state comparison.
 */
export const EVAL_CASES: EvalCase[] = [
  {
    id: "add-todo",
    input: 'Add a todo titled "Buy milk".',
    initial: [],
    target: [{ title: "Buy milk", completed: false }],
    behavior: "mutate",
    requiredTools: [{ name: "addTodo", args: { title: "Buy milk" } }],
    forbiddenTools: ["toggleTodo", "removeTodo"],
    maxToolCalls: 2,
  },
  {
    id: "list-all",
    input: "List all of my todos.",
    initial: LIST_INITIAL,
    target: toSnapshot(LIST_INITIAL),
    behavior: "noMutation",
    requiredTools: [{ name: "listTodos" }],
    forbiddenTools: ["addTodo", "toggleTodo", "removeTodo"],
    maxToolCalls: 2,
  },
  {
    id: "list-active",
    input: "List my active todos.",
    initial: LIST_INITIAL,
    target: toSnapshot(LIST_INITIAL),
    behavior: "noMutation",
    requiredTools: [{ name: "listTodos", args: { status: "active" } }],
    forbiddenTools: ["addTodo", "toggleTodo", "removeTodo"],
    maxToolCalls: 2,
  },
  {
    id: "list-completed",
    input: "List my completed todos.",
    initial: LIST_INITIAL,
    target: toSnapshot(LIST_INITIAL),
    behavior: "noMutation",
    requiredTools: [{ name: "listTodos", args: { status: "completed" } }],
    forbiddenTools: ["addTodo", "toggleTodo", "removeTodo"],
    maxToolCalls: 2,
  },
  {
    id: "toggle-complete",
    input: 'Mark the todo "Buy milk" as completed.',
    initial: TOGGLE_COMPLETE_INITIAL,
    target: [
      { title: "Buy milk", completed: true },
      { title: "Write report", completed: true },
    ],
    behavior: "mutate",
    requiredTools: [
      { name: "listTodos" },
      { name: "toggleTodo", args: { id: "seed-1" } },
    ],
    forbiddenTools: ["addTodo", "removeTodo"],
    maxToolCalls: 3,
  },
  {
    id: "toggle-uncomplete",
    input: 'Mark the todo "Buy milk" as not completed.',
    initial: TOGGLE_UNCOMPLETE_INITIAL,
    target: [
      { title: "Buy milk", completed: false },
      { title: "Write report", completed: false },
    ],
    behavior: "mutate",
    requiredTools: [
      { name: "listTodos" },
      { name: "toggleTodo", args: { id: "seed-1" } },
    ],
    forbiddenTools: ["addTodo", "removeTodo"],
    maxToolCalls: 3,
  },
  {
    id: "remove-todo",
    input: 'Delete the todo titled "Buy milk".',
    initial: REMOVE_INITIAL,
    target: [{ title: "Write report", completed: true }],
    behavior: "mutate",
    requiredTools: [
      { name: "listTodos" },
      { name: "removeTodo", args: { id: "seed-1" } },
    ],
    forbiddenTools: ["addTodo", "toggleTodo"],
    maxToolCalls: 3,
  },
  {
    id: "ambiguous",
    input: "Mark the milk todo as completed.",
    initial: AMBIGUOUS_INITIAL,
    target: toSnapshot(AMBIGUOUS_INITIAL),
    behavior: "noMutation",
    forbiddenTools: ["addTodo", "toggleTodo", "removeTodo"],
    maxToolCalls: 3,
  },
]
