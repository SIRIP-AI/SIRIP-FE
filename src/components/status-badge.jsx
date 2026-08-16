import { Badge } from '@/components/ui/badge.jsx'
import { cn } from '@/lib/utils.js'

const toneClasses = {
  healthy: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
  neutral: 'bg-slate-100 text-slate-600',
}

export function StatusBadge({ tone = 'neutral', children, className }) {
  return (
    <Badge className={cn('gap-1.5 rounded-full border-0 px-2.5 py-1 text-[10px] font-bold tracking-[.04em] uppercase', toneClasses[tone], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </Badge>
  )
}
