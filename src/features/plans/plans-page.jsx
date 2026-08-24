import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, CircleHelp, CircleX, Plus, Route, Ship } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { PageHeader } from '@/components/page-header.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import { listBatches } from '@/features/batches/batches-api.js'
import { resolvePlanLineage } from '@/features/plans/plan-lineage.js'
import { formatDuration } from '@/features/plans/plan-timing.js'
import { approvePlan, completePlanStep, createPlanProposal, createPlanRevision, dismissPlan, planQueryOptions, plansQueryOptions } from '@/features/plans/plans-api.js'
import { listResources } from '@/features/resources/resources-api.js'
import { sortPlanSteps } from '@/lib/ordering.js'
import { cn } from '@/lib/utils.js'

const actions = { STORE: 'Simpan', LOAD: 'Muat', DISPATCH: 'Kirim', RETURN_TO_BASE: 'Kembali ke pangkalan', HANDOVER: 'Serahkan', INSPECT: 'Periksa', OTHER: 'Tangani' }
const prepositions = { STORE: 'di', LOAD: 'ke', DISPATCH: 'ke', HANDOVER: 'di', INSPECT: 'di', OTHER: 'dengan' }
const triggerTypeLabels = {
  TEMPERATURE_EXCURSION: 'penyimpangan suhu',
  QUALITY_WINDOW: 'batas mutu',
  SENSOR_OFFLINE: 'sensor luring',
  TRUCK_DELAY: 'keterlambatan truk',
  STORAGE_CHANGE: 'perubahan penyimpanan',
  DESTINATION_CHANGE: 'perubahan tujuan',
  INSPECTION_HOLD: 'penahanan inspeksi',
  OTHER: 'lainnya',
}
const eligibleStatuses = new Set(['MONITORING', 'ACTIVE', 'INSPECTION_HOLD'])
const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

function formatDateTime(value) { return dateFormatter.format(new Date(value)) }
function localDateTime(value) { const date = new Date(value); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16) }
function describeStep(step) {
  const vehicle = step.resources.find((resource) => resource.type === 'VEHICLE')
  const destination = step.resources.find((resource) => resource.type === 'DESTINATION')
  if (step.actionType === 'RETURN_TO_BASE') return `Kembalikan ${vehicle?.name ?? 'kendaraan'} ke pangkalan${destination ? ` dari ${destination.name}` : ''}`
  if (step.actionType === 'HANDOVER') return `Serahkan ${step.batch?.code ?? 'batch'}${destination ? ` di ${destination.name}` : ''}`
  if (step.actionType === 'DISPATCH') return `Kirim ${step.batch?.code ?? 'batch'}${vehicle ? ` menggunakan ${vehicle.name}` : ''}${destination ? ` ke ${destination.name}` : ''}`
  const resource = step.resources[0]
  return `${actions[step.actionType]} ${step.batch?.code ?? 'batch'}${resource ? ` ${prepositions[step.actionType]} ${resource.name}` : ''}`
}
function formatSource(source) { return source === 'WHATSAPP' ? 'WhatsApp' : source[0] + source.slice(1).toLowerCase() }
function invalidatePlanQueries(queryClient) { return Promise.all(['plans', 'overview', 'batches'].map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] }))) }
function apiError(error) {
  if (error?.response?.data?.error) return error.response.data.error
  return error?.request && !error.response ? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' : 'Rencana tidak dapat diproses. Silakan coba lagi.'
}
function statusBadge(status) {
  if (status === 'ACTIVE') return <StatusBadge tone="healthy">Aktif</StatusBadge>
  if (status === 'PROPOSED') return <StatusBadge className="bg-sky-50 text-sky-700">Diusulkan</StatusBadge>
  if (status === 'COMPLETED') return <StatusBadge>Selesai</StatusBadge>
  if (status === 'DISMISSED') return <StatusBadge tone="critical">Ditolak</StatusBadge>
  return <StatusBadge>Digantikan</StatusBadge>
}

function ErrorMessage({ error }) { return <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{apiError(error)}</p> }
function QueryState({ query, label = 'rencana' }) {
  if (query.isPending) return <div className="flex min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground" role="status">Memuat {label}…</div>
  if (query.isError) return <div className="rounded-xl border border-red-200 bg-red-50/60 p-6 text-center" role="alert"><strong className="block text-sm text-red-800">{label[0].toUpperCase() + label.slice(1)} tidak tersedia</strong><Button className="mt-4" variant="outline" onClick={() => query.refetch()}>Coba lagi</Button></div>
  return null
}

