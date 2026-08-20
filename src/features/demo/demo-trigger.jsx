import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FlaskConical, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { demoError, loadDemoData } from './demo-api.js'

export function DemoTrigger() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: loadDemoData,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['overview'] }),
      queryClient.invalidateQueries({ queryKey: ['resources'] }),
      queryClient.invalidateQueries({ queryKey: ['batches'] }),
      queryClient.invalidateQueries({ queryKey: ['fishing-trips'] }),
    ]),
  })

  const close = () => {
    if (mutation.isPending) return
    setOpen(false)
    mutation.reset()
  }

  return (
    <>
      <Button
        className="fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)] z-40 h-12 rounded-full border-2 border-white/70 bg-[#063b73] px-5 shadow-[0_12px_32px_rgb(2_40_88_/_28%)] hover:bg-[#0a4b8d] max-[520px]:size-12 max-[520px]:px-0"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Load demo sensor data"
      >
        <FlaskConical className="size-5" />
        <span className="max-[520px]:sr-only">Load demo data</span>
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent className="max-w-[440px] overflow-hidden p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#f5b942_0_12px,#063b73_12px_24px)]" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg"><FlaskConical className="text-primary" /> Sensor demo</DialogTitle>
            <DialogDescription>
              Creates a demo trip, batch, sensor, and five readings. Running it again replaces only this account&apos;s demo telemetry.
            </DialogDescription>
          </DialogHeader>

          {mutation.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{demoError(mutation.error)}</p>}
          {mutation.data && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status">
              <strong className="block text-sm">Demo pipeline completed</strong>
              <p className="mt-1 text-sm text-muted-foreground">{mutation.data.sensor.code} sent {mutation.data.readingCount} readings to {mutation.data.batch.code}. Latest temperature: {mutation.data.currentTemperatureC.toFixed(1)}°C.</p>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" type="button" onClick={close} disabled={mutation.isPending}>{mutation.data ? 'Close' : 'Cancel'}</Button>
            {mutation.data
              ? <Button type="button" onClick={() => { close(); navigate('/') }}>View overview</Button>
              : <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                  {mutation.isPending ? <LoaderCircle className="animate-spin" /> : <FlaskConical />}
                  {mutation.isPending ? 'Generating…' : 'Generate demo data'}
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
