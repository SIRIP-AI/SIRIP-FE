export function formatDuration(totalSeconds) {
  const units = [['hari', 86_400], ['jam', 3_600], ['menit', 60], ['detik', 1]]
  let remaining = totalSeconds
  const parts = []

  for (const [label, seconds] of units) {
    const value = Math.floor(remaining / seconds)
    if (value) parts.push(`${value} ${label}`)
    remaining %= seconds
  }

  return parts.join(' ') || '0 detik'
}
