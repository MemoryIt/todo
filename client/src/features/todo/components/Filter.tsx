import type { FilterValue } from '../model'

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
