import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCircle2, ChevronDown, CircleX, Clock3, MessageCircle, Route, Ship } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { PageHeader } from '@/components/page-header.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { completePlanStep, plansQueryOptions } from '@/features/plans/plans-api.js'
import { cn } from '@/lib/utils.js'
import { getWhatsAppUrl } from '@/lib/whatsapp.js'

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

function describeStep(step) {
  return `${actions[step.actionType]} ${step.batch.code}${step.resource ? ` ${prepositions[step.actionType]} ${step.resource.name}` : ''}`
}

function statusBadge(status) {
  if (status === 'ACTIVE') return <StatusBadge tone="healthy">Active</StatusBadge>
  if (status === 'PROPOSED') return <StatusBadge className="bg-sky-50 text-sky-700">Proposed</StatusBadge>
  if (status === 'DISMISSED') return <StatusBadge tone="critical">Dismissed</StatusBadge>
  return <StatusBadge>Superseded</StatusBadge>
}

function WhatsAppButton({ message, label = 'Open WhatsApp', className, variant = 'default' }) {
  const url = getWhatsAppUrl(message)
  return url ? <Button className={className} variant={variant} asChild><a href={url} target="_blank" rel="noreferrer"><MessageCircle />{label}</a></Button> : <Button className={className} variant={variant} type="button" disabled title="Set VITE_WHATSAPP_URL to enable WhatsApp."><MessageCircle />{label}</Button>
}

function usePlans() {
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
  return { plans, completion }
}

function QueryState({ plans }) {
  if (plans.isPending) return <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground" role="status" aria-live="polite">Loading plans…</div>
  if (plans.isError && !plans.data) return <div className="flex min-h-56 items-center justify-center rounded-xl border border-red-200 bg-red-50/60 p-6 text-center" role="alert"><div><strong className="block text-sm text-red-800">Plans unavailable</strong><p className="mt-2 text-sm text-red-700">Check the API connection and try again.</p><Button className="mt-4" variant="outline" type="button" onClick={() => plans.refetch()}>Try again</Button></div></div>
  return null
}

function StalePlans({ plans }) {
  if (!plans.isRefetchError) return null
  return <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status"><span>Showing the last available plan data.</span><Button size="sm" variant="outline" type="button" onClick={() => plans.refetch()}>Retry</Button></div>
}

function PlanCard({ plan }) {
  const steps = [...plan.steps].sort((first, second) => first.sequence - second.sequence)
  const completed = steps.filter((step) => step.status === 'COMPLETED').length
  const nextStep = steps.find((step) => step.status === 'UPCOMING')
  const active = plan.status === 'ACTIVE'
  const proposed = plan.status === 'PROPOSED'

  return <Appear as="article" className={cn('group rounded-xl border bg-card p-5 transition-colors', active ? 'border-border hover:border-primary/35' : proposed ? 'border-sky-200 bg-sky-50/30' : 'border-border')}>
    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold">Plan V{plan.version}</h3>{statusBadge(plan.status)}</div><p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed">{plan.reason}</p><p className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(plan.createdAt)}</p></div><Route className={active ? 'shrink-0 text-primary' : proposed ? 'shrink-0 text-sky-600' : 'shrink-0 text-slate-400'} size={20} /></div>
    {active ? <div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{nextStep ? `Next · ${formatTime(nextStep.scheduledAt)}` : 'All steps complete'}</span><strong>{completed}/{steps.length}</strong></div><div className="flex gap-1" aria-label={`${completed} of ${steps.length} steps completed`}>{steps.map((step) => <span className={cn('h-1.5 flex-1 rounded-full', step.status === 'COMPLETED' ? 'bg-primary' : step.status === 'CANCELED' ? 'bg-slate-300' : 'bg-slate-200')} key={step.id} />)}</div>{nextStep && <p className="mt-3 truncate text-xs">{describeStep(nextStep)}</p>}</div> : proposed ? <p className="mt-5 rounded-lg bg-white/80 p-3 text-xs leading-relaxed text-slate-600">Proposed by AI. Approval and dismissal remain in WhatsApp.</p> : <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Stored plan and completed actions remain available as history.</p>}
    <Button className="mt-5 w-full" variant={active || !proposed ? 'outline' : 'default'} asChild><Link to={`/plans/${plan.id}`}>{active ? 'Open active plan' : proposed ? 'Review proposal' : 'View stored plan'}</Link></Button>
  </Appear>
}

