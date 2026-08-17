import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronDown, CircleX, Clock3, LockKeyhole, MessageCircle, Route } from 'lucide-react'

import { Appear } from '@/components/appear.jsx'
import { PageHeader } from '@/components/page-header.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { completePlanStep, plansQueryOptions } from '@/features/plans/plans-api.js'
import { getWhatsAppUrl } from '@/lib/whatsapp.js'
import { cn } from '@/lib/utils.js'

const actions = {
  STORE: 'Store',
  LOAD: 'Load',
  DISPATCH: 'Dispatch',
  HANDOVER: 'Hand over',
  INSPECT: 'Inspect',
  OTHER: 'Handle',
}

const prepositions = {
  STORE: 'in',
  LOAD: 'into',
  DISPATCH: 'to',
  HANDOVER: 'at',
  INSPECT: 'at',
  OTHER: 'with',
}

const dateFormatter = new Intl.DateTimeFormat([], { day: 'numeric', month: 'short', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat([], { hour: '2-digit', minute: '2-digit' })
const dateTimeFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value) {
  return dateFormatter.format(new Date(value))
}

function formatTime(value) {
  return timeFormatter.format(new Date(value))
}

function formatDateTime(value) {
  return dateTimeFormatter.format(new Date(value))
}

function planStatus(plan) {
  if (plan.status === 'ACTIVE') return <StatusBadge tone="healthy">Active</StatusBadge>
  if (plan.status === 'PROPOSED') return <StatusBadge className="bg-sky-50 text-sky-700">Proposed</StatusBadge>
  if (plan.status === 'DISMISSED') return <StatusBadge tone="critical">Dismissed</StatusBadge>
  return <StatusBadge>Superseded</StatusBadge>
}

function describeStep(step) {
  return `${actions[step.actionType]} ${step.batch.code}${step.resource ? ` ${prepositions[step.actionType]} ${step.resource.name}` : ''}`
}

function WhatsAppButton({ message, label = 'Open WhatsApp', ariaLabel = label }) {
  const url = getWhatsAppUrl(message)
  if (!url) return <Button type="button" disabled title="Set VITE_WHATSAPP_URL to enable WhatsApp."><MessageCircle />{label}</Button>
  return <Button asChild><a href={url} target="_blank" rel="noreferrer" aria-label={ariaLabel}><MessageCircle />{label}</a></Button>
}

function Trigger({ trigger }) {
  if (!trigger) return <span>Initial plan request</span>
  return <span className="grid gap-1"><span>{trigger.message}</span><span className="text-xs font-normal text-muted-foreground capitalize">{trigger.type.replaceAll('_', ' ').toLowerCase()} · {formatDateTime(trigger.occurredAt)}</span></span>
}

function PlanContext({ plan, activeUpcomingCount }) {
  const futureStepCount = plan.steps.filter((step) => step.status === 'UPCOMING').length
  return <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
    <div className="grid content-start gap-1"><dt className="text-xs font-bold text-slate-500 uppercase">Trigger</dt><dd className="leading-relaxed"><Trigger trigger={plan.trigger} /></dd></div>
    {activeUpcomingCount !== undefined && <div className="grid content-start gap-1"><dt className="text-xs font-bold text-slate-500 uppercase">Change summary</dt><dd className="leading-relaxed">{futureStepCount} future {futureStepCount === 1 ? 'step' : 'steps'} proposed; the current active plan has {activeUpcomingCount} upcoming {activeUpcomingCount === 1 ? 'step' : 'steps'}.</dd></div>}
    <div className={cn('grid content-start gap-1', activeUpcomingCount !== undefined && 'sm:col-span-2')}><dt className="text-xs font-bold text-slate-500 uppercase">Reason</dt><dd className="leading-relaxed text-slate-700">{plan.reason}</dd></div>
  </dl>
}

function StepStatus({ status }) {
  if (status === 'COMPLETED') return <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><LockKeyhole size={13} aria-hidden="true" />Completed · locked</span>
  if (status === 'CANCELED') return <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><CircleX size={14} aria-hidden="true" />Canceled</span>
  return <span className="flex items-center gap-1.5 text-xs font-semibold text-primary"><Clock3 size={14} aria-hidden="true" />Upcoming</span>
}

function PlanSteps({ plan, completion }) {
  const steps = [...plan.steps].sort((first, second) => first.sequence - second.sequence)
  if (!steps.length) return <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-muted-foreground">No steps stored for this plan.</p>

  return <ol className="grid gap-2.5">
    {steps.map((step) => {
      const markingThisStep = completion?.isPending && completion.variables?.stepId === step.id
      return <li className={cn('rounded-lg border p-4', step.status === 'COMPLETED' && 'border-emerald-200 bg-emerald-50/40', step.status === 'CANCELED' && 'border-dashed border-slate-300 bg-slate-100/70 text-slate-500', step.status === 'UPCOMING' && 'border-border bg-white')} key={step.id}>
        <div className="grid grid-cols-[72px_24px_minmax(0,1fr)] gap-3 sm:grid-cols-[90px_28px_minmax(0,1fr)]">
          <time className="grid content-start text-xs font-bold" dateTime={step.scheduledAt}><span>{formatTime(step.scheduledAt)}</span><span className="mt-1 text-[10px] font-normal text-muted-foreground">{formatDate(step.scheduledAt)}</span></time>
          <span className={cn('grid size-6 place-items-center rounded-full', step.status === 'COMPLETED' && 'bg-emerald-600 text-white', step.status === 'CANCELED' && 'bg-slate-300 text-slate-600', step.status === 'UPCOMING' && 'border-2 border-primary bg-white text-primary')} aria-hidden="true">{step.status === 'COMPLETED' ? <CheckCircle2 size={15} /> : step.status === 'CANCELED' ? <CircleX size={15} /> : <span className="size-1.5 rounded-full bg-current" />}</span>
          <div className="min-w-0"><strong className={cn('block text-sm leading-relaxed', step.status === 'CANCELED' && 'line-through')}>{describeStep(step)}</strong><div className="mt-1.5"><StepStatus status={step.status} /></div>{step.notes && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.notes}</p>}{step.completedAt && <p className="mt-1 text-[10px] text-muted-foreground">Completed {formatDateTime(step.completedAt)}</p>}</div>
        </div>
        {completion && step.status === 'UPCOMING' && <div className="mt-3 flex justify-end"><Button size="sm" type="button" disabled={completion.isPending} onClick={() => completion.mutate({ planId: plan.id, stepId: step.id })}><CheckCircle2 />{markingThisStep ? 'Marking…' : 'Mark complete'}</Button></div>}
      </li>
    })}
  </ol>
}

