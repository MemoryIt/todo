import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Todo } from 'shared'

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
