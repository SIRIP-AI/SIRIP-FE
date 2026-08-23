export function formatDuration(totalSeconds) {
  const units = [['day', 86_400], ['hour', 3_600], ['minute', 60], ['second', 1]]
  let remaining = totalSeconds
  const parts = []

  for (const [label, seconds] of units) {
    const value = Math.floor(remaining / seconds)
    if (value) parts.push(`${value} ${label}${value === 1 ? '' : 's'}`)
    remaining %= seconds
  }

  return parts.join(' ') || '0 seconds'
}
