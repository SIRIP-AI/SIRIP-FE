import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PageHeader } from '@/components/page-header.jsx'
import { Button } from '@/components/ui/button.jsx'
import { scheduleQueryOptions } from '@/features/schedule/schedule-api.js'
import { currentJakartaMonth, eventsForDay, jakartaDateKey, monthGrid, PLAN_COLORS, projectSchedule, SCHEDULE_TIME_ZONE, shiftMonth } from '@/features/schedule/schedule.js'
import { cn } from '@/lib/utils.js'

const monthName = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayName = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const time = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: SCHEDULE_TIME_ZONE })
const actionNames = { STORE: 'Store', LOAD: 'Load', DISPATCH: 'Dispatch', RETURN_TO_BASE: 'Return to base', HANDOVER: 'Hand over', INSPECT: 'Inspect', OTHER: 'Handle' }

function utcDate(key) { return new Date(`${key}T00:00:00Z`) }
function planLabel(plan) { return `Plan V${plan.version} · ${plan.batches.map(({ code }) => code).join(', ')}` }
function describe(event) {
  const resources = event.resources.map(({ name }) => name).join(' · ')
  return `${actionNames[event.actionType]}${event.batch ? ` ${event.batch.code}` : ''}${resources ? ` · ${resources}` : ''}`
}

export function SchedulePage() {
  const [openedAt] = useState(() => Date.now())
  const today = jakartaDateKey(openedAt)
  const [selectedDay, setSelectedDay] = useState(today)
  const [month, setMonth] = useState(() => currentJakartaMonth(openedAt))
  const [hiddenPlans, setHiddenPlans] = useState(() => new Set())
  const query = useQuery(scheduleQueryOptions)
  const plans = query.data?.activePlans ?? []
  const events = projectSchedule(plans)
  const visiblePlanIds = new Set(plans.filter(({ id }) => !hiddenPlans.has(id)).map(({ id }) => id))
  const agenda = eventsForDay(events, selectedDay, visiblePlanIds)
  const cells = monthGrid(month)

  function selectDay(key) { setSelectedDay(key); setMonth(key.slice(0, 7)) }
  function togglePlan(id) { setHiddenPlans((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }

  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-8 max-[780px]:px-4 max-[780px]:py-6">
    <PageHeader title="Schedule" description="All confirmed work across active plans, shown in Jakarta time." action={<Button variant="outline" onClick={() => selectDay(today)}>Today</Button>} />
    {query.isPending && <div className="grid min-h-56 place-items-center rounded-xl border border-dashed bg-card text-sm text-muted-foreground" role="status">Loading schedule…</div>}
    {query.isError && <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert"><strong className="block text-red-800">Schedule unavailable</strong><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Try again</Button></div>}
    {query.isSuccess && !plans.length && <div className="rounded-xl border border-dashed bg-card p-10 text-center"><CalendarDays className="mx-auto text-muted-foreground" /><h2 className="mt-3 font-bold">No active plans</h2><p className="mt-2 text-sm text-muted-foreground">Approved plan steps will appear here.</p><Button className="mt-5" asChild><Link to="/plans">View plans</Link></Button></div>}
    {plans.length > 0 && <div className="grid gap-5">
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Selected day</p><h2 className="mt-1 text-xl font-bold tracking-[-.025em]">{dayName.format(utcDate(selectedDay))}</h2></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{agenda.length} {agenda.length === 1 ? 'step' : 'steps'}</span></div>
        {!agenda.length && <div className="mt-5 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No scheduled work for the visible plans.</div>}
        {agenda.length > 0 && <ol className="mt-5 grid gap-2">{agenda.map((event) => { const color = PLAN_COLORS[event.colorIndex]; const overdue = event.status === 'UPCOMING' && Date.parse(event.scheduledAt) < openedAt; return <li className={cn('grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-lg border p-3 max-[620px]:grid-cols-[60px_1fr]', color.border, color.pale)} key={`${event.planId}-${event.id}`}><strong className="flex items-center gap-1.5 text-sm"><Clock3 size={14} />{time.format(new Date(event.scheduledAt))}</strong><div><p className="text-sm font-bold">{describe(event)}</p><p className={cn('mt-1 text-xs', color.text)}>{event.planSummary}</p><p className="mt-1 text-[11px] text-muted-foreground">Plan V{event.planVersion}{event.status === 'COMPLETED' ? ' · Completed' : overdue ? ' · Overdue' : ' · Upcoming'}</p></div><Button className="max-[620px]:col-start-2 max-[620px]:justify-self-start" size="sm" variant="outline" asChild><Link to={`/plans/${event.planId}`}>Open plan</Link></Button></li> })}</ol>}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div className="flex items-center gap-2"><Button size="icon-sm" variant="ghost" aria-label="Previous month" onClick={() => setMonth((value) => shiftMonth(value, -1))}><ChevronLeft /></Button><h2 className="min-w-40 text-center font-bold">{monthName.format(utcDate(`${month}-01`))}</h2><Button size="icon-sm" variant="ghost" aria-label="Next month" onClick={() => setMonth((value) => shiftMonth(value, 1))}><ChevronRight /></Button></div><p className="text-xs text-muted-foreground">Asia/Jakarta · UTC+7</p></header>
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="py-2" key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7">{cells.map((cell) => { const dayEvents = eventsForDay(events, cell.key, visiblePlanIds); return <button type="button" className={cn('min-h-24 border-r border-b border-border p-2 text-left align-top hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-[700px]:min-h-16 max-[700px]:p-1.5', !cell.inMonth && 'bg-muted/25 text-muted-foreground', selectedDay === cell.key && 'bg-primary/5 ring-2 ring-inset ring-primary')} key={cell.key} aria-label={`${dayName.format(utcDate(cell.key))}, ${dayEvents.length} scheduled steps`} aria-pressed={selectedDay === cell.key} onClick={() => selectDay(cell.key)}><span className={cn('grid size-7 place-items-center rounded-full text-xs font-semibold', cell.key === today && 'bg-primary text-primary-foreground')}>{cell.day}</span><span className="mt-2 grid gap-1 max-[700px]:flex max-[700px]:flex-wrap">{dayEvents.slice(0, 3).map((event) => <span className="flex min-w-0 items-center gap-1 text-[10px] font-semibold" key={`${event.planId}-${event.id}`}><span className={cn('size-2 shrink-0 rounded-full', PLAN_COLORS[event.colorIndex].dot)} /><span className="truncate max-[700px]:sr-only">{time.format(new Date(event.scheduledAt))} {event.batch?.code ?? actionNames[event.actionType]}</span></span>)}{dayEvents.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>}</span></button> })}</div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Filter by plan</h2><p className="mt-1 text-xs text-muted-foreground">Colors repeat after five plans; plan versions and batches remain unique.</p></div><Button size="sm" variant="ghost" onClick={() => setHiddenPlans(new Set())}>Show all</Button></div><div className="mt-4 flex flex-wrap gap-2">{plans.map((plan) => { const event = events.find(({ planId }) => planId === plan.id); const color = PLAN_COLORS[event?.colorIndex ?? 0]; const visible = !hiddenPlans.has(plan.id); return <button type="button" className={cn('flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-opacity', color.border, visible ? color.pale : 'opacity-45')} aria-pressed={visible} onClick={() => togglePlan(plan.id)} key={plan.id}><span className={cn('size-2.5 rounded-full', color.dot)} />{planLabel(plan)}</button> })}</div></section>
    </div>}
  </div>
}
