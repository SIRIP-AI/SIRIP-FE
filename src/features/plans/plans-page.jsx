import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, CheckCircle2, CircleX, Plus, Route, Ship } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { PageHeader } from '@/components/page-header.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { listBatches } from '@/features/batches/batches-api.js'
import { resolvePlanLineage } from '@/features/plans/plan-lineage.js'
import { approvePlan, completePlanStep, createPlanProposal, createPlanRevision, dismissPlan, planQueryOptions, plansQueryOptions } from '@/features/plans/plans-api.js'
import { listResources } from '@/features/resources/resources-api.js'
import { sortPlanSteps } from '@/lib/ordering.js'
import { cn } from '@/lib/utils.js'

const actions = { STORE: 'Store', LOAD: 'Load', DISPATCH: 'Dispatch', RETURN_TO_BASE: 'Return to base', HANDOVER: 'Hand over', INSPECT: 'Inspect', OTHER: 'Handle' }
const prepositions = { STORE: 'in', LOAD: 'into', DISPATCH: 'to', HANDOVER: 'at', INSPECT: 'at', OTHER: 'with' }
const eligibleStatuses = new Set(['MONITORING', 'ACTIVE', 'INSPECTION_HOLD'])
const dateFormatter = new Intl.DateTimeFormat([], { dateStyle: 'medium', timeStyle: 'short' })

function formatDateTime(value) { return dateFormatter.format(new Date(value)) }
function localDateTime(value) { const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
function describeStep(step) {
  const vehicle = step.resources.find((resource) => resource.type === 'VEHICLE')
  const destination = step.resources.find((resource) => resource.type === 'DESTINATION')
  if (step.actionType === 'RETURN_TO_BASE') return `Return ${vehicle?.name ?? 'vehicle'} to base${destination ? ` from ${destination.name}` : ''}`
  if (step.actionType === 'DISPATCH') return `Dispatch ${step.batch?.code ?? 'batch'}${vehicle ? ` via ${vehicle.name}` : ''}${destination ? ` to ${destination.name}` : ''}`
  const resource = step.resources[0]
  return `${actions[step.actionType]} ${step.batch?.code ?? 'batch'}${resource ? ` ${prepositions[step.actionType]} ${resource.name}` : ''}`
}
function formatSource(source) { return source === 'WHATSAPP' ? 'WhatsApp' : source[0] + source.slice(1).toLowerCase() }
function invalidatePlanQueries(queryClient) { return Promise.all(['plans', 'overview', 'batches'].map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }))) }
function apiError(error) { return error?.response?.data?.error ?? error?.message ?? 'Something went wrong' }
function statusBadge(status) {
  if (status === 'ACTIVE') return <StatusBadge tone="healthy">Active</StatusBadge>
  if (status === 'PROPOSED') return <StatusBadge className="bg-sky-50 text-sky-700">Proposed</StatusBadge>
  if (status === 'COMPLETED') return <StatusBadge>Completed</StatusBadge>
  if (status === 'DISMISSED') return <StatusBadge tone="critical">Dismissed</StatusBadge>
  return <StatusBadge>Superseded</StatusBadge>
}

function ErrorMessage({ error }) { return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{apiError(error)}</p> }
function QueryState({ query, label = 'plans' }) {
  if (query.isPending) return <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground" role="status">Loading {label}…</div>
  if (query.isError) return <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 text-center" role="alert"><strong className="block text-sm text-red-800">{label[0].toUpperCase() + label.slice(1)} unavailable</strong><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Try again</Button></div>
  return null
}

