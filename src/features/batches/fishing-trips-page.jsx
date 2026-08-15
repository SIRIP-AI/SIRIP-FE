import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Anchor, Check, Clock3, Pencil, Plus, Ship, Boxes } from 'lucide-react'

import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { apiError, completeFishingTrip, fishingTripInputSchema, listFishingTrips, saveFishingTrip } from './batches-api.js'

const dateTime = (value) => new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })

function Field({ label, error, children }) {
  return <div className="grid gap-2"><Label className="text-xs font-semibold text-slate-600">{label}</Label>{children}{error && <span className="text-xs text-red-700">{error}</span>}</div>
}

function TripDialog({ trip, onClose }) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState({})
  const mutation = useMutation({ mutationFn: (input) => saveFishingTrip({ ...input, id: trip?.id }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['fishing-trips'] }); onClose() } })
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = fishingTripInputSchema.safeParse({ code: form.get('code'), vesselName: form.get('vesselName') })
    if (!result.success) return setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
    setErrors({}); mutation.mutate(result.data)
  }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-[500px] p-6"><form className="grid gap-4" onSubmit={submit}>
    <DialogHeader><DialogTitle>{trip ? 'Edit fishing trip' : 'Add fishing trip'}</DialogTitle><DialogDescription className="sr-only">Fishing trip details</DialogDescription></DialogHeader>
    <Field label="Trip ID" error={errors.code}><Input name="code" defaultValue={trip?.code ?? ''} placeholder="FT-001" autoFocus required /></Field>
    <Field label="Vessel" error={errors.vesselName}><Input name="vesselName" defaultValue={trip?.vesselName ?? ''} required /></Field>
    {mutation.isError && <ErrorMessage error={mutation.error} />}
    <DialogFooter><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save trip'}</Button></DialogFooter>
  </form></DialogContent></Dialog>
}

function CompleteDialog({ trip, onClose }) {
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: () => completeFishingTrip(trip.id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['fishing-trips'] }); onClose() } })
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-[460px] p-6">
    <DialogHeader><DialogTitle>Complete {trip.code}?</DialogTitle><DialogDescription>Completion time will be recorded now.</DialogDescription></DialogHeader>
    {mutation.isError && <ErrorMessage error={mutation.error} />}
    <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => mutation.mutate()} disabled={mutation.isPending}><Check />{mutation.isPending ? 'Completing…' : 'Complete trip'}</Button></DialogFooter>
  </DialogContent></Dialog>
}

function TripCard({ trip, onEdit, onComplete }) {
  return <article className="flex min-h-64 flex-col rounded-xl border border-border bg-card p-5">
    <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Ship size={19} /></span><div className="min-w-0"><h2 className="truncate text-base font-bold">{trip.code}</h2><p className="mt-1 truncate text-xs text-muted-foreground">{trip.vesselName}</p></div></div><StatusBadge tone={trip.status === 'ACTIVE' ? 'healthy' : 'neutral'}>{trip.status === 'ACTIVE' ? 'Active' : 'Completed'}</StatusBadge></div>
    <dl className="mt-5 divide-y divide-border border-y border-border">
      <Fact icon={Clock3} label="Started" value={dateTime(trip.startedAt)} />
      <Fact icon={Check} label="Ended" value={trip.endedAt ? dateTime(trip.endedAt) : 'In progress'} />
      <Fact icon={Boxes} label="Batches" value={trip.batchCount.toLocaleString()} />
    </dl>
    <div className="mt-auto flex gap-2 pt-4"><Button className="flex-1" variant="outline" size="sm" onClick={onEdit}><Pencil />Edit</Button>{trip.status === 'ACTIVE' && <Button className="flex-1" size="sm" onClick={onComplete}><Check />Complete trip</Button>}</div>
  </article>
}

function Fact({ icon: Icon, label, value }) { return <div className="flex items-center gap-3 py-3 text-xs"><Icon className="shrink-0 text-muted-foreground" size={15} /><dt className="text-muted-foreground">{label}</dt><dd className="ml-auto text-right font-semibold text-foreground">{value}</dd></div> }
function ErrorMessage({ error }) { return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(error)}</p> }
function State({ children, error }) { return <div className={`flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-5 text-sm ${error ? 'border-red-200 bg-red-50/40 text-red-700' : 'border-slate-300 bg-white/50 text-muted-foreground'}`} role={error ? 'alert' : 'status'}><Anchor size={22} />{children}</div> }

export function FishingTripsPage() {
  const [editing, setEditing] = useState(undefined)
  const [completing, setCompleting] = useState(null)
  const query = useQuery({ queryKey: ['fishing-trips'], queryFn: listFishingTrips })
  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <header className="mb-6 flex items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-[-.04em] max-[780px]:sr-only">Fishing trips</h1><Button onClick={() => setEditing(null)}><Plus />Add trip</Button></header>
    {query.isPending && <State>Loading fishing trips…</State>}{query.isError && <State error>{apiError(query.error)}</State>}{query.isSuccess && !query.data.length && <State>No fishing trips</State>}
    {query.isSuccess && query.data.length > 0 && <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">{query.data.map((trip) => <TripCard key={trip.id} trip={trip} onEdit={() => setEditing(trip)} onComplete={() => setCompleting(trip)} />)}</div>}
    {editing !== undefined && <TripDialog trip={editing} onClose={() => setEditing(undefined)} />}{completing && <CompleteDialog trip={completing} onClose={() => setCompleting(null)} />}
  </div>
}
