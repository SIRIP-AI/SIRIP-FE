import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Cpu, Pencil, Plus, Ship, Thermometer, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { apiError, batchInputSchema, listBatches, listFishingTrips, saveBatch } from './batches-api.js'

const statusLabels = { MONITORING: 'Monitoring', ACTIVE: 'Active', INSPECTION_HOLD: 'Inspection hold', HANDED_OVER: 'Handed over', CLOSED: 'Closed' }
const statusTones = { MONITORING: 'neutral', ACTIVE: 'healthy', INSPECTION_HOLD: 'warning', HANDED_OVER: 'neutral', CLOSED: 'neutral' }
const localValue = (value) => new Date(value).toISOString().slice(0, 16)
const measurement = (value, suffix) => value === null ? 'Not available' : `${value.toLocaleString()}${suffix}`

function Field({ label, error, children }) { return <div className="grid gap-2"><Label className="text-xs font-semibold text-slate-600">{label}</Label>{children}{error && <span className="text-xs text-red-700">{error}</span>}</div> }

function BatchDialog({ batch, trips, onClose }) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState({})
  const mutation = useMutation({ mutationFn: (input) => saveBatch({ ...input, id: batch?.id }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['batches'] }); onClose() } })
  function submit(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const result = batchInputSchema.safeParse({ code: form.get('code'), fishingTripId: form.get('fishingTripId'), weightKg: Number(form.get('weightKg')), grade: form.get('grade'), receivedAt: new Date(form.get('receivedAt')).toISOString() })
    if (!result.success) return setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
    setErrors({}); mutation.mutate(result.data)
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-[520px] p-6"><form className="grid gap-4" onSubmit={submit}>
    <DialogHeader><DialogTitle>{batch ? 'Edit batch' : 'Receive batch'}</DialogTitle><DialogDescription className="sr-only">Batch intake details</DialogDescription></DialogHeader>
    <Field label="Batch ID" error={errors.code}><Input name="code" defaultValue={batch?.code ?? ''} placeholder="B-017" autoFocus required /></Field>
    <div className="grid grid-cols-2 gap-3"><Field label="Weight (kg)" error={errors.weightKg}><Input name="weightKg" type="number" min="0.01" step="0.01" defaultValue={batch?.weightKg ?? ''} required /></Field><Field label="Grade" error={errors.grade}><Input name="grade" defaultValue={batch?.grade ?? ''} required /></Field></div>
    <Field label="Fishing trip" error={errors.fishingTripId}><Select name="fishingTripId" defaultValue={batch?.fishingTripId ?? trips[0]?.id}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{trips.map((trip) => <SelectItem key={trip.id} value={trip.id}>{trip.code} · {trip.vesselName}</SelectItem>)}</SelectContent></Select></Field>
    <Field label="Received" error={errors.receivedAt}><Input name="receivedAt" type="datetime-local" defaultValue={localValue(batch?.receivedAt ?? new Date())} required /></Field>
    {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
    <DialogFooter><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : batch ? 'Save batch' : 'Receive batch'}</Button></DialogFooter>
  </form></DialogContent></Dialog>
}

function BatchCard({ batch, onEdit }) {
  return <article className="flex min-h-72 flex-col rounded-xl border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold">{batch.code}</h2><p className="mt-1 text-xs text-muted-foreground">{batch.weightKg.toLocaleString()} kg · Grade {batch.grade}</p></div><StatusBadge tone={statusTones[batch.status]}>{statusLabels[batch.status]}</StatusBadge></div>
    <div className="mt-5 grid grid-cols-2 divide-x divide-border border-y border-border py-4"><Metric icon={Thermometer} label="Temperature" value={measurement(batch.currentTemperatureC, '°C')} /><Metric icon={Timer} label="Quality remaining" value={measurement(batch.remainingQualityWindowDays, ' days')} /></div>
    <dl className="mt-4 grid gap-2.5 text-xs"><Fact icon={Ship} label="Origin" value={`${batch.fishingTrip.code} · ${batch.fishingTrip.vesselName}`} /><Fact icon={Cpu} label="Sensor" value={batch.activeSensor?.code ?? 'Unassigned'} /></dl>
    <div className="mt-auto flex items-center justify-between gap-3 pt-5"><time className="text-[11px] text-muted-foreground">Received {new Date(batch.receivedAt).toLocaleString()}</time><Button variant="outline" size="sm" onClick={onEdit}><Pencil />Edit</Button></div>
  </article>
}
function Metric({ icon: Icon, label, value }) { return <div className="px-4 first:pl-0 last:pr-0"><div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><Icon size={14} />{label}</div><strong className="mt-2 block text-sm">{value}</strong></div> }
function Fact({ icon: Icon, label, value }) { return <div className="flex min-w-0 items-center gap-2"><Icon className="shrink-0 text-muted-foreground" size={15} /><dt className="text-muted-foreground">{label}</dt><dd className="ml-auto min-w-0 truncate font-semibold" title={value}>{value}</dd></div> }
function State({ children, error }) { return <div className={`flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 text-sm ${error ? 'border-red-200 bg-red-50/40 text-red-700' : 'border-slate-300 bg-white/50 text-muted-foreground'}`} role={error ? 'alert' : 'status'}><Boxes size={22} />{children}</div> }

export function BatchesPage() {
  const [editing, setEditing] = useState(undefined)
  const query = useQuery({ queryKey: ['batches'], queryFn: listBatches })
  const trips = useQuery({ queryKey: ['fishing-trips'], queryFn: listFishingTrips })
  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <header className="mb-6 flex items-center justify-between gap-4"><div><h1 className="text-3xl font-bold tracking-[-.04em] max-[780px]:sr-only">Batches</h1><Link className="mt-2 block text-sm text-primary hover:underline max-[780px]:mt-0" to="/fishing-trips">Fishing trips</Link></div><Button onClick={() => setEditing(null)} disabled={!trips.data?.length}><Plus />Receive batch</Button></header>
    {query.isPending && <State>Loading batches…</State>}{query.isError && <State error>{apiError(query.error)}</State>}{query.isSuccess && !query.data.length && <State>No batches</State>}
    {query.isSuccess && query.data.length > 0 && <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">{query.data.map((batch) => <BatchCard key={batch.id} batch={batch} onEdit={() => setEditing(batch)} />)}</div>}
    {trips.isSuccess && !trips.data.length && <p className="mt-4 text-xs text-muted-foreground">Add a fishing trip before receiving a batch.</p>}
    {editing !== undefined && trips.data?.length > 0 && <BatchDialog batch={editing} trips={trips.data} onClose={() => setEditing(undefined)} />}
  </div>
}
