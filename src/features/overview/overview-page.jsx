import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Appear } from '@/components/appear.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { overviewQueryOptions } from '@/features/overview/overview-api.js'
import { cn } from '@/lib/utils.js'

const qualityPresentation = {
  NORMAL: { label: 'Normal', tone: 'healthy' },
  WARNING: { label: 'Warning', tone: 'warning' },
  CRITICAL: { label: 'Critical', tone: 'critical' },
  UNKNOWN: { label: 'Unknown', tone: 'neutral' },
}

const actions = {
  STORE: 'Store',
  LOAD: 'Load',
  DISPATCH: 'Dispatch',
  HANDOVER: 'Hand over',
  INSPECT: 'Inspect',
  OTHER: 'Handle',
}

function temperature(value) {
  return value === null ? 'Unknown' : `${value.toFixed(1)}°C`
}

function qualityWindow(value) {
  return value === null ? 'Unknown' : `${value.toFixed(1)} days`
}

function freshness(updatedAt) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000))
  return seconds < 60 ? `${seconds} sec ago` : `${Math.floor(seconds / 60)} min ago`
}

function stepAction(step) {
  return `${actions[step.actionType]} ${step.batchCode}${step.resource ? ` ${step.actionType === 'DISPATCH' ? 'to' : step.actionType === 'LOAD' ? 'into' : 'in'} ${step.resource}` : ''}`
}

