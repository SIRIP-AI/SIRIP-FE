import { createContext, useContext, useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Clock3, Plus, Route, Ship, Thermometer, Timer, X } from 'lucide-react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { PageHeader } from '@/components/page-header.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { cn } from '@/lib/utils.js'

const batches = [
  { id: 'B-017', weight: 120, grade: 'A', temperature: 8, remaining: 4.2, origin: 'FT-001' },
  { id: 'B-021', weight: 95, grade: 'A', temperature: 3.2, remaining: 7.1, origin: 'FT-003' },
  { id: 'B-024', weight: 140, grade: 'B', temperature: 5.1, remaining: 5.8, origin: 'FT-003' },
  { id: 'B-029', weight: 110, grade: 'A', temperature: 2.8, remaining: 8.4, origin: 'FT-005' },
]

const destinations = [
  { id: 'processor-a', name: 'Processor A', location: 'Tanjung Perak', travel: 45, window: '08:00–16:00' },
  { id: 'processor-b', name: 'Processor B', location: 'Rungkut', travel: 70, window: '09:00–17:00' },
  { id: 'processor-c', name: 'Processor C', location: 'Sidoarjo', travel: 90, window: '07:00–15:00' },
]

const initialPlans = [
  {
    id: 'PLN-104',
    status: 'ACTIVE',
    title: 'Morning dispatch · B-017',
    batchIds: ['B-017'],
    destination: 'Processor B',
    reasoning: 'B-017 is dispatched first because it has the shortest remaining quality window and has already reached Cold Room 1.',
    createdAt: '15 Aug 2026, 08:42',
    approvedAt: '15 Aug 2026, 08:48',
    approvedBy: 'Adi Rahman',
    steps: [
      { id: '104-1', dueAt: '09:00', batchId: 'B-017', action: 'Store in Cold Room 1', completedAt: '15 Aug 2026, 08:57' },
      { id: '104-2', dueAt: '10:30', batchId: 'B-017', action: 'Load into TR-01' },
      { id: '104-3', dueAt: '11:00', batchId: 'B-017', action: 'Dispatch to Processor B' },
    ],
  },
  {
    id: 'PLN-105',
    status: 'ACTIVE',
    title: 'Quality-safe transfer · B-021',
    batchIds: ['B-021'],
    destination: 'Processor A',
    reasoning: 'B-021 can move independently while TR-02 and Processor A remain available.',
    createdAt: '15 Aug 2026, 09:05',
    approvedAt: '15 Aug 2026, 09:11',
    approvedBy: 'Adi Rahman',
    steps: [
      { id: '105-1', dueAt: '11:15', batchId: 'B-021', action: 'Inspect seal and temperature' },
      { id: '105-2', dueAt: '11:30', batchId: 'B-021', action: 'Load into TR-02' },
      { id: '105-3', dueAt: '12:10', batchId: 'B-021', action: 'Handover at Processor A' },
    ],
  },
  {
    id: 'PLN-106',
    status: 'PROPOSED',
    title: 'Afternoon dispatch · B-024',
    batchIds: ['B-024'],
    destination: 'Processor C',
    reasoning: 'Processor C has enough receiving capacity and the route preserves B-024’s expected quality margin.',
    createdAt: '15 Aug 2026, 09:24',
    source: 'Web planning context',
    steps: [
      { id: '106-1', dueAt: '13:00', batchId: 'B-024', action: 'Move to staging bay' },
      { id: '106-2', dueAt: '13:30', batchId: 'B-024', action: 'Load into available vehicle' },
      { id: '106-3', dueAt: '15:00', batchId: 'B-024', action: 'Handover at Processor C' },
    ],
  },
]

const PlansContext = createContext(null)

export function PlansLayout() {
  const [plans, setPlans] = useState(initialPlans)

  function createProposal(plan) {
    setPlans((current) => [plan, ...current])
  }

  function approvePlan(planId) {
    setPlans((current) => current.map((plan) => plan.id === planId ? {
      ...plan,
      status: 'ACTIVE',
      approvedAt: 'Just now',
      approvedBy: 'Adi Rahman',
    } : plan))
  }

  function completeStep(planId, stepId) {
    setPlans((current) => current.map((plan) => plan.id === planId ? {
      ...plan,
      steps: plan.steps.map((step) => step.id === stepId && !step.completedAt ? { ...step, completedAt: 'Just now' } : step),
    } : plan))
  }

  return <PlansContext.Provider value={{ plans, createProposal, approvePlan, completeStep }}><Outlet /></PlansContext.Provider>
}

function usePlans() {
  return useContext(PlansContext)
}

