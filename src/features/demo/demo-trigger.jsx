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
      <div className="flex flex-col gap-2 border-t border-border px-2 py-3" aria-label="Tindakan akun demo">
        <span className="text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">Alat demo</span>
        <Button className="h-auto w-full whitespace-normal py-2" size="sm" type="button" onClick={() => open('load')}><FlaskConical />Muat Data Demo</Button>
        <Button className="h-auto w-full whitespace-normal py-2" size="sm" variant="destructive-outline" type="button" onClick={() => open('reset')}><RotateCcw />Atur Ulang</Button>
      </div>

      <Dialog open={action !== null} onOpenChange={(nextOpen) => !nextOpen && close()}>
        <DialogContent className={isReset ? 'max-w-[500px] p-6' : 'max-w-[620px] overflow-hidden p-6'}>
          {!isReset && <div className="absolute inset-x-0 top-0 h-1 bg-[repeating-linear-gradient(90deg,#f5b942_0_12px,#063b73_12px_24px)]" />}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {isReset ? <RotateCcw className="text-destructive" /> : <FlaskConical className="text-primary" />}
              {isReset ? 'Atur ulang akun demo?' : 'Muat Data Demo?'}
            </DialogTitle>
            <DialogDescription>
              {isReset
                ? 'Tindakan ini menghapus status operasional dan demo, lalu memulihkan kondisi awal sumber daya: 2 ruang dingin, 3 truk, dan 3 tujuan. Akses akun dan koneksi permanen Telegram Anda tetap tersimpan; percakapan tertunda dan token tautan sekali pakai akan dihapus.'
                : 'Tindakan ini mengganti status operasional akun saat ini dengan skenario demo tetap yang baru: 3 perjalanan penangkapan ikan selesai, 3 batch aktif dan 3 batch historis, 3 sensor SIM yang ditetapkan, serta 15 pembacaan. Akses akun dan koneksi Telegram Anda tetap tersimpan.'}
            </DialogDescription>
          </DialogHeader>

          {mutation.isError && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">{demoError(mutation.error)}</p>}
          {isReset && resetMutation.data && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status">
              <strong className="block text-sm">Akun demo telah diatur ulang</strong>
              <p className="mt-1 text-sm text-muted-foreground">Kondisi awal sumber daya dipulihkan dengan 2 ruang dingin, 3 truk, dan 3 tujuan.</p>
            </div>
          )}
          {!isReset && loadMutation.data && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4" role="status">
              <strong className="block text-sm">Demo operasi siap</strong>
              <p className="mt-1 text-sm text-muted-foreground">{loadMutation.data.trips.length} perjalanan · {loadMutation.data.batches.length} batch · {loadMutation.data.sensors.length} sensor ditetapkan · {loadMutation.data.readingCount} pembacaan</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {loadMutation.data.batches.map((batch) => {
                  const sensor = loadMutation.data.sensors.find(({ batchCode }) => batchCode === batch.code)
                  return (
                    <div className="min-w-0 rounded-md border border-border/70 bg-background/70 px-3 py-2" key={batch.id}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-bold text-foreground">{batch.code}</span>
                        <span className="shrink-0 text-xs font-semibold">{batch.currentTemperatureC === null ? 'Historis' : `${batch.currentTemperatureC.toFixed(1)}°C`}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{batch.tripCode} · {sensor ? `${sensor.code} · ${sensor.readingCount} pembacaan` : 'Tanpa sensor'}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{batch.remainingQualityWindowDays === null ? 'Batch ditutup' : `Sisa masa mutu ${batch.remainingQualityWindowDays.toFixed(1)} hari`}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 px-6">
            <Button variant="outline" type="button" onClick={close} disabled={mutation.isPending}>{mutation.data ? 'Tutup' : 'Batal'}</Button>
            {mutation.data
              ? <Button type="button" onClick={viewOverview}>Lihat ringkasan</Button>
              : <Button variant={isReset ? 'destructive' : 'default'} type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                  {mutation.isPending ? <LoaderCircle className="animate-spin" /> : isReset ? <RotateCcw /> : <FlaskConical />}
                  {mutation.isPending ? (isReset ? 'Mengatur ulang…' : 'Memuat data demo…') : (isReset ? 'Atur ulang akun' : 'Muat Data Demo')}
                </Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