function ProposedPlan({ plan, activeUpcomingCount }) {
  return <Appear as="article" className="overflow-hidden rounded-xl border border-sky-200 bg-sky-50/30">
    <header className="flex items-start justify-between gap-4 border-b border-sky-200 bg-white/70 p-5"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold">Plan V{plan.version}</h3>{statusBadge(plan.status)}</div><p className="mt-1 text-xs text-muted-foreground">Proposed {formatDateTime(plan.createdAt)}</p></div><Route className="shrink-0 text-sky-700" size={20} /></header>
    <div className="grid gap-5 p-5"><PlanContext plan={plan} activeUpcomingCount={activeUpcomingCount} /><div><h4 className="mb-3 text-sm font-bold">Proposed steps</h4><div className="overflow-hidden rounded-xl border border-border bg-card"><PlanSteps plan={plan} /></div></div><div className="flex items-center justify-between gap-4 rounded-lg border border-sky-200 bg-white p-4 max-[620px]:flex-col max-[620px]:items-stretch"><p className="flex items-start gap-2 text-sm font-semibold text-sky-900"><MessageCircle className="mt-0.5 shrink-0" size={16} />Approve or dismiss this proposal through WhatsApp.</p><div className="flex gap-2 max-[620px]:flex-col"><Button variant="outline" asChild><Link to={`/plans/${plan.id}`}>View details</Link></Button><WhatsAppButton message={`Hello SIRIP, I want to review Plan V${plan.version} (ID ${plan.id}) so I can approve or dismiss it.`} label="Review in WhatsApp" /></div></div></div>
  </Appear>
}

function EmptyPlans() {
  return <Appear className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center"><Route className="mx-auto text-muted-foreground" size={24} /><h2 className="mt-3 text-base font-bold">No plans yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Request the initial AI plan through WhatsApp. Approved plans and proposals will appear here.</p><WhatsAppButton className="mt-5" message="Hello SIRIP, I want to request the initial operation plan." label="Request initial plan" /></Appear>
}