function PlanCard({ plan, plans }) {
  const steps = sortPlanSteps(plan.steps)
  const lineage = resolvePlanLineage(plan, plans)
  const completed = steps.filter((step) => step.status === 'COMPLETED').length
  const next = steps.find((step) => step.status === 'UPCOMING')
  return <Appear as="article" className={cn('rounded-xl border bg-card p-5', plan.status === 'PROPOSED' && 'border-sky-200 bg-sky-50/30')}>
    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">Plan V{plan.version}</h3>{statusBadge(plan.status)}</div><p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed">{plan.summary}</p><p className="mt-1 text-xs text-muted-foreground">{plan.batches.map((batch) => batch.code).join(', ')}</p><p className="mt-1 text-xs text-muted-foreground">{plan.deadline ? `Arrival deadline · ${formatDateTime(plan.deadline)}` : 'No arrival deadline'}</p></div><Route className="shrink-0 text-primary" size={20} /></div>
    {plan.status === 'PROPOSED' && plan.trigger && <div className="mt-4 rounded-lg border border-sky-100 bg-white/70 px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wide text-sky-800">Trigger · {formatSource(plan.trigger.source)}</span><p className="mt-1 line-clamp-2 text-xs text-slate-700">{plan.trigger.message}</p></div>}
    {lineage && <p className="mt-4 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">Revision of <strong className="text-foreground">Plan V{lineage.predecessor.version}</strong> · {lineage.retainedCompletedSteps} completed {lineage.retainedCompletedSteps === 1 ? 'step' : 'steps'} retained</p>}
    <div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">{next ? `Next · ${formatDateTime(next.scheduledAt)}` : 'No future steps'}</span><strong>{completed}/{steps.length}</strong></div><div className="flex gap-1" aria-label={`${completed} of ${steps.length} steps completed`}>{steps.map((step) => <span className={cn('h-1.5 flex-1 rounded-full', step.status === 'COMPLETED' ? 'bg-primary' : 'bg-slate-200')} key={step.id} />)}</div></div>
    <Button className="mt-5 w-full" variant="outline" asChild><Link to={`/plans/${plan.id}`}>{plan.status === 'PROPOSED' ? 'Review proposal' : 'View plan'}</Link></Button>
  </Appear>
}

