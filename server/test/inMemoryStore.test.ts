import { createTodoService } from "../src/domain"
import { createInMemoryTodoStore } from "../src/store"
import { runTodoServiceContract } from "./contract/todoServiceContract"
import { runTodoStoreContract } from "./contract/todoStoreContract"

runTodoStoreContract("in-memory store", () => createInMemoryTodoStore())

runTodoServiceContract("todo service (in-memory store)", () =>
  createTodoService(createInMemoryTodoStore()),
)
