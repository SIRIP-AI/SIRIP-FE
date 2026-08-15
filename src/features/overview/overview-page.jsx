import { AlertTriangle, Check, MessageCircle } from 'lucide-react'

import { Appear } from '@/components/appear.jsx'
import { StatusBadge } from '@/components/status-badge.jsx'
import { Button } from '@/components/ui/button.jsx'
import { cn } from '@/lib/utils.js'

const batches = [
  { id: 'B-017', temp: '8.0°C', window: '4.2 days', sensor: 'S-003', status: 'Warning', tone: 'warning' },
  { id: 'B-021', temp: '2.8°C', window: '7.6 days', sensor: 'S-005', status: 'Normal', tone: 'healthy' },
  { id: 'B-024', temp: '1.9°C', window: '9.1 days', sensor: 'S-008', status: 'Normal', tone: 'healthy' },
]

const steps = [
  { time: '09:00', action: 'Store B-017 in Cold Room 1', complete: true },
  { time: '10:30', action: 'Load B-017 into TR-01', next: true },
  { time: '11:00', action: 'Dispatch B-017 to Processor B' },
]

export function OverviewPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6" id="overview">
      <div className="mb-6 flex items-end justify-between max-[780px]:mb-[18px]">
        <div><h1 className="text-3xl font-bold leading-[1.1] tracking-[-.04em] max-[780px]:sr-only">Overview</h1><p className="mt-[7px] text-sm text-muted-foreground max-[780px]:mt-0">Tanjung Perak · Friday, 14 August</p></div>
        <div className="flex items-center gap-[7px] text-xs text-muted-foreground max-[560px]:text-[11px]"><span className="size-[7px] rounded-full bg-green-600 shadow-[0_0_0_4px_rgb(22_163_74_/_12%)]" />Live · 14 sec ago</div>
      </div>

      <Appear as="section" className="grid grid-cols-4 overflow-hidden rounded-xl border border-border bg-card max-[780px]:grid-cols-2" aria-label="Operation summary">
        <div className="flex min-h-[76px] items-center justify-between gap-3 px-5 max-[780px]:min-h-16 max-[780px]:px-4"><span className="text-xs text-muted-foreground">Active batches</span><strong className="text-2xl tracking-[-.035em]">8</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:px-4"><span className="text-xs text-muted-foreground">At risk</span><strong className="text-2xl tracking-[-.035em] text-amber-600">2</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:border-l-0 max-[780px]:border-t max-[780px]:px-4"><span className="text-xs text-muted-foreground">Active alerts</span><strong className="text-2xl tracking-[-.035em] text-red-600">1</strong></div>
        <div className="flex min-h-[76px] items-center justify-between gap-3 border-l border-border px-5 max-[780px]:min-h-16 max-[780px]:border-t max-[780px]:px-4"><span className="text-xs text-muted-foreground">Active plan</span><strong className="text-2xl tracking-[-.035em]">V3</strong></div>
      </Appear>

      <div className="mt-3 grid grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)] gap-3 max-[1020px]:grid-cols-1">
        <Appear as="section" className="rounded-xl border border-border bg-card p-5 max-[560px]:p-4" delay={0.08}>
          <div className="flex min-h-7 items-center justify-between gap-4"><h2 className="text-[17px] font-bold tracking-[-.025em]">Batch priority</h2><span className="text-xs text-muted-foreground">Quality window</span></div>
          <div className="-mx-5 -mb-5 mt-4 max-[560px]:-mx-4 max-[560px]:-mb-4 max-[560px]:mt-3.5" role="table" aria-label="Active batches by priority">
            <div className="grid min-h-[34px] grid-cols-[1.1fr_.8fr_.9fr_auto] items-center gap-4 border-y border-border bg-background px-5 text-[11px] font-semibold text-slate-400 uppercase max-[560px]:hidden" role="row"><span>Batch</span><span>Temperature</span><span>Remaining</span><span>Status</span></div>
            {batches.map((batch) => (
              <div className="grid min-h-[68px] grid-cols-[1.1fr_.8fr_.9fr_auto] items-center gap-4 border-b border-border px-5 last:border-b-0 max-[560px]:min-h-[84px] max-[560px]:grid-cols-[1fr_1fr_auto] max-[560px]:gap-x-3 max-[560px]:gap-y-2 max-[560px]:px-4 max-[560px]:py-3" role="row" key={batch.id}>
                <div className="max-[560px]:col-start-1"><strong className="block text-sm">{batch.id}</strong><span className="mt-[3px] block text-xs text-muted-foreground">{batch.sensor} · Online</span></div>
                <strong className="text-sm max-[560px]:col-start-2 max-[560px]:row-start-1">{batch.temp}</strong>
                <strong className={cn('text-sm max-[560px]:col-start-2 max-[560px]:row-start-2', batch.tone === 'warning' && 'text-amber-600')}>{batch.window}</strong>
                <StatusBadge className="max-[560px]:col-start-3 max-[560px]:row-span-2 max-[560px]:row-start-1" tone={batch.tone}>{batch.status}</StatusBadge>
              </div>
            ))}
          </div>
        </Appear>

        <Appear as="section" className="rounded-xl border border-border bg-card p-5 max-[560px]:p-4" delay={0.14}>
          <div className="flex min-h-7 items-center justify-between gap-4"><h2 className="text-[17px] font-bold tracking-[-.025em]">Active plan · V3</h2><StatusBadge tone="healthy">Active</StatusBadge></div>
          <p className="mt-3.5 mb-[18px] text-xs leading-normal text-slate-600"><strong className="text-foreground">B-017 first:</strong> reduced quality margin after a temperature excursion.</p>
          <ol className="m-0 list-none p-0">
            {steps.map((step, index) => (
              <li className={cn('relative grid min-h-15 grid-cols-[22px_42px_1fr_auto] items-start gap-[9px]', index < steps.length - 1 && 'before:absolute before:top-[22px] before:bottom-0 before:left-[10px] before:w-px before:bg-border before:content-[" "]')} key={step.time}>
                <span className={cn('z-1 grid size-[21px] place-items-center rounded-full border-2 border-slate-300 bg-white', step.complete && 'border-green-600 bg-green-600 text-white', step.next && 'border-primary bg-primary shadow-[inset_0_0_0_4px_white]')}>{step.complete && <Check size={13} />}</span>
                <time className="pt-[3px] text-xs font-semibold text-muted-foreground">{step.time}</time>
                <strong className={cn('pt-0.5 text-xs leading-[1.4]', step.complete && 'text-muted-foreground')}>{step.action}</strong>
                {step.next && <span className="mt-px text-[10px] font-bold text-primary uppercase">Next</span>}
              </li>
            ))}
          </ol>
        </Appear>
      </div>

      <Appear as="section" className="mt-3 grid grid-cols-[auto_1fr_auto_auto] items-center gap-3.5 rounded-xl border border-red-200 bg-card px-[18px] py-4 text-red-600 max-[780px]:grid-cols-[auto_1fr_auto] max-[560px]:grid-cols-[auto_1fr] max-[560px]:items-start" delay={0.2}>
        <AlertTriangle className="self-center" size={20} aria-hidden="true" />
        <div className="text-foreground"><strong className="block text-sm">B-017 temperature excursion</strong><span className="mt-1 block text-xs text-muted-foreground">8.0°C for 42 min · 4.2 days remaining · 10:08</span></div>
        <StatusBadge className="max-[560px]:col-start-2" tone="critical">Critical</StatusBadge>
        <Button className="max-[780px]:col-span-full max-[780px]:w-full" asChild><a href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle size={17} />Open WhatsApp</a></Button>
      </Appear>

      <p className="mt-4 text-[11px] text-slate-400">Quality windows are operational estimates, not food-safety certification.</p>
    </div>
  )
}
