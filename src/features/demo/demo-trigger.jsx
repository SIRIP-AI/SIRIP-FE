import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { demoError, loadDemoData, resetDemoData } from './demo-api.js'

const refreshedQueries = ['overview', 'resources', 'batches', 'fishing-trips', 'plans', 'auth', 'telegram']

export function DemoTrigger() {
  const [action, setAction] = useState(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const invalidateDemoQueries = () => Promise.all(refreshedQueries.map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] })))
  const loadMutation = useMutation({ mutationFn: loadDemoData, onSuccess: invalidateDemoQueries })
  const resetMutation = useMutation({ mutationFn: resetDemoData, onSuccess: invalidateDemoQueries })
  const mutation = action === 'reset' ? resetMutation : loadMutation
  const open = (nextAction) => {
    loadMutation.reset()
    resetMutation.reset()
    setAction(nextAction)
  }
  const close = () => {
    if (mutation.isPending) return
    setAction(null)
    mutation.reset()
  }
  const viewOverview = () => {
    close()
    navigate('/')
  }
  const isReset = action === 'reset'

  return (
    <>
      <div className="flex flex-col gap-2 border-t border-border px-2 py-3" aria-label="Demo account actions">
        <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Demo tools</span>
        <Button className="h-auto w-full whitespace-normal py-2" size="sm" type="button" onClick={() => open('load')}><FlaskConical />Load Demo Data</Button>
        <Button className="h-auto w-full whitespace-normal py-2" size="sm" variant="destructive-outline" type="button" onClick={() => open('reset')}><RotateCcw />Reset</Button>
      </div>

      <Dialog open={action !== null} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent className={isReset ? 'max-w-[500px] p-6' : 'max-w-[620px] overflow-hidden p-6'}>
          {!isReset && <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#f5b942_0_12px,#063b73_12px_24px)]" />}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {isReset ? <RotateCcw className="text-destructive" /> : <FlaskConical className="text-primary" />}
              {isReset ? 'Reset demo account?' : 'Load Demo Data?'}
            </DialogTitle>
            <DialogDescription>
              {isReset
                ? 'This removes operational and demo state, then restores the resource-only baseline: 2 cold rooms, 3 trucks, and 3 destinations. Your login and permanent Telegram connection remain; pending conversations and one-time link tokens are cleared.'
                : 'This replaces the account’s current operational state with a fresh fixed demo scenario: 3 completed fishing trips, 3 active and 3 historical batches, 3 assigned SIM sensors, and 15 readings. Your login and Telegram connection are preserved.'}
            </DialogDescription>
          </DialogHeader>

          {mutation.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{demoError(mutation.error)}</p>}
          {isReset && resetMutation.data && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status">
              <strong className="block text-sm">Demo account reset</strong>
              <p className="mt-1 text-sm text-muted-foreground">Resource baseline restored with 2 cold rooms, 3 trucks, and 3 destinations.</p>
            </div>
          )}
          {!isReset && loadMutation.data && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status">
              <strong className="block text-sm">Operations demo ready</strong>
              <p className="mt-1 text-sm text-muted-foreground">{loadMutation.data.trips.length} trips · {loadMutation.data.batches.length} batches · {loadMutation.data.sensors.length} assigned sensors · {loadMutation.data.readingCount} readings</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {loadMutation.data.batches.map((batch) => {
                  const sensor = loadMutation.data.sensors.find(({ batchCode }) => batchCode === batch.code)
                  return (
                    <div className="min-w-0 rounded-md border border-border/70 bg-background/70 px-3 py-2" key={batch.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-bold text-foreground">{batch.code}</span>
                        <span className="shrink-0 text-xs font-semibold">{batch.currentTemperatureC === null ? 'Historical' : `${batch.currentTemperatureC.toFixed(1)}°C`}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{batch.tripCode} · {sensor ? `${sensor.code} · ${sensor.readingCount} readings` : 'No sensor'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{batch.remainingQualityWindowDays === null ? 'Closed batch' : `${batch.remainingQualityWindowDays.toFixed(1)} days quality window`}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" type="button" onClick={close} disabled={mutation.isPending}>{mutation.data ? 'Close' : 'Cancel'}</Button>
            {mutation.data
              ? <Button type="button" onClick={viewOverview}>View overview</Button>
              : <Button variant={isReset ? 'destructive' : 'default'} type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                  {mutation.isPending ? <LoaderCircle className="animate-spin" /> : isReset ? <RotateCcw /> : <FlaskConical />}
                  {mutation.isPending ? (isReset ? 'Resetting…' : 'Loading demo data…') : (isReset ? 'Reset account' : 'Load Demo Data')}
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