export function PlansPage() {
  const { plans } = usePlans()
  const data = plans.data

  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <PageHeader title="Plans" description="Follow the active operation plan and review AI proposals. Approval and dismissal remain in WhatsApp." action={<WhatsAppButton message="Hello SIRIP, I want to request an operation plan." label="Request plan" />} />
    <QueryState plans={plans} />
    {data && <div className="grid gap-8"><StalePlans plans={plans} /><p className="-mt-4 text-right text-xs text-muted-foreground">Updated {formatDateTime(data.updatedAt)}</p>{!data.activePlan && !data.proposedPlans.length && !data.history.length ? <EmptyPlans /> : <>
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Active plan</h2><p className="mt-1 text-xs text-muted-foreground">The approved plan currently guiding operations.</p></div><span className="text-xs font-bold text-primary">{data.activePlan ? '1 active' : 'None active'}</span></div>{data.activePlan ? <div className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1"><PlanCard plan={data.activePlan} /></div> : <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground"><Route className="mr-2" size={17} />No active plan</div>}</section>
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Proposed plans</h2><p className="mt-1 text-xs text-muted-foreground">AI proposals stay inactive until approved through WhatsApp.</p></div><span className="text-xs text-muted-foreground">{data.proposedPlans.length} awaiting review</span></div>{data.proposedPlans.length ? <div className="grid gap-4">{data.proposedPlans.map((plan) => <ProposedPlan key={plan.id} plan={plan} activeUpcomingCount={data.activePlan?.steps.filter((step) => step.status === 'UPCOMING').length ?? 0} />)}</div> : <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground"><Ship className="mr-2" size={17} />No proposed plans</div>}</section>
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Plan history</h2><p className="mt-1 text-xs text-muted-foreground">Previous versions preserve their stored reasons and steps.</p></div><span className="text-xs text-muted-foreground">{data.history.length} stored</span></div>{data.history.length ? <div className="grid gap-2">{data.history.map((plan) => <details className="group overflow-hidden rounded-lg border border-border bg-card" key={plan.id}><summary className="flex cursor-pointer list-none items-center gap-3 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"><strong className="text-sm">Plan V{plan.version}</strong>{statusBadge(plan.status)}<time className="ml-auto text-xs text-muted-foreground" dateTime={plan.createdAt}>{formatDate(plan.createdAt)}</time><ChevronDown className="text-muted-foreground transition-transform group-open:rotate-180" size={17} aria-hidden="true" /></summary><div className="grid gap-4 border-t border-border p-4"><PlanContext plan={plan} /><div><h3 className="mb-3 text-sm font-bold">Stored steps</h3><div className="overflow-hidden rounded-xl border border-border"><PlanSteps plan={plan} /></div></div></div></details>)}</div> : <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground">No plan history yet</div>}</section>
    </>}</div>}
  </div>
}

function Summary({ label, value }) {
  return <div className="flex items-start justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-bold">{value}</dd></div>
}

function Trigger({ trigger }) {
  if (!trigger) return <span>Initial plan request</span>
  return <span className="grid gap-1"><span>{trigger.message}</span><span className="text-xs font-normal text-muted-foreground">{trigger.type.replaceAll('_', ' ').toLowerCase()} · {formatDateTime(trigger.occurredAt)}</span></span>
}

function PlanContext({ plan, activeUpcomingCount }) {
  const futureStepCount = plan.steps.filter((step) => step.status === 'UPCOMING').length
  return <dl className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2"><div className="grid content-start gap-1"><dt className="text-[10px] font-bold text-slate-500 uppercase">Trigger</dt><dd className="leading-relaxed"><Trigger trigger={plan.trigger} /></dd></div>{activeUpcomingCount !== undefined && <div className="grid content-start gap-1"><dt className="text-[10px] font-bold text-slate-500 uppercase">Change summary</dt><dd className="leading-relaxed">{futureStepCount} future {futureStepCount === 1 ? 'step' : 'steps'} proposed; the current active plan has {activeUpcomingCount} upcoming {activeUpcomingCount === 1 ? 'step' : 'steps'}.</dd></div>}<div className={cn('grid content-start gap-1', activeUpcomingCount !== undefined && 'sm:col-span-2')}><dt className="text-[10px] font-bold text-slate-500 uppercase">Reason</dt><dd className="leading-relaxed text-slate-700">{plan.reason}</dd></div></dl>
}

function PlanSteps({ plan, completion }) {
  const steps = [...plan.steps].sort((first, second) => first.sequence - second.sequence)
  if (!steps.length) return <p className="p-5 text-center text-sm text-muted-foreground">No steps stored for this plan.</p>

  return <ol className="divide-y divide-border">{steps.map((step, index) => {
    const completed = step.status === 'COMPLETED'
    const canceled = step.status === 'CANCELED'
    const marking = completion?.isPending && completion.variables?.stepId === step.id
    return <li className={cn('grid grid-cols-[64px_40px_1fr_auto] items-center gap-3 p-5 max-[560px]:grid-cols-[52px_32px_1fr]', completed && 'bg-slate-50 text-slate-500', canceled && 'bg-slate-50 text-slate-500')} key={step.id}>
      <time className="text-xs font-bold" dateTime={step.scheduledAt}>{formatTime(step.scheduledAt)}</time>
      <span className={cn('grid size-8 place-items-center rounded-full border text-xs font-bold max-[560px]:size-7', completed ? 'border-primary bg-primary text-white' : canceled ? 'border-slate-300 bg-slate-200 text-slate-500' : 'border-slate-300 bg-white text-slate-500')}>{completed ? <Check size={15} /> : canceled ? <CircleX size={15} /> : index + 1}</span>
      <div className="min-w-0"><strong className={cn('block text-sm', canceled && 'line-through')}>{describeStep(step)}</strong><span className="mt-1 block text-xs">{step.batch.code} · {completed ? `Completed ${formatDateTime(step.completedAt)}` : canceled ? 'Canceled' : `Scheduled ${formatDate(step.scheduledAt)}`}</span>{step.notes && <span className="mt-1 block text-xs text-muted-foreground">{step.notes}</span>}</div>
      {completion && step.status === 'UPCOMING' && <Button className="max-[560px]:col-span-3 max-[560px]:ml-[84px]" size="sm" variant="outline" type="button" disabled={completion.isPending} onClick={() => completion.mutate({ planId: plan.id, stepId: step.id })}><CheckCircle2 />{marking ? 'Marking…' : 'Mark complete'}</Button>}
      {completed && <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 max-[560px]:col-span-3 max-[560px]:ml-[84px]"><CheckCircle2 size={14} />Completed · locked</span>}
      {canceled && <span className="text-xs font-semibold text-slate-500 max-[560px]:col-span-3 max-[560px]:ml-[84px]">Canceled</span>}
    </li>
  })}</ol>
}

export function PlanDetailsPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { plans, completion } = usePlans()
  const data = plans.data
  const plan = data ? [data.activePlan, ...data.proposedPlans, ...data.history].filter(Boolean).find((item) => item.id === planId) : null

  return <div className="mx-auto w-full max-w-[980px] px-8 pt-10 pb-8 max-[780px]:px-4 max-[780px]:py-6">
    <Button className="mb-5" variant="ghost" onClick={() => navigate('/plans')}><ArrowLeft />All plans</Button>
    <QueryState plans={plans} />
    {data && !plan && <div className="rounded-xl border border-border bg-card p-8 text-center"><p className="text-sm">Plan not found.</p><Button className="mt-4" variant="outline" asChild><Link to="/plans"><ArrowLeft />Back to plans</Link></Button></div>}
    {plan && <><StalePlans plans={plans} /><header className="rounded-xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-.035em]">Plan V{plan.version}</h1>{statusBadge(plan.status)}</div><p className="mt-2 max-w-2xl text-base font-semibold leading-relaxed">{plan.reason}</p><p className="mt-1 text-xs text-muted-foreground">Created {formatDateTime(plan.createdAt)}{plan.approvedAt ? ` · Approved ${formatDateTime(plan.approvedAt)}` : ''}</p></div>{plan.status === 'ACTIVE' && <div className="text-right"><strong className="text-2xl tracking-[-.04em]">{plan.steps.filter((step) => step.status === 'COMPLETED').length}/{plan.steps.length}</strong><p className="text-xs text-muted-foreground">steps complete</p></div>}</div></header>

      <div className="mt-5 grid grid-cols-[1fr_280px] gap-5 max-[760px]:grid-cols-1">
        <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="border-b border-border p-5"><h2 className="text-sm font-bold">Operational steps</h2><p className="mt-1 text-xs text-muted-foreground">Completed steps are historical facts and cannot be changed.</p></header><PlanSteps plan={plan} completion={plan.status === 'ACTIVE' ? completion : undefined} />{completion.isError && <p className="m-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">Step could not be marked complete. Try again.</p>}</section>
        <aside className="grid content-start gap-4"><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">AI context</h2>{plan.trigger ? <div className="mt-3"><span className="text-[10px] font-bold text-muted-foreground uppercase">Trigger</span><p className="mt-1 text-xs leading-relaxed text-slate-600">{plan.trigger.message}</p><p className="mt-1 text-[10px] text-muted-foreground">{plan.trigger.type.replaceAll('_', ' ').toLowerCase()} · {formatDateTime(plan.trigger.occurredAt)}</p></div> : <p className="mt-3 text-xs text-muted-foreground">Initial plan request</p>}<div className="mt-4 border-t border-border pt-4"><span className="text-[10px] font-bold text-muted-foreground uppercase">Reason</span><p className="mt-1 text-xs leading-relaxed text-slate-600">{plan.reason}</p></div></section><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">Plan details</h2><dl className="mt-4 grid gap-3 text-xs"><Summary label="Plan ID" value={plan.id} /><Summary label="Version" value={`V${plan.version}`} /><Summary label="Status" value={plan.status.toLowerCase()} /><Summary label="Steps" value={plan.steps.length} />{plan.previousPlanId && <Summary label="Previous plan" value={plan.previousPlanId} />}</dl></section><p className="flex gap-2 px-1 text-xs leading-relaxed text-muted-foreground"><Clock3 className="mt-0.5 shrink-0" size={14} />Plans stay synchronized with WhatsApp and operational events.</p></aside>
      </div>

      {plan.status === 'PROPOSED' && <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50/50 p-5"><div className="flex items-center justify-between gap-4 max-[600px]:flex-col max-[600px]:items-stretch"><div><h2 className="text-sm font-bold text-sky-950">Review this AI proposal</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-sky-900">This proposal is not active. Approve or dismiss it through WhatsApp.</p></div><WhatsAppButton message={`Hello SIRIP, I want to review Plan V${plan.version} (ID ${plan.id}) so I can approve or dismiss it.`} label="Review in WhatsApp" /></div></section>}
    </>}
  </div>
}
