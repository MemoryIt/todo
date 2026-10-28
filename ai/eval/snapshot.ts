import type { Todo, TodoPort } from "shared"
import type {
  SnapshotDiff,
  TodoContent,
  TodoSnapshot,
} from "./types"

function compareContent(a: TodoContent, b: TodoContent): number {
  if (a.title < b.title) return -1
  if (a.title > b.title) return 1
  if (a.completed === b.completed) return 0
  return a.completed ? 1 : -1
}

function sortContent(items: readonly TodoContent[]): TodoContent[] {
  return items
    .map(({ title, completed }) => ({ title, completed }))
    .sort(compareContent)
}

/** Project todos onto the fields the eval compares, dropping ids. */
export function toSnapshot(todos: readonly Todo[]): TodoSnapshot {
  return todos.map(({ title, completed }) => ({ title, completed }))
}

export async function snapshot(
  port: Pick<TodoPort, "list">,
): Promise<TodoSnapshot> {
  return toSnapshot(await port.list())
}

/**
 * Canonical form for strict comparison.
 *
 * Order is ignored; duplicate titles are preserved as distinct entries.
 */
export function canonicalize(value: TodoSnapshot): string {
  return JSON.stringify({ v: 1, items: sortContent(value) })
}

function countContent(items: TodoSnapshot) {
  const counts = new Map<string, { item: TodoContent; count: number }>()

  for (const item of items) {
    const key = JSON.stringify([item.title, item.completed])
    const existing = counts.get(key)

    if (existing) {
      existing.count += 1
    } else {
      counts.set(key, {
        item: { title: item.title, completed: item.completed },
        count: 1,
      })
    }
  }

  return counts
}

/** Compare snapshots as multisets and report absent and unexpected items. */
export function diffSnapshots(
  target: TodoSnapshot,
  actual: TodoSnapshot,
): SnapshotDiff {
  const targetCounts = countContent(target)
  const actualCounts = countContent(actual)
  const missing: TodoContent[] = []
  const extra: TodoContent[] = []

  for (const [key, entry] of targetCounts) {
    const actualCount = actualCounts.get(key)?.count ?? 0

    for (let index = actualCount; index < entry.count; index++) {
      missing.push(entry.item)
    }
  }

  for (const [key, entry] of actualCounts) {
    const targetCount = targetCounts.get(key)?.count ?? 0

    for (let index = targetCount; index < entry.count; index++) {
      extra.push(entry.item)
    }
  }

  return {
    equal: missing.length === 0 && extra.length === 0,
    missing: sortContent(missing),
    extra: sortContent(extra),
  }
}
