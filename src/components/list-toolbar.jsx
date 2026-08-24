import { ArrowDownAZ, ArrowUpAZ, Search } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'

export function ListToolbar({ query, onQueryChange, sort, onSortChange, direction, onDirectionChange, options, resultCount, searchLabel }) {
  return <div className="mb-5 flex items-end gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgb(2_40_88_/_3%)] max-[700px]:grid max-[700px]:grid-cols-[1fr_auto]">
    <div className="min-w-48 flex-1 max-[700px]:col-span-2"><Label className="sr-only" htmlFor="list-search">{searchLabel}</Label><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={16} /><Input id="list-search" className="h-10 bg-white pl-9" type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={searchLabel} /></div></div>
    <div className="w-48 max-[700px]:w-full"><Label className="sr-only" htmlFor="list-sort">Urutkan berdasarkan</Label><Select value={sort} onValueChange={onSortChange}><SelectTrigger id="list-sort" className="h-10 w-full bg-white"><SelectValue /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>
    <Button className="size-10" variant="outline" size="icon" type="button" onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')} aria-label={`Urutkan ${direction === 'asc' ? 'menurun' : 'menaik'}`}>{direction === 'asc' ? <ArrowUpAZ /> : <ArrowDownAZ />}</Button>
    <span className="sr-only" role="status" aria-live="polite">{resultCount} hasil</span>
  </div>
}
