export const SCHEDULE_TIME_ZONE = 'Asia/Jakarta'
export const SCHEDULE_QUERY_KEY = ['schedule']
export const PLAN_COLORS = [
  { dot: 'bg-blue-600', pale: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  { dot: 'bg-emerald-600', pale: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  { dot: 'bg-violet-600', pale: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800' },
  { dot: 'bg-amber-600', pale: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900' },
  { dot: 'bg-rose-600', pale: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' },
]

const dayParts = new Intl.DateTimeFormat('en-CA', { timeZone: SCHEDULE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })

function parts(value) {
  return Object.fromEntries(dayParts.formatToParts(new Date(value)).filter(({ type }) => type !== 'literal').map(({ type, value: part }) => [type, part]))
}

export function jakartaDateKey(value) {
  const { year, month, day } = parts(value)
  return `${year}-${month}-${day}`
}

export function currentJakartaMonth(value = Date.now()) {
  return jakartaDateKey(value).slice(0, 7)
}

export function shiftMonth(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthGrid(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1, 1))
  const start = new Date(first)
  start.setUTCDate(1 - first.getUTCDay())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setUTCDate(start.getUTCDate() + index)
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
    }
  })
}

export function projectSchedule(plans) {
  return [...plans].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true })).flatMap((plan, planIndex) =>
    plan.steps.filter((step) => step.status !== 'CANCELED').map((step) => ({
      ...step,
      planId: plan.id,
      planVersion: plan.version,
      planSummary: plan.summary,
      colorIndex: planIndex % PLAN_COLORS.length,
      dateKey: jakartaDateKey(step.scheduledAt),
    })),
  ).sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt) || left.sequence - right.sequence)
}

export function eventsForDay(events, dateKey, visiblePlanIds) {
  return events.filter((event) => event.dateKey === dateKey && visiblePlanIds.has(event.planId))
}
