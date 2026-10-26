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
