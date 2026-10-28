import { describe, expect, it, mock } from "bun:test"
import { act, fireEvent, render, screen } from "@testing-library/react"
import type { Todo } from "shared"
import { Composer } from "../../../../src/features/todo/components/Composer"

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function renderComposer(
  onAdd: (title: string) => Promise<Todo | undefined>,
) {
  const result = render(<Composer onAdd={onAdd} />)
  const input = screen.getByPlaceholderText(
    "What needs to be done?",
  ) as HTMLInputElement
  const button = screen.getByRole("button", { name: "Add" }) as HTMLButtonElement
  const form = input.closest("form")

  if (!form) {
    throw new Error("Composer form not found")
  }

  return { ...result, input, button, form }
}

describe("Composer", () => {
  it("disables the Add button while the input is empty or whitespace", () => {
    const onAdd = mock(async (): Promise<Todo | undefined> => undefined)
    const { input, button } = renderComposer(onAdd)

    expect(button.disabled).toBe(true)

    fireEvent.change(input, { target: { value: "   " } })

    expect(button.disabled).toBe(true)
  })

  it("enables the Add button for a non-empty title", () => {
    const onAdd = mock(async (): Promise<Todo | undefined> => undefined)
    const { input, button } = renderComposer(onAdd)

    fireEvent.change(input, { target: { value: "Buy milk" } })

    expect(button.disabled).toBe(false)
  })

  it("does not submit a whitespace-only title", () => {
    const onAdd = mock(async (): Promise<Todo | undefined> => undefined)
    const { input, form } = renderComposer(onAdd)

    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.submit(form)

    expect(onAdd).not.toHaveBeenCalled()
  })

  it("submits the trimmed title and clears the input on success", async () => {
    const created: Todo = {
      id: "created",
      title: "Buy milk",
      completed: false,
    }
    const onAdd = mock(async (): Promise<Todo | undefined> => created)
    const { input, form } = renderComposer(onAdd)

    fireEvent.change(input, { target: { value: "  Buy milk  " } })

    await act(async () => {
      fireEvent.submit(form)
    })

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith("Buy milk")
    expect(input.value).toBe("")
  })

  it("keeps the input when adding fails", async () => {
    const onAdd = mock(async (): Promise<Todo | undefined> => undefined)
    const { input, form } = renderComposer(onAdd)

    fireEvent.change(input, { target: { value: "  Buy milk  " } })

    await act(async () => {
      fireEvent.submit(form)
    })

    expect(onAdd).toHaveBeenCalledWith("Buy milk")
    expect(input.value).toBe("  Buy milk  ")
  })

  it("disables the form while submitting and ignores duplicate submits", async () => {
    const pending = deferred<Todo | undefined>()
    const onAdd = mock(async (): Promise<Todo | undefined> => pending.promise)
    const { input, button, form } = renderComposer(onAdd)

    fireEvent.change(input, { target: { value: "Buy milk" } })

    act(() => {
      fireEvent.submit(form)
    })

    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(input.disabled).toBe(true)
    expect(button.disabled).toBe(true)
    expect(button.textContent).toBe("Adding...")

    fireEvent.submit(form)

    expect(onAdd).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve({
        id: "created",
        title: "Buy milk",
        completed: false,
      })
      await pending.promise
    })

    expect(input.value).toBe("")
    expect(input.disabled).toBe(false)
    expect(button.disabled).toBe(true)
    expect(button.textContent).toBe("Add")
  })
})