export function OverviewPage() {
  const overview = useQuery(overviewQueryOptions)

  if (overview.isPending) return <main className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6"><div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground">Loading dashboard…</div></main>
  if (overview.isError) return <main className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6"><div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50/40 px-5 text-center" role="alert"><strong className="text-sm">Dashboard unavailable</strong><span className="text-xs text-muted-foreground">Check the API connection and try again.</span><Button className="mt-2" variant="outline" type="button" onClick={() => overview.refetch()}>Try again</Button></div></main>

  const { activePlan, alerts, priorityBatches, summary, updatedAt } = overview.data
  const nextStepId = activePlan?.steps.find((step) => step.status === 'UPCOMING')?.id

  return (
    <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6" id="overview">
      <div className="mb-6 flex items-end justify-between gap-5 max-[780px]:mb-[18px]">
        <div><h1 className="text-3xl font-bold tracking-[-.04em] max-[780px]:sr-only">Overview</h1><p className="mt-[7px] text-sm text-muted-foreground max-[780px]:mt-0">{new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p></div>
        <div className="flex shrink-0 items-center gap-[7px] text-xs text-muted-foreground max-[560px]:text-[11px]"><span className="size-[7px] rounded-full bg-green-600 shadow-[0_0_0_4px_rgb(22_163_74_/_12%)]" />Live · {freshness(updatedAt)}</div>
      </div>

      <Appear as="section" className="grid grid-cols-4 overflow-hidden rounded-xl border border-border bg-card max-[780px]:grid-cols-2" aria-label="Operation summary">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-5 max-[780px]:min-h-16 max-[780px]:px-4"><span className="text-xs text-muted-foreground">Active batches</span><strong className="text-2xl tracking-[-.035em]">{summary.activeBatchCount}</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:px-4"><span className="text-xs text-muted-foreground">At risk</span><strong className="text-2xl tracking-[-.035em] text-amber-600">{summary.atRiskBatchCount}</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:border-t max-[780px]:border-l-0 max-[780px]:px-4"><span className="text-xs text-muted-foreground">Active alerts</span><strong className="text-2xl tracking-[-.035em] text-red-600">{summary.activeAlertCount}</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:border-t max-[780px]:px-4"><span className="text-xs text-muted-foreground">Active plan</span><strong className="text-2xl tracking-[-.035em]">{summary.activePlanVersion ? `V${summary.activePlanVersion}` : '—'}</strong></div>
      </Appear>

      <div className="mt-3 grid grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)] gap-3 max-[1020px]:grid-cols-1">
        <Appear as="section" className="rounded-xl border border-border bg-card p-5 max-[560px]:p-4" delay={0.08}>
          <div className="flex min-h-7 items-center justify-between gap-4"><h2 className="text-[17px] font-bold tracking-[-.025em]">Batch priority</h2><span className="text-xs text-muted-foreground">Quality window</span></div>
          {priorityBatches.length ? (
            <div className="-mx-5 -mb-5 mt-4 max-[560px]:-mx-4 max-[560px]:-mb-4 max-[560px]:mt-3.5" role="table" aria-label="Active batches by priority">
              <div className="grid min-h-[34px] grid-cols-[1.1fr_.8fr_.9fr_auto] items-center gap-4 border-y border-border bg-background px-5 text-[11px] font-semibold text-slate-400 uppercase max-[560px]:hidden" role="row"><span>Batch</span><span>Temperature</span><span>Remaining</span><span>Status</span></div>
              {priorityBatches.map((batch) => {
                const presentation = qualityPresentation[batch.qualityStatus]
                return (
                  <div className="grid min-h-[68px] grid-cols-[1.1fr_.8fr_.9fr_auto] items-center gap-4 border-b border-border px-5 last:border-b-0 max-[560px]:min-h-[84px] max-[560px]:grid-cols-[1fr_1fr_auto] max-[560px]:gap-x-3 max-[560px]:gap-y-2 max-[560px]:px-4 max-[560px]:py-3" role="row" key={batch.code}>
                    <div className="max-[560px]:col-start-1"><strong className="block text-sm">{batch.code}</strong><span className="mt-[3px] block text-xs text-muted-foreground">{batch.sensor ? `${batch.sensor.code} · ${batch.sensor.connectivityStatus.replaceAll('_', ' ').toLowerCase()}` : 'No sensor assigned'}</span></div>
                    <strong className="text-sm max-[560px]:col-start-2 max-[560px]:row-start-1">{temperature(batch.currentTemperatureC)}</strong>
                    <strong className={cn('text-sm max-[560px]:col-start-2 max-[560px]:row-start-2', ['warning', 'critical'].includes(presentation.tone) && 'text-amber-600')}>{qualityWindow(batch.remainingQualityWindowDays)}</strong>
                    <StatusBadge className="max-[560px]:col-start-3 max-[560px]:row-span-2 max-[560px]:row-start-1" tone={presentation.tone}>{presentation.label}</StatusBadge>
                  </div>
                )
              })}
            </div>
          ) : <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-muted-foreground"><strong className="text-sm text-foreground">No active batches</strong><Button asChild><Link to="/fishing-trips">Start an operation here</Link></Button></div>}
        </Appear>

        <Appear as="section" className="rounded-xl border border-border bg-card p-5 max-[560px]:p-4" delay={0.14}>
          {activePlan ? (
            <>
              <div className="flex min-h-7 items-center justify-between gap-4"><h2 className="text-[17px] font-bold tracking-[-.025em]">Active plan · V{activePlan.version}</h2><StatusBadge tone="healthy">Active</StatusBadge></div>
              <p className="mt-3.5 mb-[18px] text-xs leading-relaxed text-slate-600">{activePlan.reason}</p>
              <ol className="m-0 list-none p-0">
                {activePlan.steps.map((step, index) => {
                  const complete = step.status === 'COMPLETED'
                  const next = step.id === nextStepId
                  return <li className={cn('relative grid min-h-15 grid-cols-[22px_42px_1fr_auto] items-start gap-[9px]', index < activePlan.steps.length - 1 && 'before:absolute before:top-[22px] before:bottom-0 before:left-[10px] before:w-px before:bg-border before:content-["_"]')} key={step.id}>
                    <span className={cn('z-1 grid size-[21px] place-items-center rounded-full border-2 border-slate-300 bg-white', complete && 'border-green-600 bg-green-600 text-white', next && 'border-primary bg-primary shadow-[inset_0_0_0_4px_white]')}>{complete && <Check size={13} />}</span>
                    <time className="pt-[3px] text-xs font-semibold text-muted-foreground">{new Date(step.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                    <strong className={cn('pt-0.5 text-xs leading-[1.4]', complete && 'text-muted-foreground')}>{stepAction(step)}</strong>
                    {next && <span className="mt-px text-[10px] font-bold text-primary uppercase">Next</span>}
                  </li>
                })}
              </ol>
            </>
          ) : <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground"><strong className="text-sm text-foreground">No active plan</strong><span className="text-xs">Approved plans will appear here.</span></div>}
        </Appear>
      </div>

      {alerts.length ? alerts.map((alert, index) => (
        <Appear as="section" className="mt-3 grid grid-cols-[auto_1fr_auto_auto] items-center gap-3.5 rounded-xl border border-red-200 bg-card px-[18px] py-4 text-red-600 max-[780px]:grid-cols-[auto_1fr_auto] max-[560px]:grid-cols-[auto_1fr] max-[560px]:items-start" delay={0.2 + index * 0.03} key={alert.id}>
          <AlertTriangle className="self-center" size={20} aria-hidden="true" />
          <div className="text-foreground"><strong className="block text-sm">{alert.title}</strong><span className="mt-1 block text-xs text-muted-foreground">{alert.description} · {new Date(alert.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          <StatusBadge className="max-[560px]:col-start-2" tone={alert.severity === 'CRITICAL' ? 'critical' : 'warning'}>{alert.severity === 'CRITICAL' ? 'Critical' : 'Warning'}</StatusBadge>
          <Button className="max-[780px]:col-span-full max-[780px]:w-full" asChild><a href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={17} />Open WhatsApp</a></Button>
        </Appear>
      )) : <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-[18px] py-4 text-muted-foreground max-[560px]:items-start max-[560px]:flex-col"><strong className="text-sm text-foreground">No active alerts</strong><span className="text-xs">Operations currently require no exception response.</span></div>}

      <p className="mt-4 text-[11px] text-slate-400">Quality windows are operational estimates, not food-safety certification.</p>
    </div>
  )
}