function DelayWarning({ timing, full = false }) {
  if (timing.status !== 'DELAYED') return null
  const critical = timing.reasons.some((reason) => reason.severity === 'CRITICAL')
  const duration = formatDuration(timing.delayedBySeconds)
  const colors = critical ? 'border-red-200 bg-red-50 text-red-950' : 'border-amber-200 bg-amber-50 text-amber-950'
  const iconColor = critical ? 'text-red-600' : 'text-amber-600'

  if (!full) return <div className={cn('mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-semibold', colors)} role="status"><AlertTriangle className={cn('mt-0.5 shrink-0', iconColor)} size={15} aria-hidden="true" /><span>{critical ? 'Keterlambatan kritis' : 'Terlambat'} selama {duration}</span></div>

  return <section className={cn('rounded-xl border p-5', colors)} aria-label={`Peringatan keterlambatan ${critical ? 'kritis' : 'rencana'}`} role="alert">
    <div className="flex items-start gap-3"><AlertTriangle className={cn('mt-0.5 shrink-0', iconColor)} size={20} aria-hidden="true" /><div className="min-w-0"><h2 className="text-sm font-bold">{critical ? 'Keterlambatan rencana kritis' : 'Rencana terlambat'} selama {duration}</h2><p className="mt-1 text-xs leading-relaxed">Tinjau setiap batasan waktu sebelum melanjutkan rencana ini.</p></div></div>
    <ul className="mt-4 grid gap-2" aria-label="Alasan keterlambatan deterministik">{timing.reasons.map((reason, index) => <li className="rounded-lg bg-white/60 px-3 py-2 text-sm leading-relaxed" key={`${reason.code}-${index}`}><span className="font-bold">{reason.severity === 'CRITICAL' ? 'Kritis: ' : 'Peringatan: '}</span>{reason.message} <span className="whitespace-nowrap font-semibold">Keterlambatan: {formatDuration(reason.delaySeconds)}.</span></li>)}</ul>
  </section>
}

function PlanCard({ plan, plans }) {
  const steps = sortPlanSteps(plan.steps)
  const lineage = resolvePlanLineage(plan, plans)
  const completed = steps.filter((step) => step.status === 'COMPLETED').length
  const next = steps.find((step) => step.status === 'UPCOMING')
  return <Appear as="article" className={cn('rounded-xl border bg-card p-5', plan.status === 'PROPOSED' && 'border-sky-200 bg-sky-50/30')}>
    <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">Rencana V{plan.version}</h3>{statusBadge(plan.status)}</div><p className="mt-2 line-clamp-2 text-sm font-semibold leading-relaxed">{plan.summary}</p><p className="mt-1 text-xs text-muted-foreground">{plan.batches.map((batch) => batch.code).join(', ')}</p><p className="mt-1 text-xs text-muted-foreground">{plan.deadline ? `Batas waktu tiba · ${formatDateTime(plan.deadline)}` : 'Tanpa batas waktu tiba'}</p></div><Route className="shrink-0 text-primary" size={20} /></div>
    {plan.status === 'PROPOSED' && plan.trigger && <div className="mt-4 rounded-lg border border-sky-100 bg-white/70 px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wide text-sky-800">Pemicu · {formatSource(plan.trigger.source)}</span><p className="mt-1 line-clamp-2 text-xs text-slate-700">{plan.trigger.message}</p></div>}
    <DelayWarning timing={plan.timing} />
    {lineage && <p className="mt-4 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">Revisi dari <strong className="text-foreground">Rencana V{lineage.predecessor.version}</strong> · {lineage.retainedCompletedSteps} langkah selesai dipertahankan</p>}
    <div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">{next ? `Berikutnya · ${formatDateTime(next.scheduledAt)}` : 'Tidak ada langkah mendatang'}</span><strong>{completed}/{steps.length}</strong></div><div className="flex gap-1" aria-label={`${completed} dari ${steps.length} langkah selesai`}>{steps.map((step) => <span className={cn('h-1.5 flex-1 rounded-full', step.status === 'COMPLETED' ? 'bg-primary' : 'bg-slate-200')} key={step.id} />)}</div></div>
    <Button className="mt-5 w-full" variant="outline" asChild><Link to={`/plans/${plan.id}`}>{plan.status === 'PROPOSED' ? 'Tinjau usulan' : 'Lihat rencana'}</Link></Button>
  </Appear>
}