function BatchOption({ batch, selected, onToggle }) {
  return <label className={cn('block cursor-pointer rounded-xl border bg-card p-4 transition-colors', selected ? 'border-primary bg-primary/[.035]' : 'border-border hover:border-slate-300')}>
    <input className="sr-only" type="checkbox" checked={selected} onChange={onToggle} />
    <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{batch.id}</strong><p className="mt-1 text-xs text-muted-foreground">{batch.weight} kg · Grade {batch.grade} · {batch.origin}</p></div><span className={cn('grid size-5 place-items-center rounded border', selected ? 'border-primary bg-primary text-white' : 'border-input bg-white')}>{selected && <Check size={13} />}</span></div>
    <div className="mt-4 grid grid-cols-2 divide-x divide-border border-y border-border py-3"><Metric icon={Thermometer} label="Temperature" value={`${batch.temperature}°C`} /><Metric icon={Timer} label="Quality remaining" value={`${batch.remaining} days`} /></div>
  </label>
}

function Metric({ icon: Icon, label, value }) {
  return <div className="px-3 first:pl-0 last:pr-0"><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon size={13} />{label}</span><strong className="mt-1.5 block text-sm">{value}</strong></div>
}

function Builder({ nextNumber, onCancel, onCreate }) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState([])
  const [assignments, setAssignments] = useState({})
  const selectedBatches = batches.filter((batch) => selected.includes(batch.id))
  const ready = selected.length > 0 && selected.every((id) => assignments[id])

  function toggle(id) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }

  function submit() {
    const id = `PLN-${nextNumber}`
    onCreate({
      id,
      status: 'PROPOSED',
      title: `${selected.length > 1 ? 'Combined dispatch' : 'Batch dispatch'} · ${selected.join(', ')}`,
      batchIds: selected,
      destination: selected.length === 1 ? destinations.find((item) => item.id === assignments[selected[0]])?.name : 'Multiple destinations',
      reasoning: 'Planning context is ready for AI validation. Review the generated sequence before activating this plan.',
      createdAt: 'Just now',
      source: 'Web planning context',
      steps: selected.flatMap((batchId, index) => {
        const destination = destinations.find((item) => item.id === assignments[batchId])
        return [
          { id: `${id}-${batchId}-1`, dueAt: `${13 + index}:00`, batchId, action: 'Inspect temperature and packaging' },
          { id: `${id}-${batchId}-2`, dueAt: `${13 + index}:30`, batchId, action: `Dispatch to ${destination.name}` },
        ]
      }),
    })
  }

  return <Appear as="section" className="rounded-xl border border-primary/30 bg-primary/[.025]">
    <header className="flex items-center justify-between gap-4 border-b border-primary/15 p-5"><div><h2 className="text-lg font-bold">Create plan context</h2><p className="mt-1 text-xs text-muted-foreground">{step === 1 ? 'Select batches' : step === 2 ? 'Assign destinations' : 'Review before generating'}</p></div><Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel plan"><X /></Button></header>
    <div className="grid grid-cols-[1fr_240px] max-[800px]:grid-cols-1"><div className="p-5">
      {step === 1 && <div className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1">{batches.map((batch) => <BatchOption key={batch.id} batch={batch} selected={selected.includes(batch.id)} onToggle={() => toggle(batch.id)} />)}</div>}
      {step === 2 && <div className="grid gap-3">{selectedBatches.map((batch) => <article className="rounded-xl border border-border bg-card p-4" key={batch.id}><strong className="text-sm">{batch.id}</strong><Select value={assignments[batch.id]} onValueChange={(destination) => setAssignments((current) => ({ ...current, [batch.id]: destination }))}><SelectTrigger className="mt-3 w-full bg-white"><SelectValue placeholder="Select destination" /></SelectTrigger><SelectContent>{destinations.map((destination) => <SelectItem key={destination.id} value={destination.id}>{destination.name} · {destination.travel} min</SelectItem>)}</SelectContent></Select></article>)}</div>}
      {step === 3 && <div className="grid gap-3">{selectedBatches.map((batch) => { const destination = destinations.find((item) => item.id === assignments[batch.id]); return <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4" key={batch.id}><div><strong className="text-sm">{batch.id}</strong><p className="mt-1 text-xs text-muted-foreground">{batch.weight} kg · Grade {batch.grade}</p></div><span className="text-xs font-semibold">{destination.name}</span></div> })}<p className="rounded-lg bg-sky-50 p-3 text-xs leading-relaxed text-sky-800">Generating creates an inactive proposal. Review and approve it on the website before operations begin.</p></div>}
    </div><aside className="min-w-0 border-l border-primary/15 bg-white/60 p-5 max-[800px]:border-t max-[800px]:border-l-0"><h3 className="text-xs font-bold">Planning context</h3><dl className="mt-4 grid gap-3 text-xs"><Summary label="Batches" value={selected.length} /><Summary label="Total weight" value={`${selectedBatches.reduce((total, batch) => total + batch.weight, 0)} kg`} /><Summary label="Assigned" value={`${Object.keys(assignments).filter((id) => selected.includes(id)).length} of ${selected.length}`} /></dl><div className="mt-6 grid min-w-0 gap-2">{step > 1 && <Button className="w-full min-w-0" variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft />Back</Button>}{step < 3 ? <Button className="w-full min-w-0" disabled={step === 1 ? !selected.length : !ready} onClick={() => setStep(step + 1)}>Continue<ChevronRight /></Button> : <Button className="w-full min-w-0" onClick={submit}><CheckCircle2 />Generate proposal</Button>}</div></aside></div>
  </Appear>
}

function Summary({ label, value }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-bold">{value}</dd></div>
}

function PlanCard({ plan }) {
  const completed = plan.steps.filter((step) => step.completedAt).length
  const nextStep = plan.steps.find((step) => !step.completedAt)
  const active = plan.status === 'ACTIVE'
  return <Appear as="article" className={cn('group rounded-xl border bg-card p-5 transition-colors', active ? 'border-border hover:border-primary/35' : 'border-sky-200 bg-sky-50/30')}>
    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-bold">{plan.id}</h3><StatusBadge tone={active ? 'healthy' : 'neutral'}>{active ? 'Active' : 'Proposed'}</StatusBadge></div><p className="mt-2 text-sm font-semibold">{plan.title}</p><p className="mt-1 text-xs text-muted-foreground">{plan.batchIds.join(', ')} · {plan.destination}</p></div><Route className={active ? 'text-primary' : 'text-sky-600'} size={20} /></div>
    {active ? <div className="mt-5"><div className="mb-2 flex items-center justify-between text-xs"><span className="text-muted-foreground">{nextStep ? `Next · ${nextStep.dueAt}` : 'All steps complete'}</span><strong>{completed}/{plan.steps.length}</strong></div><div className="flex gap-1" aria-label={`${completed} of ${plan.steps.length} steps completed`}>{plan.steps.map((step) => <span className={cn('h-1.5 flex-1 rounded-full', step.completedAt ? 'bg-primary' : 'bg-slate-200')} key={step.id} />)}</div>{nextStep && <p className="mt-3 truncate text-xs">{nextStep.action}</p>}</div> : <p className="mt-5 rounded-lg bg-white/80 p-3 text-xs leading-relaxed text-slate-600">Inactive until reviewed and approved on the website.</p>}
    <Button className="mt-5 w-full" variant={active ? 'outline' : 'default'} asChild><Link to={`/plans/${plan.id}`}>{active ? 'Open plan' : 'Review and approve'}<ChevronRight /></Link></Button>
  </Appear>
}

export function PlansPage() {
  const { plans, createProposal } = usePlans()
  const [creating, setCreating] = useState(false)
  const newestFirst = (left, right) => Number(right.id.split('-')[1]) - Number(left.id.split('-')[1])
  const activePlans = plans.filter((plan) => plan.status === 'ACTIVE').sort(newestFirst)
  const proposedPlans = plans.filter((plan) => plan.status === 'PROPOSED').sort(newestFirst)
  const nextNumber = Math.max(...plans.map((plan) => Number(plan.id.split('-')[1]))) + 1

  function create(plan) {
    createProposal(plan)
    setCreating(false)
  }

  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <PageHeader title="Plans" description="Run several approved plans at once, and review new proposals before they become operational." action={<Button onClick={() => setCreating(true)} disabled={creating}><Plus />Create new plan</Button>} />
    <div className="grid gap-8">
      {creating && <Builder nextNumber={nextNumber} onCancel={() => setCreating(false)} onCreate={create} />}
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Active plans</h2><p className="mt-1 text-xs text-muted-foreground">Each plan runs independently until all steps are complete.</p></div><span className="text-xs font-bold text-primary">{activePlans.length} running</span></div><div className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1">{activePlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div></section>
      <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">Proposed plans</h2><p className="mt-1 text-xs text-muted-foreground">Generated plans remain inactive until approved here.</p></div><span className="text-xs text-muted-foreground">{proposedPlans.length} awaiting review</span></div>{proposedPlans.length ? <div className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1">{proposedPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div> : <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground"><Ship className="mr-2" size={17} />No proposed plans</div>}</section>
    </div>
  </div>
}

export function PlanDetailsPage() {
  const { planId } = useParams()
  const navigate = useNavigate()
  const { plans, approvePlan, completeStep } = usePlans()
  const [comments, setComments] = useState('')
  const plan = plans.find((item) => item.id === planId)

  if (!plan) return <div className="mx-auto max-w-3xl px-8 py-12"><p className="text-sm">Plan not found.</p><Button className="mt-4" variant="outline" asChild><Link to="/plans"><ArrowLeft />Back to plans</Link></Button></div>

  const active = plan.status === 'ACTIVE'
  const completed = plan.steps.filter((step) => step.completedAt).length
  return <div className="mx-auto w-full max-w-[980px] px-8 pt-10 pb-8 max-[780px]:px-4 max-[780px]:py-6">
    <Button className="mb-5" variant="ghost" onClick={() => navigate('/plans')}><ArrowLeft />All plans</Button>
    <header className="rounded-xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-.035em]">{plan.id}</h1><StatusBadge tone={active ? 'healthy' : 'neutral'}>{active ? 'Active' : 'Proposed'}</StatusBadge></div><p className="mt-2 text-base font-semibold">{plan.title}</p><p className="mt-1 text-xs text-muted-foreground">Created {plan.createdAt} · {plan.source ?? 'Approved web plan'}</p></div>{active && <div className="text-right"><strong className="text-2xl tracking-[-.04em]">{completed}/{plan.steps.length}</strong><p className="text-xs text-muted-foreground">steps complete</p></div>}</div>
    </header>

    <div className="mt-5 grid grid-cols-[1fr_280px] gap-5 max-[760px]:grid-cols-1">
      <section className="rounded-xl border border-border bg-card"><header className="border-b border-border p-5"><h2 className="text-sm font-bold">Operational steps</h2><p className="mt-1 text-xs text-muted-foreground">Completed steps are timestamped and cannot be changed.</p></header><ol className="divide-y divide-border">{plan.steps.map((step, index) => <li className={cn('grid grid-cols-[56px_40px_1fr_auto] items-center gap-3 p-5 max-[560px]:grid-cols-[44px_32px_1fr]', step.completedAt && 'bg-slate-50 text-slate-500')} key={step.id}><time className="text-xs font-bold">{step.dueAt}</time><span className={cn('grid size-8 place-items-center rounded-full border text-xs font-bold', step.completedAt ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-500')}>{step.completedAt ? <Check size={15} /> : index + 1}</span><div><strong className="block text-sm">{step.action}</strong><span className="mt-1 block text-xs">{step.batchId}{step.completedAt ? ` · Completed ${step.completedAt}` : ' · Scheduled'}</span></div>{active && <Button className="max-[560px]:col-span-3 max-[560px]:ml-[76px]" size="sm" variant={step.completedAt ? 'ghost' : 'outline'} disabled={Boolean(step.completedAt)} onClick={() => completeStep(plan.id, step.id)}>{step.completedAt ? 'Completed' : 'Mark complete'}</Button>}</li>)}</ol></section>
      <aside className="grid content-start gap-4"><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">AI context</h2><p className="mt-3 text-xs leading-relaxed text-slate-600">{plan.reasoning}</p></section><section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">Plan details</h2><dl className="mt-4 grid gap-3 text-xs"><Summary label="Batches" value={plan.batchIds.join(', ')} /><Summary label="Destination" value={plan.destination} />{plan.approvedAt && <><Summary label="Approved" value={plan.approvedAt} /><Summary label="Approved by" value={plan.approvedBy} /></>}</dl></section><p className="flex gap-2 px-1 text-xs leading-relaxed text-muted-foreground"><Clock3 className="mt-0.5 shrink-0" size={14} />Future alerts and replanning decisions will stay synchronized with WhatsApp and IoT events.</p></aside>
    </div>
    {!active && <section className="mt-5 rounded-xl border border-sky-200 bg-sky-50/50 p-5"><div className="max-w-2xl"><label className="text-sm font-bold" htmlFor="plan-comments">Operator comments</label><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Add constraints, corrections, or context for the next edit before making this plan active.</p><Textarea className="mt-3 min-h-28 bg-white" id="plan-comments" value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Add a comment for this proposed plan" maxLength={1000} /></div><div className="mt-5 flex items-center justify-between gap-4 border-t border-sky-200 pt-5 max-[600px]:flex-col max-[600px]:items-stretch"><p className="max-w-md text-xs leading-relaxed text-sky-900">Approval activates this plan alongside the {plans.filter((item) => item.status === 'ACTIVE').length} plans already running.</p><div className="flex gap-2 max-[600px]:flex-col"><Button variant="outline">Edit plan</Button><Button onClick={() => approvePlan(plan.id)}><CheckCircle2 />Approve and activate</Button></div></div></section>}
  </div>
}
