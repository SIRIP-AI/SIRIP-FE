import { useState } from 'react'
import { ArrowLeft, Check, CheckCircle2, ChevronRight, Clock3, MapPin, Plus, Route, Ship, Thermometer, Timer, X } from 'lucide-react'

import { StatusBadge } from '@/components/status-badge.jsx'
import { Appear } from '@/components/appear.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
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

const activePlan = {
  version: 3,
  reason: 'B-017 is dispatched first because it has the shortest remaining quality window.',
  createdAt: 'Today, 08:42',
  steps: [
    { time: '09:00', batch: 'B-017', action: 'Stored in Cold Room 1', complete: true },
    { time: '10:30', batch: 'B-017', action: 'Load into TR-01' },
    { time: '11:00', batch: 'B-017', action: 'Dispatch to Processor B' },
    { time: '11:30', batch: 'B-021', action: 'Dispatch to Processor A' },
  ],
}

function ActivePlan() {
  return <Appear as="section" className="rounded-xl border border-border bg-card">
    <header className="flex items-start justify-between gap-4 border-b border-border p-5"><div><div className="flex items-center gap-2"><h2 className="text-lg font-bold tracking-[-.025em]">Plan V{activePlan.version}</h2><StatusBadge tone="healthy">Active</StatusBadge></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{activePlan.reason}</p></div><span className="shrink-0 text-xs text-muted-foreground">{activePlan.createdAt}</span></header>
    <Appear as="ol" className="divide-y divide-border px-5" delay={0.08} stagger="[data-plan-step]">{activePlan.steps.map((step) => <li data-plan-step className="grid grid-cols-[64px_24px_1fr] items-center gap-3 py-4" key={`${step.time}-${step.batch}`}><time className="text-xs font-semibold">{step.time}</time><span className={cn('grid size-6 place-items-center rounded-full border', step.complete ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white text-slate-400')}>{step.complete ? <Check size={14} /> : <span className="size-1.5 rounded-full bg-current" />}</span><div className={step.complete ? 'text-slate-500' : ''}><strong className="text-sm">{step.batch}</strong><span className="ml-2 text-xs">{step.action}</span></div></li>)}</Appear>
  </Appear>
}

function BatchOption({ batch, selected, onToggle }) {
  return <label className={cn('block cursor-pointer rounded-xl border bg-card p-4 transition-colors', selected ? 'border-primary bg-primary/[.035]' : 'border-border hover:border-slate-300')}>
    <input className="sr-only" type="checkbox" checked={selected} onChange={onToggle} />
    <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{batch.id}</strong><p className="mt-1 text-xs text-muted-foreground">{batch.weight} kg · Grade {batch.grade} · {batch.origin}</p></div><span className={cn('grid size-5 place-items-center rounded border', selected ? 'border-primary bg-primary text-white' : 'border-input bg-white')}>{selected && <Check size={13} />}</span></div>
    <div className="mt-4 grid grid-cols-2 divide-x divide-border border-y border-border py-3"><Metric icon={Thermometer} label="Temperature" value={`${batch.temperature}°C`} /><Metric icon={Timer} label="Quality remaining" value={`${batch.remaining} days`} /></div>
  </label>
}

function Metric({ icon: Icon, label, value }) { return <div className="px-3 first:pl-0 last:pr-0"><span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon size={13} />{label}</span><strong className="mt-1.5 block text-sm">{value}</strong></div> }

function Assignment({ batch, destinationId, onChange }) {
  const destination = destinations.find((item) => item.id === destinationId)
  return <article className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{batch.id}</strong><p className="mt-1 text-xs text-muted-foreground">{batch.weight} kg · Grade {batch.grade}</p></div><StatusBadge>{batch.remaining} days</StatusBadge></div><div className="mt-4"><Select value={destinationId} onValueChange={onChange}><SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select destination" /></SelectTrigger><SelectContent>{destinations.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.travel} min</SelectItem>)}</SelectContent></Select></div>{destination && <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin size={14} />{destination.location}</span><span>{destination.window}</span></div>}</article>
}

function Review({ selectedBatches, assignments }) {
  const groups = destinations.map((destination) => ({ destination, batches: selectedBatches.filter((batch) => assignments[batch.id] === destination.id) })).filter((group) => group.batches.length)
  return <div className="grid gap-3">{groups.map(({ destination, batches: assigned }) => <section className="rounded-xl border border-border bg-card p-5" key={destination.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-bold">{destination.name}</h3><p className="mt-1 text-xs text-muted-foreground">{destination.location} · {destination.travel} min · {destination.window}</p></div><StatusBadge>{assigned.reduce((total, batch) => total + batch.weight, 0)} kg</StatusBadge></div><div className="mt-4 flex flex-wrap gap-2">{assigned.map((batch) => <span className="rounded-lg bg-muted px-3 py-2 text-xs font-semibold" key={batch.id}>{batch.id} · {batch.weight} kg</span>)}</div></section>)}</div>
}

function Builder({ nextVersion, onCancel, onCreate }) {
  const [step, setStep] = useState(1)
  const [selected, setSelected] = useState([])
  const [assignments, setAssignments] = useState({})
  const selectedBatches = batches.filter((batch) => selected.includes(batch.id))
  const assignedCount = selected.filter((id) => assignments[id]).length
  const totalWeight = selectedBatches.reduce((total, batch) => total + batch.weight, 0)
  const ready = selected.length > 0 && assignedCount === selected.length
  function toggle(id) { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }
  return <Appear as="section" className="rounded-xl border border-primary/30 bg-primary/[.025]">
    <header className="flex items-center justify-between gap-4 border-b border-primary/15 p-5"><div><h2 className="text-lg font-bold">Create Plan V{nextVersion}</h2><p className="mt-1 text-xs text-muted-foreground">{step === 1 ? 'Select batches' : step === 2 ? 'Assign destinations' : 'Review proposal'}</p></div><Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel plan"><X /></Button></header>
    <div className="grid grid-cols-[1fr_240px] max-[800px]:grid-cols-1"><div className="p-5">
      {step === 1 && <Appear key="select" className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1" stagger="[data-builder-item]">{batches.map((batch) => <div data-builder-item key={batch.id}><BatchOption batch={batch} selected={selected.includes(batch.id)} onToggle={() => toggle(batch.id)} /></div>)}</Appear>}
      {step === 2 && <Appear key="assign" className="grid grid-cols-2 gap-3 max-[620px]:grid-cols-1" stagger="[data-builder-item]">{selectedBatches.map((batch) => <div data-builder-item key={batch.id}><Assignment batch={batch} destinationId={assignments[batch.id]} onChange={(destination) => setAssignments((current) => ({ ...current, [batch.id]: destination }))} /></div>)}</Appear>}
      {step === 3 && <Appear key="review"><Review selectedBatches={selectedBatches} assignments={assignments} /></Appear>}
    </div><aside className="border-l border-primary/15 bg-white/60 p-5 max-[800px]:border-t max-[800px]:border-l-0"><h3 className="text-xs font-bold">Summary</h3><dl className="mt-4 grid gap-3 text-xs"><Summary label="Batches" value={selected.length} /><Summary label="Total weight" value={`${totalWeight} kg`} /><Summary label="Assigned" value={`${assignedCount} of ${selected.length}`} /></dl>{selected.length > 0 && assignedCount < selected.length && step > 1 && <p className="mt-4 text-xs text-amber-700">Assign every batch before review.</p>}<div className="mt-6 grid gap-2">{step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}><ArrowLeft />Back</Button>}{step < 3 ? <Button disabled={step === 1 ? !selected.length : !ready} onClick={() => setStep(step + 1)}>Continue<ChevronRight /></Button> : <Button onClick={() => onCreate({ version: nextVersion, selectedBatches, assignments })}><CheckCircle2 />Create proposed plan</Button>}</div></aside></div>
  </Appear>
}

function Summary({ label, value }) { return <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="font-bold">{value}</dd></div> }

function ProposedPlan({ plan }) {
  return <Appear as="article" className="rounded-xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-base font-bold">Plan V{plan.version}</h3><StatusBadge>Proposed</StatusBadge></div><p className="mt-2 text-xs text-muted-foreground">{plan.selectedBatches.length} batches · {plan.selectedBatches.reduce((total, batch) => total + batch.weight, 0)} kg</p></div><Route className="text-muted-foreground" size={20} /></div><div className="mt-4 grid gap-2">{plan.selectedBatches.map((batch) => { const destination = destinations.find((item) => item.id === plan.assignments[batch.id]); return <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs" key={batch.id}><strong>{batch.id}</strong><ChevronRight className="text-muted-foreground" size={14} /><span className="truncate">{destination.name}</span></div> })}</div><p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Clock3 size={14} />Approve or dismiss through WhatsApp.</p></Appear>
}

export function PlansPage() {
  const [creating, setCreating] = useState(false)
  const [proposals, setProposals] = useState([])
  function create(plan) { setProposals((current) => [plan, ...current]); setCreating(false) }
  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <header className="mb-6 flex items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-[-.04em] max-[780px]:sr-only">Plans</h1><Button onClick={() => setCreating(true)} disabled={creating}><Plus />Create new plan</Button></header>
    <div className="grid gap-7">{creating && <Builder nextVersion={4 + proposals.length} onCancel={() => setCreating(false)} onCreate={create} />}<div><h2 className="mb-3 text-sm font-bold">Active plan</h2><ActivePlan /></div><Appear delay={0.12}><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">Proposed plans</h2><span className="text-xs text-muted-foreground">{proposals.length}</span></div>{proposals.length ? <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">{proposals.map((plan) => <ProposedPlan key={plan.version} plan={plan} />)}</div> : <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground"><Ship className="mr-2" size={17} />No proposed plans</div>}</Appear></div>
  </div>
}