function CreatePlanDialog({ activePlans, onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [destinationId, setDestinationId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [openedAt] = useState(() => Date.now())
  const batches = useQuery({ queryKey: ['batches'], queryFn: listBatches })
  const destinations = useQuery({ queryKey: ['resources', 'destinations'], queryFn: () => listResources('destinations') })
  const plannedBatchIds = new Set(activePlans.flatMap((plan) => plan.batches.map((batch) => batch.id)))
  const eligible = (batches.data ?? []).filter((batch) => eligibleStatuses.has(batch.status) && !plannedBatchIds.has(batch.id))
  const availableDestinations = (destinations.data ?? []).filter((destination) => destination.status === 'AVAILABLE')
  const validDeadline = deadline && new Date(deadline).getTime() > openedAt
  const mutation = useMutation({ mutationFn: createPlanProposal, onSuccess: async (result) => { if (result.status === 'NO_VALID_PROPOSAL_FOUND') return; await invalidatePlanQueries(queryClient); onClose(); navigate(`/plans/${result.proposal.id}`) } })
  function toggle(id) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-[560px] p-6"><DialogHeader><DialogTitle>Create plan proposal</DialogTitle><DialogDescription>Select the active batches and their delivery destination.</DialogDescription></DialogHeader>
    {destinations.isPending && <p className="text-sm text-muted-foreground" role="status">Loading destinations…</p>}
    {destinations.isError && <ErrorMessage error={destinations.error} />}
    {destinations.isSuccess && availableDestinations.length > 0 && <div className="grid gap-2"><Label htmlFor="plan-destination">Destination</Label><Select value={destinationId} onValueChange={setDestinationId}><SelectTrigger id="plan-destination" className="w-full"><SelectValue placeholder="Select a destination" /></SelectTrigger><SelectContent>{availableDestinations.map((destination) => <SelectItem key={destination.id} value={destination.id}>{destination.name} · {destination.address}</SelectItem>)}</SelectContent></Select></div>}
    <div className="grid gap-2"><Label htmlFor="plan-deadline">Arrival deadline</Label><Input id="plan-deadline" type="datetime-local" min={localDateTime(openedAt)} value={deadline} onChange={(event) => setDeadline(event.target.value)} required /><p className="text-xs text-muted-foreground">All selected batches must arrive at the destination by this time.</p></div>
    {destinations.isSuccess && !availableDestinations.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No available destinations are configured.</p>}
    {batches.isPending && <p className="py-8 text-center text-sm text-muted-foreground" role="status">Loading eligible batches…</p>}
    {batches.isError && <ErrorMessage error={batches.error} />}
    {batches.isSuccess && !eligible.length && <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No eligible active batches are available.</p>}
    {eligible.length > 0 && <fieldset className="grid max-h-80 gap-2 overflow-y-auto"><legend className="sr-only">Eligible batches</legend>{eligible.map((batch) => <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-slate-50" key={batch.id}><input className="mt-1 size-4 accent-primary" type="checkbox" checked={selected.includes(batch.id)} onChange={() => toggle(batch.id)} /><span><strong className="block text-sm">{batch.code}</strong><span className="text-xs text-muted-foreground">{batch.weightKg.toLocaleString()} kg · Grade {batch.grade} · {batch.status.replaceAll('_', ' ').toLowerCase()}</span></span></Label>)}</fieldset>}
    {mutation.isError && <ErrorMessage error={mutation.error} />}
    {mutation.data?.status === 'NO_VALID_PROPOSAL_FOUND' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status"><strong className="block">No valid proposal found</strong>{mutation.data.reason}</p>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!selected.length || !destinationId || !validDeadline || mutation.isPending} onClick={() => mutation.mutate({ batchIds: selected, destinationId, deadline: new Date(deadline).toISOString() })}>{mutation.isPending ? 'Creating…' : `Create proposal${selected.length ? ` (${selected.length})` : ''}`}</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function PlansPage() {
  const [creating, setCreating] = useState(false)
  const plans = useQuery(plansQueryOptions)
  const data = plans.data
  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <PageHeader title="Plans" description="Create batch-scoped operation plans, review proposals, and follow active work." action={<Button onClick={() => setCreating(true)}><Plus />Create plan</Button>} />
    <QueryState query={plans} />
    {data && <div className="grid gap-8"><p className="text-right text-xs text-muted-foreground">Updated {formatDateTime(data.updatedAt)}</p>
      {!data.activePlans.length && !data.proposedPlans.length && !data.history.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center"><Route className="mx-auto text-muted-foreground" size={24} /><h2 className="mt-3 font-bold">No plans yet</h2><p className="mt-2 text-sm text-muted-foreground">Create a proposal for one or more active batches.</p><Button className="mt-5" onClick={() => setCreating(true)}><Plus />Create plan</Button></div>}
      {(data.activePlans.length > 0 || data.proposedPlans.length > 0 || data.history.length > 0) && <>
        <PlanSection title="Active plans" description="Approved plans currently guiding their scoped batches." count={`${data.activePlans.length} active`} plans={data.activePlans} allPlans={data} empty="No active plans" />
        <PlanSection title="Proposed plans" description="Review, approve, or dismiss proposals before they guide operations." count={`${data.proposedPlans.length} awaiting review`} plans={data.proposedPlans} allPlans={data} empty="No proposed plans" />
        <PlanSection title="Plan history" description="Completed, superseded, and dismissed plans remain available for reference." count={`${data.history.length} stored`} plans={data.history} allPlans={data} empty="No plan history yet" />
      </>}
    </div>}
    {creating && <CreatePlanDialog activePlans={data?.activePlans ?? []} onClose={() => setCreating(false)} />}
  </div>
}

function PlanSection({ title, description, count, plans, allPlans, empty }) {
  return <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><span className="text-xs text-muted-foreground">{count}</span></div>{plans.length ? <div className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} plans={allPlans} />)}</div> : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground"><Ship className="mr-2" size={17} />{empty}</div>}</section>
}

function PlanSteps({ plan, completion }) {
  const steps = sortPlanSteps(plan.steps)
  if (!steps.length) return <p className="p-5 text-center text-sm text-muted-foreground">No steps stored for this plan.</p>
  return <ol className="divide-y divide-border">{steps.map((step, index) => {
    const completed = step.status === 'COMPLETED'; const canceled = step.status === 'CANCELED'; const marking = completion?.isPending && completion.variables?.stepId === step.id
    const completionLabel = step.actionType === 'RETURN_TO_BASE' ? 'Mark truck returned' : 'Mark complete'
    return <li className={cn('grid grid-cols-[40px_1fr_auto] items-center gap-3 p-5', (completed || canceled) && 'bg-slate-50 text-slate-500')} key={step.id}><span className={cn('grid size-8 place-items-center rounded-full border text-xs font-bold', completed ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white')}>{completed ? <Check size={15} /> : canceled ? <CircleX size={15} /> : index + 1}</span><div><strong className={cn('block text-sm', canceled && 'line-through')}>{describeStep(step)}</strong><span className="mt-1 block text-xs">{completed ? `Completed ${formatDateTime(step.completedAt)}` : canceled ? 'Canceled' : `${step.actionType === 'RETURN_TO_BASE' ? 'Expected' : 'Scheduled'} ${formatDateTime(step.scheduledAt)}`}</span>{step.rationale && <span className="mt-1 block text-xs text-muted-foreground">{step.rationale}</span>}</div>{completion && step.status === 'UPCOMING' && <Button size="sm" variant="outline" disabled={completion.isPending} onClick={() => completion.mutate({ planId: plan.id, stepId: step.id })}><CheckCircle2 />{marking ? 'Marking…' : completionLabel}</Button>}</li>
  })}</ol>
}

function ReviewActions({ plan }) {
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: (action) => action === 'approve' ? approvePlan(plan.id) : dismissPlan(plan.id), onSuccess: async () => { await invalidatePlanQueries(queryClient); navigate('/plans') } })
  return <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-5"><h2 className="text-sm font-bold text-sky-950">Review proposal</h2><p className="mt-1 text-xs text-sky-900">Approval activates this plan for its scoped batches. Dismissal keeps it in history.</p>{mutation.isError && <div className="mt-3"><ErrorMessage error={mutation.error} /></div>}<div className="mt-4 flex gap-2"><Button disabled={mutation.isPending} onClick={() => mutation.mutate('approve')}>Approve proposal</Button><Button variant="destructive-outline" disabled={mutation.isPending} onClick={() => mutation.mutate('dismiss')}>Dismiss</Button></div></section>
}

function RevisionForm({ plan }) {
  const queryClient = useQueryClient(); const navigate = useNavigate(); const [instruction, setInstruction] = useState('')
  const mutation = useMutation({ mutationFn: () => createPlanRevision(plan.id, instruction), onSuccess: async (result) => { if (result.status === 'NO_VALID_PROPOSAL_FOUND') return; await invalidatePlanQueries(queryClient); navigate(`/plans/${result.proposal.id}`) } })
  const description = plan.status === 'ACTIVE'
    ? 'Describe changes to future steps. Completed steps remain locked and the active plan stays unchanged until the revision is approved.'
    : 'Describe changes to this proposal. A replacement proposal will be generated for the same batches.'
  return <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">Propose an edit</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p><Label className="sr-only" htmlFor="revision-instruction">Revision instruction</Label><Textarea id="revision-instruction" className="mt-4 min-h-28" value={instruction} maxLength={2000} placeholder="For example: Dispatch batch B-017 tomorrow morning instead." onChange={(event) => setInstruction(event.target.value)} />{mutation.isError && <div className="mt-3"><ErrorMessage error={mutation.error} /></div>}{mutation.data?.status === 'NO_VALID_PROPOSAL_FOUND' && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status"><strong className="block">No valid revision proposal found</strong>{mutation.data.reason}</p>}<Button className="mt-3" disabled={!instruction.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Creating revision…' : 'Create proposed revision'}</Button></section>
}

export function PlanDetailsPage() {
  const { planId } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const planQuery = useQuery(planQueryOptions(planId)); const plansQuery = useQuery(plansQueryOptions); const plan = planQuery.data
  const completion = useMutation({ mutationFn: ({ planId: id, stepId }) => completePlanStep(id, stepId), onSuccess: async () => { await Promise.all([invalidatePlanQueries(queryClient), queryClient.invalidateQueries({ queryKey: ['resources'] })]) } })
  const completed = plan?.steps.filter((step) => step.status === 'COMPLETED') ?? []; const future = plan?.steps.filter((step) => step.status !== 'COMPLETED') ?? []; const lineage = plan ? resolvePlanLineage(plan, plansQuery.data) : null
  return <div className="mx-auto w-full max-w-[980px] px-8 pt-10 pb-8 max-[780px]:px-4 max-[780px]:py-6"><Button className="mb-5" variant="ghost" onClick={() => navigate('/plans')}><ArrowLeft />All plans</Button><QueryState query={planQuery} label="plan" />
    {plan && <div className="grid gap-5"><header className="rounded-xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-.035em]">Plan V{plan.version}</h1>{statusBadge(plan.status)}</div><p className="mt-2 max-w-2xl font-semibold leading-relaxed">{plan.summary}</p><p className="mt-2 text-xs text-muted-foreground">Created {formatDateTime(plan.createdAt)}</p><p className="mt-1 text-xs font-semibold text-slate-700">{plan.deadline ? `Arrival deadline · ${formatDateTime(plan.deadline)}` : 'No arrival deadline'}</p></div><div className="text-right"><strong className="text-2xl">{completed.length}/{plan.steps.length}</strong><p className="text-xs text-muted-foreground">steps complete</p></div></div><div className="mt-5 flex flex-wrap gap-2" aria-label="Scoped batches">{plan.batches.map((batch) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold" key={batch.id}>{batch.code}</span>)}</div></header>
      {plan.status === 'PROPOSED' && plan.trigger && <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-sky-800">Proposal trigger</p><p className="mt-2 text-sm font-semibold text-sky-950">{plan.trigger.message}</p><p className="mt-2 text-xs text-sky-900">{formatSource(plan.trigger.source)} · {plan.trigger.type.replaceAll('_', ' ').toLowerCase()} · {formatDateTime(plan.trigger.occurredAt)}</p></section>}
      {lineage && <section className="rounded-xl border border-border bg-card p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Plan lineage</p><div className="mt-2 flex flex-wrap items-baseline justify-between gap-2"><Link className="font-bold text-primary underline-offset-4 hover:underline" to={`/plans/${lineage.predecessor.id}`}>Previous plan · V{lineage.predecessor.version}</Link><span className="text-xs text-muted-foreground">{lineage.predecessor.approvedAt ? `Approved ${formatDateTime(lineage.predecessor.approvedAt)}` : 'Not approved'}</span></div><p className="mt-2 text-sm">{lineage.retainedCompletedSteps} completed {lineage.retainedCompletedSteps === 1 ? 'step was' : 'steps were'} retained in this version.</p>{lineage.predecessor.trigger && <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Previous trigger · {formatSource(lineage.predecessor.trigger.source)}</span><p className="mt-1 text-xs text-foreground">{lineage.predecessor.trigger.message}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(lineage.predecessor.trigger.occurredAt)}</p></div>}</section>}
      {plan.status === 'PROPOSED' && <ReviewActions plan={plan} />}
      {plan.status === 'COMPLETED' && <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary" role="status">Completed {formatDateTime(plan.completedAt)}. Its batches are available for new plans.</p>}
      <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="border-b border-border p-5"><h2 className="text-sm font-bold">Completed steps</h2><p className="mt-1 text-xs text-muted-foreground">Historical facts are preserved in every revision.</p></header><PlanSteps plan={{ ...plan, steps: completed }} /></section>
      <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="border-b border-border p-5"><h2 className="text-sm font-bold">Future steps</h2><p className="mt-1 text-xs text-muted-foreground">Upcoming and canceled work for the plan’s scoped batches.</p></header><PlanSteps plan={{ ...plan, steps: future }} completion={plan.status === 'ACTIVE' ? completion : undefined} />{completion.isError && <div className="m-5"><ErrorMessage error={completion.error} /></div>}</section>
      {(plan.status === 'ACTIVE' || plan.status === 'PROPOSED') && <RevisionForm plan={plan} />}
    </div>}
  </div>
}