function ActivePlan({ plan, completion }) {
  if (!plan) return <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 px-5 text-center"><div><Route className="mx-auto text-muted-foreground" size={20} /><strong className="mt-2 block text-sm">No active plan</strong><span className="mt-1 block text-xs text-muted-foreground">An approved plan will appear here.</span></div></div>

  return <Appear as="section" className="overflow-hidden rounded-xl border border-border bg-card">
    <header className="flex items-start justify-between gap-4 border-b border-border p-5"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold tracking-[-.025em]">Plan V{plan.version}</h2>{planStatus(plan)}</div><p className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(plan.createdAt)}{plan.approvedAt ? ` · Approved ${formatDateTime(plan.approvedAt)}` : ''}</p></div><Route className="shrink-0 text-primary" size={21} aria-hidden="true" /></header>
    <div className="grid gap-5 p-5"><PlanContext plan={plan} /><div><h3 className="mb-3 text-sm font-bold">Plan steps</h3><PlanSteps plan={plan} completion={completion} />{completion.isError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">Step could not be marked complete. Try again.</p>}</div></div>
  </Appear>
}

function ProposedPlan({ plan, activeUpcomingCount }) {
  return <article data-proposed-plan className="overflow-hidden rounded-xl border border-sky-200 bg-sky-50/30">
    <header className="flex items-start justify-between gap-4 border-b border-sky-200 bg-white/70 p-5"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold">Plan V{plan.version}</h3>{planStatus(plan)}</div><p className="mt-1 text-xs text-muted-foreground">Proposed {formatDateTime(plan.createdAt)}</p></div><Route className="shrink-0 text-sky-700" size={20} aria-hidden="true" /></header>
    <div className="grid gap-5 p-5"><PlanContext plan={plan} activeUpcomingCount={activeUpcomingCount} /><div><h4 className="mb-3 text-sm font-bold">Proposed steps</h4><PlanSteps plan={plan} /></div><div className="flex items-center justify-between gap-4 rounded-lg border border-sky-200 bg-white p-4 max-[620px]:flex-col max-[620px]:items-stretch"><p className="flex items-start gap-2 text-sm font-semibold text-sky-900"><MessageCircle className="mt-0.5 shrink-0" size={16} aria-hidden="true" />Approve or dismiss this proposal through WhatsApp.</p><WhatsAppButton message={`Hello SIRIP, I want to review Plan V${plan.version} (ID ${plan.id}) so I can approve or dismiss it.`} ariaLabel={`Open WhatsApp for Plan V${plan.version}`} /></div></div>
  </article>
}

function PlanHistory({ plans }) {
  return <Appear as="section" delay={0.12}>
    <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-bold">Plan history</h2><span className="text-xs text-muted-foreground">{plans.length}</span></div>
    {plans.length ? <div className="grid gap-2">{plans.map((plan) => <details className="group overflow-hidden rounded-lg border border-border bg-card" key={plan.id}><summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"><strong className="text-sm">Plan V{plan.version}</strong>{planStatus(plan)}<time className="ml-auto text-xs text-muted-foreground" dateTime={plan.createdAt}>{formatDate(plan.createdAt)}</time><ChevronDown className="text-muted-foreground transition-transform group-open:rotate-180" size={17} aria-hidden="true" /></summary><div className="grid gap-4 border-t border-border p-4"><PlanContext plan={plan} /><div><h3 className="mb-3 text-sm font-bold">Stored steps</h3><PlanSteps plan={plan} /></div></div></details>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-muted-foreground">No plan history yet.</div>}
  </Appear>
}

function EmptyPlans() {
  return <Appear className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center"><Route className="mx-auto text-muted-foreground" size={24} /><h2 className="mt-3 text-base font-bold">No plans yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Request the initial AI plan through WhatsApp. Approved plans and proposals will appear here.</p><div className="mt-5"><WhatsAppButton message="Hello SIRIP, I want to request the initial operation plan." /></div></Appear>
}

export function PlansPage() {
  const queryClient = useQueryClient()
  const plans = useQuery(plansQueryOptions)
  const completion = useMutation({
    mutationFn: ({ planId, stepId }) => completePlanStep(planId, stepId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
      ])
    },
  })

  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <PageHeader title="Plans" description="Follow the active operation plan and review AI proposals. Approval and dismissal remain in WhatsApp." />
    {plans.isPending && <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground" role="status" aria-live="polite">Loading plans…</div>}
    {plans.isError && !plans.data && <div className="flex min-h-56 items-center justify-center rounded-xl border border-red-200 bg-red-50/60 p-6 text-center" role="alert"><div><strong className="block text-sm text-red-800">Plans unavailable</strong><p className="mt-2 text-sm text-red-700">Check the API connection and try again.</p><Button className="mt-4" variant="outline" type="button" onClick={() => plans.refetch()}>Try again</Button></div></div>}
    {plans.data && <div className="grid gap-7">{plans.isRefetchError && <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status"><span>Showing the last available plan data.</span><Button size="sm" variant="outline" type="button" onClick={() => plans.refetch()}>Retry</Button></div>}<p className="text-right text-xs text-muted-foreground">Updated {formatDateTime(plans.data.updatedAt)}</p>{!plans.data.activePlan && !plans.data.proposedPlans.length && !plans.data.history.length ? <EmptyPlans /> : <><section><h2 className="mb-3 text-sm font-bold">Active plan</h2><ActivePlan plan={plans.data.activePlan} completion={completion} /></section><Appear as="section" delay={0.08}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-sm font-bold">Proposed plans</h2><span className="text-xs text-muted-foreground">{plans.data.proposedPlans.length}</span></div>{plans.data.proposedPlans.length ? <div className="grid gap-4" data-proposed-plans>{plans.data.proposedPlans.map((plan) => <ProposedPlan key={plan.id} plan={plan} activeUpcomingCount={plans.data.activePlan?.steps.filter((step) => step.status === 'UPCOMING').length ?? 0} />)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 p-6 text-center text-sm text-muted-foreground">No proposed plans.</div>}</Appear><PlanHistory plans={plans.data.history} /></>}</div>}
  </div>
}
