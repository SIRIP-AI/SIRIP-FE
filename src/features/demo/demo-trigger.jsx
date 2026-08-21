import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { demoError, loadDemoData, resetDemoAccount } from './demo-api.js'

const refreshedQueries = ['overview', 'resources', 'batches', 'fishing-trips', 'plans', 'auth', 'telegram']

export function DemoTrigger() {
  const [dialog, setDialog] = useState(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const invalidateDemoQueries = () => Promise.all(refreshedQueries.map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] })))
  const loadMutation = useMutation({
    mutationFn: loadDemoData,
    onSuccess: invalidateDemoQueries,
  })
  const resetMutation = useMutation({
    mutationFn: resetDemoAccount,
    onSuccess: async () => {
      await invalidateDemoQueries()
      setDialog(null)
      navigate('/')
    },
  })

  const close = () => {
    if (loadMutation.isPending || resetMutation.isPending) return
    setDialog(null)
    loadMutation.reset()
    resetMutation.reset()
  }

  return (
    <>
      <div className="flex flex-col gap-2 border-t border-border px-2 py-3" aria-label="Demo account actions">
        <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Demo tools</span>
        <Button className="w-full" size="sm" type="button" onClick={() => setDialog('load')}><FlaskConical />Load demo data</Button>
        <Button className="w-full" variant="destructive-outline" size="sm" type="button" onClick={() => setDialog('reset')}><RotateCcw />Reset demo account</Button>
      </div>

      <Dialog open={dialog === 'load'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-[620px] overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#f5b942_0_12px,#063b73_12px_24px)]" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg"><FlaskConical className="text-primary" /> Operations demo</DialogTitle>
            <DialogDescription>
              Creates 3 trips, 6 batches, 6 assigned sensors, and 30 readings. Running it again replaces only this account&apos;s demo telemetry.
            </DialogDescription>
          </DialogHeader>

          {loadMutation.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{demoError(loadMutation.error)}</p>}
          {loadMutation.data && (
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
                        <span className="shrink-0 text-xs font-semibold">{batch.currentTemperatureC.toFixed(1)}°C</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{batch.tripCode} · {sensor ? `${sensor.code} · ${sensor.readingCount} readings` : 'No sensor'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{batch.remainingQualityWindowDays.toFixed(1)} days quality window</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" type="button" onClick={close} disabled={loadMutation.isPending}>{loadMutation.data ? 'Close' : 'Cancel'}</Button>
            {loadMutation.data
              ? <Button type="button" onClick={() => { close(); navigate('/') }}>View overview</Button>
              : <Button type="button" onClick={() => loadMutation.mutate()} disabled={loadMutation.isPending}>
                  {loadMutation.isPending ? <LoaderCircle className="animate-spin" /> : <FlaskConical />}
                  {loadMutation.isPending ? 'Generating…' : 'Generate demo data'}
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'reset'} onOpenChange={(open) => !open && close()}>
        <DialogContent className="max-w-[460px] p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg"><TriangleAlert className="text-destructive" /> Reset demo account?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              This permanently deletes this demo account&apos;s trips, batches, plans, sensors, telemetry, alerts, and Telegram connection, then restores its seed resources. Your current login is preserved. Other accounts are not affected.
            </DialogDescription>
          </DialogHeader>
          {resetMutation.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{demoError(resetMutation.error)}</p>}
          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" type="button" onClick={close} disabled={resetMutation.isPending}>Cancel</Button>
            <Button variant="destructive" type="button" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}>
              {resetMutation.isPending ? <LoaderCircle className="animate-spin" /> : <RotateCcw />}
              {resetMutation.isPending ? 'Resetting…' : 'Reset demo account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
