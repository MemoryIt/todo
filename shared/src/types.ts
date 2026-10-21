export type Todo = {
  id: string
  title: string
  completed: boolean
}

export type TodoList = Todo[]

export type CreateTodoInput = {
  title: string
}

export type UpdateTodoInput = {
  completed: boolean
}
