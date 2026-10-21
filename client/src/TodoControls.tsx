import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Todo } from 'shared'

export type FilterValue = 'all' | 'active' | 'completed'

type ComposerProps = {
  onAdd: (title: string) => Promise<Todo | undefined>
}

export function Composer({ onAdd }: ComposerProps) {
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()

    if (trimmed.length === 0 || submitting) {
      return
    }

    setSubmitting(true)
    try {
      const added = await onAdd(trimmed)
      if (added) {
        setTitle('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <input
        className="composer-input"
        type="text"
        value={title}
        placeholder="What needs to be done?"
        disabled={submitting}
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" disabled={submitting || title.trim().length === 0}>
        {submitting ? 'Adding...' : 'Add'}
      </button>
    </form>
  )
}

type FilterProps = {
  value: FilterValue
  onChange: (value: FilterValue) => void
}

const options: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export function Filter({ value, onChange }: FilterProps) {
  return (
    <div className="filter" role="group" aria-label="Filter todos">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={option.value === value ? 'filter-button active' : 'filter-button'}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

type StatsProps = {
  activeCount: number
}

export function Stats({ activeCount }: StatsProps) {
  return (
    <p className="stats">
      {activeCount} {activeCount === 1 ? 'item' : 'items'} left
    </p>
  )
}
