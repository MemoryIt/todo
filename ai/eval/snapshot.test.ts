import { describe, expect, it } from "bun:test"
import type { Todo } from "shared"
import { canonicalize, diffSnapshots, snapshot, toSnapshot } from "./snapshot"

describe("toSnapshot", () => {
  it("drops ids and preserves content and completion", () => {
    const todos: Todo[] = [
      { id: "random-1", title: "Buy milk", completed: false },
      { id: "random-2", title: "Write report", completed: true },
    ]

    expect(toSnapshot(todos)).toEqual([
      { title: "Buy milk", completed: false },
      { title: "Write report", completed: true },
    ])
  })
})

describe("snapshot", () => {
  it("reads the port and projects away ids", async () => {
    const port = {
      list: async (): Promise<Todo[]> => [
        { id: "random", title: "Buy milk", completed: false },
      ],
    }

    expect(await snapshot(port)).toEqual([
      { title: "Buy milk", completed: false },
    ])
  })
})

describe("canonicalize", () => {
  it("ignores ordering", () => {
    const first = [
      { title: "Write report", completed: true },
      { title: "Buy milk", completed: false },
    ]
    const second = [
      { title: "Buy milk", completed: false },
      { title: "Write report", completed: true },
    ]

    expect(canonicalize(first)).toBe(canonicalize(second))
  })

  it("keeps duplicate titles as distinct entries", () => {
    const two = [
      { title: "Buy milk", completed: false },
      { title: "Buy milk", completed: false },
    ]
    const one = [{ title: "Buy milk", completed: false }]

    expect(canonicalize(two)).not.toBe(canonicalize(one))
  })

  it("compares titles strictly", () => {
    expect(
      canonicalize([{ title: "Buy milk", completed: false }]),
    ).not.toBe(
      canonicalize([{ title: " buy milk", completed: false }]),
    )
  })
})

describe("diffSnapshots", () => {
  it("reports missing items with multiplicity", () => {
    const target = [
      { title: "Buy milk", completed: false },
      { title: "Buy milk", completed: false },
    ]
    const actual = [{ title: "Buy milk", completed: false }]

    expect(diffSnapshots(target, actual)).toEqual({
      equal: false,
      missing: [{ title: "Buy milk", completed: false }],
      extra: [],
    })
  })

  it("reports extra items with multiplicity", () => {
    const target: Array<{ title: string; completed: boolean }> = []
    const actual = [
      { title: "Buy milk", completed: false },
      { title: "Buy milk", completed: false },
    ]

    expect(diffSnapshots(target, actual)).toEqual({
      equal: false,
      missing: [],
      extra: [
        { title: "Buy milk", completed: false },
        { title: "Buy milk", completed: false },
      ],
    })
  })

  it("treats reordered snapshots as equal", () => {
    const target = [
      { title: "A", completed: false },
      { title: "B", completed: true },
    ]
    const actual = [...target].reverse()

    expect(diffSnapshots(target, actual)).toEqual({
      equal: true,
      missing: [],
      extra: [],
    })
  })
})