function CreatePlanDialog({ activePlans, onClose }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [selected, setSelected] = useState([])
  const [destinationIds, setDestinationIds] = useState([])
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
  function toggleDestination(id) { setDestinationIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }
  return <Dialog open onOpenChange={(open) => !open && onClose()}><DialogContent className="max-w-[560px] p-6"><DialogHeader><DialogTitle>Buat usulan rencana</DialogTitle><DialogDescription>Pilih batch aktif dan tujuan pengirimannya.</DialogDescription></DialogHeader>
    {destinations.isPending && <p className="text-sm text-muted-foreground" role="status">Memuat tujuan…</p>}
    {destinations.isError && <ErrorMessage error={destinations.error} />}
    {destinations.isSuccess && availableDestinations.length > 0 && <fieldset className="grid gap-2"><legend className="text-sm font-semibold">Tujuan tersedia</legend>{availableDestinations.map((destination) => <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3" key={destination.id}><input className="mt-1 size-4 accent-primary" type="checkbox" checked={destinationIds.includes(destination.id)} onChange={() => toggleDestination(destination.id)} /><span><strong className="block text-sm">{destination.name}</strong><span className="block text-xs text-muted-foreground">{destination.address} · {destination.travelMinutes} menit · menerima pukul {destination.receivingStart}–{destination.receivingEnd}</span></span></Label>)}</fieldset>}
    <div className="grid gap-2"><Label htmlFor="plan-deadline">Batas waktu tiba</Label><Input id="plan-deadline" type="datetime-local" min={localDateTime(openedAt)} value={deadline} onChange={(event) => setDeadline(event.target.value)} required /><p className="text-xs text-muted-foreground">Semua batch terpilih harus tiba di tujuan sebelum waktu ini.</p></div>
    {destinations.isSuccess && !availableDestinations.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada tujuan tersedia yang dikonfigurasi.</p>}
    {batches.isPending && <p className="py-8 text-center text-sm text-muted-foreground" role="status">Memuat batch yang memenuhi syarat…</p>}
    {batches.isError && <ErrorMessage error={batches.error} />}
    {batches.isSuccess && !eligible.length && <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">Tidak ada batch aktif yang memenuhi syarat.</p>}
    {eligible.length > 0 && <fieldset className="grid max-h-80 gap-2 overflow-y-auto"><legend className="sr-only">Batch yang memenuhi syarat</legend>{eligible.map((batch) => <Label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-slate-50" key={batch.id}><input className="mt-1 size-4 accent-primary" type="checkbox" checked={selected.includes(batch.id)} onChange={() => toggle(batch.id)} /><span><strong className="block text-sm">{batch.code}</strong><span className="text-xs text-muted-foreground">{batch.weightKg.toLocaleString()} kg · Mutu {batch.grade} · {batch.location.name}</span></span></Label>)}</fieldset>}
    {mutation.isError && <ErrorMessage error={mutation.error} />}
    {mutation.data?.status === 'NO_VALID_PROPOSAL_FOUND' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status"><strong className="block">Tidak ditemukan usulan yang valid</strong>{mutation.data.reason}</p>}
    <DialogFooter><Button variant="outline" onClick={onClose}>Batal</Button><Button disabled={!selected.length || !destinationIds.length || !validDeadline || mutation.isPending} onClick={() => mutation.mutate({ batchIds: selected, destinationIds, deadline: new Date(deadline).toISOString() })}>{mutation.isPending ? 'Membuat…' : `Buat usulan${selected.length ? ` (${selected.length})` : ''}`}</Button></DialogFooter>
  </DialogContent></Dialog>
}

export function PlansPage() {
  const [creating, setCreating] = useState(false)
  const plans = useQuery(plansQueryOptions)
  const data = plans.data
  return <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
    <PageHeader title="Rencana" description="Buat rencana operasi per batch, tinjau usulan, dan pantau pekerjaan aktif." action={<Button onClick={() => setCreating(true)}><Plus />Buat rencana</Button>} />
    <QueryState query={plans} />
    {data && <div className="grid gap-8"><p className="text-right text-xs text-muted-foreground">Diperbarui {formatDateTime(data.updatedAt)}</p>
      {!data.activePlans.length && !data.proposedPlans.length && !data.history.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center"><Route className="mx-auto text-muted-foreground" size={24} /><h2 className="mt-3 font-bold">Belum ada rencana</h2><p className="mt-2 text-sm text-muted-foreground">Buat usulan untuk satu atau beberapa batch aktif.</p><Button className="mt-5" onClick={() => setCreating(true)}><Plus />Buat rencana</Button></div>}
      {(data.activePlans.length > 0 || data.proposedPlans.length > 0 || data.history.length > 0) && <>
        <PlanSection title="Rencana aktif" description="Rencana yang disetujui dan sedang memandu batch terkait." count={`${data.activePlans.length} aktif`} plans={data.activePlans} allPlans={data} empty="Tidak ada rencana aktif" />
        <PlanSection title="Usulan rencana" description="Tinjau, setujui, atau tolak usulan sebelum digunakan untuk operasi." count={`${data.proposedPlans.length} menunggu tinjauan`} plans={data.proposedPlans} allPlans={data} empty="Tidak ada usulan rencana" />
        <PlanSection title="Riwayat rencana" description="Rencana selesai, digantikan, dan ditolak tetap tersedia sebagai referensi." count={`${data.history.length} tersimpan`} plans={data.history} allPlans={data} empty="Belum ada riwayat rencana" />
      </>}
    </div>}
    {creating && <CreatePlanDialog activePlans={data?.activePlans ?? []} onClose={() => setCreating(false)} />}
  </div>
}

function PlanSection({ title, description, count, plans, allPlans, empty }) {
  return <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-sm font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p></div><span className="text-xs text-muted-foreground">{count}</span></div>{plans.length ? <div className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} plans={allPlans} />)}</div> : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground"><Ship className="mr-2" size={17} />{empty}</div>}</section>
}

function ReasonContent({ step }) {
  return <div className="grid gap-4"><div><p className="text-xs font-bold text-foreground">Alasan tindakan ini</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.rationale ?? 'Tidak ada penjelasan tindakan yang tersimpan untuk langkah historis ini.'}</p></div><div><p className="text-xs font-bold text-foreground">Alasan waktu ini</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.timingRationale ?? 'Tidak ada penjelasan waktu yang tersimpan untuk langkah historis ini.'}</p></div>{step.latestSafeAt && <div className="rounded-lg bg-muted px-3 py-2"><p className="text-xs font-bold text-foreground">Batas waktu aman terakhir</p><p className="mt-1 text-sm text-muted-foreground">{formatDateTime(step.latestSafeAt)}</p></div>}</div>
}

function StepReason({ step }) {
  return <><span className="max-[640px]:hidden"><Popover><PopoverTrigger asChild><Button size="sm" variant="outline"><CircleHelp />Mengapa?</Button></PopoverTrigger><PopoverContent aria-label={`Alasan langkah ${step.sequence}`}><ReasonContent step={step} /></PopoverContent></Popover></span><span className="hidden max-[640px]:inline-flex"><Dialog><DialogTrigger asChild><Button size="sm" variant="outline"><CircleHelp />Mengapa?</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Mengapa langkah ini?</DialogTitle><DialogDescription>{describeStep(step)}</DialogDescription></DialogHeader><ReasonContent step={step} /></DialogContent></Dialog></span></>
}

function PlanSteps({ plan, completion }) {
  const steps = sortPlanSteps(plan.steps)
  if (!steps.length) return <p className="p-5 text-center text-sm text-muted-foreground">Tidak ada langkah yang tersimpan untuk rencana ini.</p>
  return <ol className="divide-y divide-border">{steps.map((step, index) => {
    const completed = step.status === 'COMPLETED'; const canceled = step.status === 'CANCELED'; const marking = completion?.isPending && completion.variables?.stepId === step.id
    const completionLabel = step.actionType === 'RETURN_TO_BASE' ? 'Tandai truk telah kembali' : 'Tandai selesai'; const hasReason = step.rationale || step.timingRationale || step.latestSafeAt
    return <li className={cn('grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 p-5 max-[640px]:grid-cols-[40px_minmax(0,1fr)]', (completed || canceled) && 'bg-slate-50 text-slate-500')} key={step.id}><span className={cn('grid size-8 place-items-center rounded-full border text-xs font-bold', completed ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white')}>{completed ? <Check size={15} /> : canceled ? <CircleX size={15} /> : index + 1}</span><div><strong className={cn('block text-sm', canceled && 'line-through')}>{describeStep(step)}</strong><span className="mt-1 block text-xs">{completed ? `Selesai ${formatDateTime(step.completedAt)}` : canceled ? 'Dibatalkan' : `${step.actionType === 'RETURN_TO_BASE' ? 'Diperkirakan' : 'Dijadwalkan'} ${formatDateTime(step.scheduledAt)}`}</span>{step.latestSafeAt && <span className="mt-1 block text-xs font-medium text-amber-800">Skenario terburuk · Selesaikan sebelum {formatDateTime(step.latestSafeAt)}</span>}</div><div className="flex flex-wrap justify-end gap-2 max-[640px]:col-start-2 max-[640px]:justify-start">{hasReason && <StepReason step={step} />}{completion && step.status === 'UPCOMING' && <Button size="sm" variant="outline" disabled={completion.isPending} onClick={() => completion.mutate({ planId: plan.id, stepId: step.id })}><CheckCircle2 />{marking ? 'Menandai…' : completionLabel}</Button>}</div></li>
  })}</ol>
}

function ReviewActions({ plan }) {
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: (action) => action === 'approve' ? approvePlan(plan.id) : dismissPlan(plan.id), onSuccess: async () => { await invalidatePlanQueries(queryClient); navigate('/plans') } })
  return <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-5"><h2 className="text-sm font-bold text-sky-950">Tinjau usulan</h2><p className="mt-1 text-xs text-sky-900">Persetujuan mengaktifkan rencana ini untuk batch terkait. Penolakan menyimpannya dalam riwayat.</p>{mutation.isError && <div className="mt-3"><ErrorMessage error={mutation.error} /></div>}<div className="mt-4 flex gap-2"><Button disabled={mutation.isPending} onClick={() => mutation.mutate('approve')}>Setujui usulan</Button><Button variant="destructive-outline" disabled={mutation.isPending} onClick={() => mutation.mutate('dismiss')}>Tolak</Button></div></section>
}

function RevisionForm({ plan }) {
  const queryClient = useQueryClient(); const navigate = useNavigate(); const [instruction, setInstruction] = useState('')
  const mutation = useMutation({ mutationFn: () => createPlanRevision(plan.id, instruction), onSuccess: async (result) => { if (result.status === 'NO_VALID_PROPOSAL_FOUND') return; await invalidatePlanQueries(queryClient); navigate(`/plans/${result.proposal.id}`) } })
  const description = plan.status === 'ACTIVE'
    ? 'Jelaskan perubahan pada langkah mendatang. Langkah yang selesai tetap terkunci dan rencana aktif tidak berubah hingga revisi disetujui.'
    : 'Jelaskan perubahan pada usulan ini. Usulan pengganti akan dibuat untuk batch yang sama.'
  return <section className="rounded-xl border border-border bg-card p-5"><h2 className="text-sm font-bold">Usulkan perubahan</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p><Label className="sr-only" htmlFor="revision-instruction">Instruksi revisi</Label><Textarea id="revision-instruction" className="mt-4 min-h-28" value={instruction} maxLength={2000} placeholder="Contoh: Kirim batch B-017 besok pagi sebagai gantinya." onChange={(event) => setInstruction(event.target.value)} />{mutation.isError && <div className="mt-3"><ErrorMessage error={mutation.error} /></div>}{mutation.data?.status === 'NO_VALID_PROPOSAL_FOUND' && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status"><strong className="block">Tidak ditemukan usulan revisi yang valid</strong>{mutation.data.reason}</p>}<Button className="mt-3" disabled={!instruction.trim() || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Membuat revisi…' : 'Buat usulan revisi'}</Button></section>
}

export function PlanDetailsPage() {
  const { planId } = useParams(); const navigate = useNavigate(); const queryClient = useQueryClient(); const planQuery = useQuery(planQueryOptions(planId)); const plansQuery = useQuery(plansQueryOptions); const plan = planQuery.data
  const completion = useMutation({ mutationFn: ({ planId: id, stepId }) => completePlanStep(id, stepId), onSuccess: async () => { await Promise.all([invalidatePlanQueries(queryClient), queryClient.invalidateQueries({ queryKey: ['resources'] })]) } })
  const completed = plan?.steps.filter((step) => step.status === 'COMPLETED') ?? []; const future = plan?.steps.filter((step) => step.status !== 'COMPLETED') ?? []; const lineage = plan ? resolvePlanLineage(plan, plansQuery.data) : null
  return <div className="mx-auto w-full max-w-[980px] px-8 pt-10 pb-8 max-[780px]:px-4 max-[780px]:py-6"><Button className="mb-5" variant="ghost" onClick={() => navigate('/plans')}><ArrowLeft />Semua rencana</Button><QueryState query={planQuery} label="rencana" />
    {plan && <div className="grid gap-5"><header className="rounded-xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold tracking-[-.035em]">Rencana V{plan.version}</h1>{statusBadge(plan.status)}</div><p className="mt-2 max-w-2xl font-semibold leading-relaxed">{plan.summary}</p><p className="mt-2 text-xs text-muted-foreground">Dibuat {formatDateTime(plan.createdAt)}</p><p className="mt-1 text-xs font-semibold text-slate-700">{plan.deadline ? `Batas waktu tiba · ${formatDateTime(plan.deadline)}` : 'Tanpa batas waktu tiba'}</p><p className="mt-1 text-xs text-muted-foreground">Pilihan tujuan · {plan.destinationIds.length || (plan.destinationId ? 1 : 0)} dipilih</p></div><div className="text-right"><strong className="text-2xl">{completed.length}/{plan.steps.length}</strong><p className="text-xs text-muted-foreground">langkah selesai</p></div></div><div className="mt-5 flex flex-wrap gap-2" aria-label="Batch terkait">{plan.batches.map((batch) => <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold" key={batch.id}>{batch.code}</span>)}</div></header>
      <DelayWarning timing={plan.timing} full />
      {plan.status === 'PROPOSED' && plan.trigger && <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-sky-800">Pemicu usulan</p><p className="mt-2 text-sm font-semibold text-sky-950">{plan.trigger.message}</p><p className="mt-2 text-xs text-sky-900">{formatSource(plan.trigger.source)} · {triggerTypeLabels[plan.trigger.type]} · {formatDateTime(plan.trigger.occurredAt)}</p></section>}
      {lineage && <section className="rounded-xl border border-border bg-card p-5"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Riwayat versi rencana</p><div className="mt-2 flex flex-wrap items-baseline justify-between gap-2"><Link className="font-bold text-primary underline-offset-4 hover:underline" to={`/plans/${lineage.predecessor.id}`}>Rencana sebelumnya · V{lineage.predecessor.version}</Link><span className="text-xs text-muted-foreground">{lineage.predecessor.approvedAt ? `Disetujui ${formatDateTime(lineage.predecessor.approvedAt)}` : 'Belum disetujui'}</span></div><p className="mt-2 text-sm">{lineage.retainedCompletedSteps} langkah selesai dipertahankan dalam versi ini.</p>{lineage.predecessor.trigger && <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2"><span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pemicu sebelumnya · {formatSource(lineage.predecessor.trigger.source)}</span><p className="mt-1 text-xs text-foreground">{lineage.predecessor.trigger.message}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(lineage.predecessor.trigger.occurredAt)}</p></div>}</section>}
      {plan.status === 'PROPOSED' && <ReviewActions plan={plan} />}
      {plan.status === 'COMPLETED' && <p className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary" role="status">Selesai {formatDateTime(plan.completedAt)}. Batch terkait tersedia untuk rencana baru.</p>}
      <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="border-b border-border p-5"><h2 className="text-sm font-bold">Langkah selesai</h2><p className="mt-1 text-xs text-muted-foreground">Fakta historis dipertahankan dalam setiap revisi.</p></header><PlanSteps plan={{ ...plan, steps: completed }} /></section>
      <section className="overflow-hidden rounded-xl border border-border bg-card"><header className="border-b border-border p-5"><h2 className="text-sm font-bold">Langkah mendatang</h2><p className="mt-1 text-xs text-muted-foreground">Pekerjaan mendatang dan yang dibatalkan untuk batch terkait.</p></header><PlanSteps plan={{ ...plan, steps: future }} completion={plan.status === 'ACTIVE' ? completion : undefined} />{completion.isError && <div className="m-5"><ErrorMessage error={completion.error} /></div>}</section>
      {(plan.status === 'ACTIVE' || plan.status === 'PROPOSED') && <RevisionForm plan={plan} />}
    </div>}
  </div>
}
