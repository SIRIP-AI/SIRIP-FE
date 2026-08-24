import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Check, ExternalLink, MessageCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { overviewQueryOptions } from '@/features/overview/overview-api.js'
import { cn } from '@/lib/utils.js'
import { createTelegramLink, disconnectTelegram, getTelegramStatus, telegramError } from './telegram-api.js'

const qualityPresentation = {
  NORMAL: { label: 'Normal', tone: 'healthy' },
  WARNING: { label: 'Peringatan', tone: 'warning' },
  CRITICAL: { label: 'Kritis', tone: 'critical' },
  UNKNOWN: { label: 'Tidak diketahui', tone: 'neutral' },
}

const actions = {
  STORE: 'Simpan',
  LOAD: 'Muat',
  DISPATCH: 'Kirim',
  RETURN_TO_BASE: 'Kembali ke pangkalan',
  HANDOVER: 'Serahkan',
  INSPECT: 'Periksa',
  OTHER: 'Tangani',
}

const connectivityLabels = {
  ONLINE: 'Daring',
  SYNCING: 'Menyinkronkan',
  OFFLINE: 'Luring',
  ERROR: 'Bermasalah',
  NEVER_CONNECTED: 'Belum pernah terhubung',
  UNASSIGNED: 'Belum ditetapkan',
}

const sourceLabels = {
  SYSTEM: 'Sistem',
  WEB: 'Web',
  WHATSAPP: 'WhatsApp',
  TELEGRAM: 'Telegram',
}

function temperature(value) {
  return value === null ? 'Tidak diketahui' : `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}°C`
}

function qualityWindow(value) {
  return value === null ? 'Tidak diketahui' : `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })} hari`
}

function freshness(updatedAt) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000))
  return seconds < 60 ? `${seconds.toLocaleString('id-ID')} dtk lalu` : `${Math.floor(seconds / 60).toLocaleString('id-ID')} mnt lalu`
}

function snapshotStatus(updatedAt, refetchFailed) {
  const age = Date.now() - new Date(updatedAt).getTime()
  if (refetchFailed) return { label: 'Penyegaran gagal', dot: 'bg-amber-500 shadow-[0_0_0_4px_rgb(245_158_11_/_12%)]' }
  if (age < -30_000) return { label: 'Waktu tidak sinkron', dot: 'bg-amber-500 shadow-[0_0_0_4px_rgb(245_158_11_/_12%)]' }
  if (age > 90_000) return { label: 'Kedaluwarsa', dot: 'bg-amber-500 shadow-[0_0_0_4px_rgb(245_158_11_/_12%)]' }
  return { label: 'Langsung', dot: 'bg-green-600 shadow-[0_0_0_4px_rgb(22_163_74_/_12%)]' }
}

function stepAction(step) {
  if (step.actionType === 'RETURN_TO_BASE') return `Kembalikan ${step.resources[0] ?? 'kendaraan'} ke pangkalan${step.resources[1] ? ` dari ${step.resources[1]}` : ''}`
  if (step.actionType === 'DISPATCH') return `Kirim ${step.batchCode}${step.resources[0] ? ` melalui ${step.resources[0]}` : ''}${step.resources[1] ? ` ke ${step.resources[1]}` : ''}`
  return `${actions[step.actionType]} ${step.batchCode}${step.resources[0] ? ` ${step.actionType === 'LOAD' ? 'ke' : 'di'} ${step.resources[0]}` : ''}`
}

function TelegramCard() {
  const queryClient = useQueryClient()
  const status = useQuery({ queryKey: ['telegram', 'status'], queryFn: getTelegramStatus, refetchInterval: (query) => query.state.data?.connected ? false : 3000 })
  const connect = useMutation({
    mutationFn: createTelegramLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telegram', 'status'] }),
  })
  const disconnect = useMutation({ mutationFn: disconnectTelegram, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['telegram', 'status'] }) })
  const error = status.error ?? connect.error ?? disconnect.error
  function beginConnect() {
    const popup = window.open('about:blank', '_blank')
    connect.mutate(undefined, {
      onSuccess: ({ url }) => popup ? popup.location.assign(url) : window.location.assign(url),
      onError: () => popup?.close(),
    })
  }

  return <Appear as="section" className="mt-3 flex items-center gap-4 rounded-xl border border-blue-200 bg-blue-50 px-[18px] py-4 max-[640px]:items-start max-[640px]:flex-col" delay={0.18}>
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-white"><Send size={19} /></span>
    <div className="min-w-0 flex-1"><strong className="block text-sm">{status.data?.connected ? 'SIRIP terhubung ke Telegram' : 'Dapatkan peringatan SIRIP di Telegram'}</strong><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{status.data?.connected ? 'Buka bot untuk menanyakan peringatan terkini dan status sensor.' : 'Hubungkan sekali untuk menerima peringatan suhu dan mengobrol dengan SIRIP.'}</span>{error && <span className="mt-1 block text-xs text-red-700" role="alert">{telegramError(error)}</span>}</div>
    {status.data?.connected ? <div className="flex shrink-0 gap-2 max-[640px]:w-full"><Button className="max-[640px]:flex-1" asChild><a href={status.data.botUrl ?? '#'} target="_blank" rel="noreferrer"><MessageCircle />Buka bot</a></Button><Button variant="outline" type="button" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Putuskan</Button></div> : <Button className="shrink-0 max-[640px]:w-full" type="button" onClick={beginConnect} disabled={connect.isPending || status.isPending}>{connect.isPending ? 'Membuat tautan…' : <><ExternalLink />Hubungkan Telegram</>}</Button>}
  </Appear>
}

