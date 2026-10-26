import { TodoProvider, TodoView } from './features/todo'
import { TodoSidebar } from './copilot/TodoSidebar'
import './App.css'

function App() {
  return (
    <main className="todo-page">
      <TodoProvider>
        <TodoView />
        <TodoSidebar />
      </TodoProvider>
    </main>
  )
}

export default App
