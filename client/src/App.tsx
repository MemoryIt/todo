import { TodoProvider, TodoView } from './features/todo'
import { TodoAgentSidebar } from './features/agent'
import './App.css'

function App() {
  return (
    <main className="todo-page">
      <TodoProvider>
        <TodoView />
        <TodoAgentSidebar />
      </TodoProvider>
    </main>
  )
}

export default App