export function OverviewPage() {
  const overview = useQuery(overviewQueryOptions)

  if (overview.isPending) return <main className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6"><div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground">Memuat dasbor…</div></main>
  if (overview.isError) return <main className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6"><div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50/40 px-5 text-center" role="alert"><strong className="text-sm">Dasbor tidak tersedia</strong><span className="text-xs text-muted-foreground">Periksa koneksi API, lalu coba lagi.</span><Button className="mt-2" variant="outline" type="button" onClick={() => overview.refetch()}>Coba lagi</Button></div></main>

  const { activePlan, alerts, priorityBatches, summary, updatedAt } = overview.data
  const nextStepId = activePlan?.steps.find((step) => step.status === 'UPCOMING')?.id
  const snapshot = snapshotStatus(updatedAt, overview.isRefetchError)

  return (
    <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6" id="overview">
      <div className="mb-6 flex items-end justify-between gap-5 max-[780px]:mb-[18px]">
        <div><h1 className="text-3xl font-bold tracking-[-.04em] max-[780px]:sr-only">Ringkasan</h1><p className="mt-[7px] text-sm text-muted-foreground max-[780px]:mt-0">{new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p></div>
        <div className="flex shrink-0 items-center gap-[7px] text-xs text-muted-foreground max-[560px]:text-[11px]" role="status"><span className={cn('size-[7px] rounded-full', snapshot.dot)} aria-hidden="true" />{snapshot.label} · {freshness(updatedAt)}</div>
      </div>

      <Appear as="section" className="grid grid-cols-4 overflow-hidden rounded-xl border border-border bg-card max-[780px]:grid-cols-2" aria-label="Ringkasan operasi">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-5 max-[780px]:min-h-16 max-[780px]:px-4"><span className="text-xs text-muted-foreground">Batch aktif</span><strong className="text-2xl tracking-[-.035em]">{summary.activeBatchCount.toLocaleString('id-ID')}</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:px-4"><span className="text-xs text-muted-foreground">Berisiko</span><strong className="text-2xl tracking-[-.035em] text-amber-600">{summary.atRiskBatchCount.toLocaleString('id-ID')}</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:border-t max-[780px]:border-l-0 max-[780px]:px-4"><span className="text-xs text-muted-foreground">Peringatan aktif</span><strong className="text-2xl tracking-[-.035em] text-red-600">{summary.activeAlertCount.toLocaleString('id-ID')}</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:border-t max-[780px]:px-4"><span className="text-xs text-muted-foreground">Rencana aktif</span><strong className="text-2xl tracking-[-.035em]">{summary.activePlanVersion ? `V${summary.activePlanVersion}` : '—'}</strong></div>
      </Appear>

      <TelegramCard />

      <div className="mt-3 grid grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)] gap-3 max-[1020px]:grid-cols-1">
        <Appear as="section" className="rounded-xl border border-border bg-card p-5 max-[560px]:p-4" delay={0.08}>
          <div className="flex min-h-7 items-center justify-between gap-4"><h2 className="text-[17px] font-bold tracking-[-.025em]">Prioritas batch</h2><span className="text-xs text-muted-foreground">Batas mutu</span></div>
          {priorityBatches.length ? (
            <div className="-mx-5 -mb-5 mt-4 max-[560px]:-mx-4 max-[560px]:-mb-4 max-[560px]:mt-3.5" role="table" aria-label="Batch aktif berdasarkan prioritas">
              <div className="grid min-h-[34px] grid-cols-[1.1fr_.8fr_.9fr_auto] items-center gap-4 border-y border-border bg-background px-5 text-[11px] font-semibold text-slate-400 uppercase max-[560px]:hidden" role="row"><span>Batch</span><span>Suhu</span><span>Tersisa</span><span>Status</span></div>
              {priorityBatches.map((batch) => {
                const presentation = qualityPresentation[batch.qualityStatus]
                return (
                  <div className="grid min-h-[68px] grid-cols-[1.1fr_.8fr_.9fr_auto] items-center gap-4 border-b border-border px-5 last:border-b-0 max-[560px]:min-h-[84px] max-[560px]:grid-cols-[1fr_1fr_auto] max-[560px]:gap-x-3 max-[560px]:gap-y-2 max-[560px]:px-4 max-[560px]:py-3" role="row" key={batch.code}>
                    <div className="max-[560px]:col-start-1"><strong className="block text-sm">{batch.code}</strong><span className="mt-[3px] block text-xs text-muted-foreground">{batch.sensor ? `${batch.sensor.code} · ${connectivityLabels[batch.sensor.connectivityStatus]}` : 'Belum ada sensor'}</span></div>
                    <strong className="text-sm max-[560px]:col-start-2 max-[560px]:row-start-1">{temperature(batch.currentTemperatureC)}</strong>
                    <strong className={cn('text-sm max-[560px]:col-start-2 max-[560px]:row-start-2', ['warning', 'critical'].includes(presentation.tone) && 'text-amber-600')}>{qualityWindow(batch.remainingQualityWindowDays)}</strong>
                    <StatusBadge className="max-[560px]:col-start-3 max-[560px]:row-span-2 max-[560px]:row-start-1" tone={presentation.tone}>{presentation.label}</StatusBadge>
                  </div>
                )
              })}
            </div>
          ) : <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><strong className="text-sm text-foreground">Tidak ada batch aktif</strong><Button asChild><Link to="/fishing-trips">Mulai operasi di sini</Link></Button></div>}
        </Appear>

        <Appear as="section" className="rounded-xl border border-border bg-card p-5 max-[560px]:p-4" delay={0.14}>
          {activePlan ? (
            <>
              <div className="flex min-h-7 items-center justify-between gap-4"><h2 className="text-[17px] font-bold tracking-[-.025em]">Rencana aktif · V{activePlan.version}</h2><StatusBadge tone="healthy">Aktif</StatusBadge></div>
              <p className="mt-3.5 mb-[18px] text-xs leading-relaxed text-slate-600">{activePlan.summary}</p>
              <ol className="m-0 list-none p-0">
                {activePlan.steps.map((step, index) => {
                  const complete = step.status === 'COMPLETED'
                  const next = step.id === nextStepId
                  return <li className={cn('relative grid min-h-15 grid-cols-[22px_42px_1fr_auto] items-start gap-[9px]', index < activePlan.steps.length - 1 && 'before:absolute before:top-[22px] before:bottom-0 before:left-[10px] before:w-px before:bg-border before:content-["_"]')} key={step.id}>
                    <span className={cn('z-1 grid size-[21px] place-items-center rounded-full border-2 border-slate-300 bg-white', complete && 'border-green-600 bg-green-600 text-white', next && 'border-primary bg-primary shadow-[inset_0_0_0_4px_white]')}>{complete && <Check size={13} />}</span>
                    <time className="pt-[3px] text-xs font-semibold text-muted-foreground">{new Date(step.scheduledAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</time>
                    <strong className={cn('pt-0.5 text-xs leading-[1.4]', complete && 'text-muted-foreground')}>{stepAction(step)}</strong>
                     {next && <span className="mt-px text-[10px] font-bold text-primary uppercase">Berikutnya</span>}
                  </li>
                })}
              </ol>
              <Button className="mt-4 w-full" variant="outline" asChild><Link to="/plans">Lihat rencana lengkap</Link></Button>
            </>
          ) : <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><strong className="text-sm text-foreground">Tidak ada rencana aktif</strong><span className="text-xs">Rencana yang disetujui akan muncul di sini.</span></div>}
        </Appear>
      </div>

      {alerts.length ? alerts.map((alert, index) => (
        <Appear as="section" className="mt-3 grid grid-cols-[auto_1fr_auto_auto] items-center gap-3.5 rounded-xl border border-red-200 bg-card px-[18px] py-4 text-red-600 max-[780px]:grid-cols-[auto_1fr_auto] max-[560px]:grid-cols-[auto_1fr] max-[560px]:items-start" delay={0.2 + index * 0.03} key={alert.id}>
          <AlertTriangle className="self-center" size={20} aria-hidden="true" />
          <div className="text-foreground"><strong className="block text-sm">{alert.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{alert.description} · {sourceLabels[alert.source]} · ID {alert.id} · {new Date(alert.occurredAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span></div>
          <StatusBadge className="max-[560px]:col-start-2" tone={alert.severity === 'CRITICAL' ? 'critical' : 'warning'}>{alert.severity === 'CRITICAL' ? 'Kritis' : 'Peringatan'}</StatusBadge>
          <span />
        </Appear>
      )) : <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-[18px] py-4 text-muted-foreground max-[560px]:items-start max-[560px]:flex-col"><strong className="text-sm text-foreground">Tidak ada peringatan aktif</strong><span className="text-xs">Saat ini operasi tidak memerlukan penanganan pengecualian.</span></div>}

      <p className="mt-4 text-[11px] text-slate-400">Batas mutu merupakan perkiraan operasional, bukan sertifikasi keamanan pangan.</p>
    </div>
  )
}
