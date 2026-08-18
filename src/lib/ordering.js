function compareNumericId(first, second) {
  const a = BigInt(first.id)
  const b = BigInt(second.id)
  return a < b ? -1 : a > b ? 1 : 0
}

export function sortReadings(readings) {
  return [...readings].sort((first, second) =>
    Date.parse(first.measuredAt) - Date.parse(second.measuredAt) ||
    first.sequenceNumber - second.sequenceNumber ||
    compareNumericId(first, second))
}

export function sortPlanSteps(steps) {
  return [...steps].sort((first, second) => first.sequence - second.sequence)
}

export function sortEvents(events) {
  return [...events].sort((first, second) =>
    Date.parse(first.occurredAt) - Date.parse(second.occurredAt) ||
    compareNumericId(first, second))
}
