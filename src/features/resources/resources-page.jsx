import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bluetooth, BluetoothSearching, Check, CheckCircle2, Clock3, Cpu, LoaderCircle, MapPin, Pencil, Plus, RefreshCw, Server, Snowflake, ThermometerSnowflake, Trash2, Truck, Unplug, Wifi, WifiOff } from 'lucide-react'

import { StatusBadge } from '@/components/status-badge.jsx'
import { Appear } from '@/components/appear.jsx'
import { PageHeader } from '@/components/page-header.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx'
import { DialogContent } from '@/components/ui/dialog.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import {
  apiError,
  assignSensor,
  coldStorageInputSchema,
  deleteResource,
  destinationInputSchema,
  destinationStatuses,
  getSetupReadiness,
  listResources,
  listSensorAssignmentOptions,
  listSensorReadings,
  saveResource,
  sensorProvisioningFormSchema,
  simulateSensorExcursion,
  simulateSensorOffline,
  simulateSensorRecovery,
  unassignSensor,
  vehicleInputSchema,
  resourceOperationalStatuses,
  reconnectSensorTelemetry,
} from '@/features/resources/resources-api.js'
import { bluetoothSupportError, defaultDeviceBackendUrl, deviceBackendUrl, discoverSiripSensor, provisioningErrorMessage } from '@/features/resources/sensor-provisioning.js'
import { cn } from '@/lib/utils.js'

const tabs = [
  { id: 'cold-storages', label: 'Penyimpanan Dingin', icon: Snowflake },
  { id: 'vehicles', label: 'Truk', icon: Truck },
  { id: 'destinations', label: 'Tujuan', icon: MapPin },
  { id: 'sensors', label: 'Sensor', icon: Cpu },
]

const setupStepLabels = {
  coldStorages: 'Penyimpanan dingin',
  vehicles: 'Truk',
  destinations: 'Tujuan',
  sensors: 'Sensor',
}

const labels = {
  AVAILABLE: 'Tersedia',
  FULL: 'Penuh',
  UNAVAILABLE: 'Tidak tersedia',
  ASSIGNED: 'Ditugaskan',
  PENDING: 'Tertunda',
  PROVISIONED: 'Terprovisi',
  ONLINE: 'Daring',
  SYNCING: 'Menyinkronkan',
  OFFLINE: 'Luring',
  ERROR: 'Kesalahan',
  NEVER_CONNECTED: 'Belum pernah terhubung',
}

const tones = {
  AVAILABLE: 'healthy',
  FULL: 'warning',
  ASSIGNED: 'neutral',
  UNAVAILABLE: 'critical',
  PENDING: 'warning',
  PROVISIONED: 'healthy',
  ONLINE: 'healthy',
  SYNCING: 'warning',
  OFFLINE: 'warning',
  ERROR: 'critical',
  NEVER_CONNECTED: 'neutral',
}

function ResourceStatusBadge({ status }) {
  return <StatusBadge tone={tones[status] ?? 'neutral'}>{labels[status] ?? status}</StatusBadge>
}

function ResourceDialogContent({ className = '', children, ...props }) { return <DialogContent className={`max-w-[560px] p-6 shadow-[0_24px_80px_rgb(2_40_88_/_24%)] sm:p-6 ${className}`} {...props}>{children}</DialogContent> }

function DialogHeading({ eyebrow, title }) {
  return <DialogHeader className="pr-10"><span className="text-[10px] font-bold tracking-[.08em] text-primary uppercase">{eyebrow}</span><DialogTitle className="text-[21px] font-bold tracking-[-.03em]">{title}</DialogTitle></DialogHeader>
}

function FormField({ label, error, help, htmlFor, children }) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined
  const helpId = help && htmlFor ? `${htmlFor}-help` : undefined
  const description = [helpId, errorId].filter(Boolean).join(' ') || undefined
  const controls = description ? Children.map(children, (child) => isValidElement(child) && child.props.type !== 'hidden' ? cloneElement(child, { 'aria-describedby': description }) : child) : children
  return <div className="grid gap-2"><Label className="text-xs font-semibold text-slate-600" htmlFor={htmlFor}>{label}</Label>{controls}{help && <span id={helpId} className="text-xs text-muted-foreground">{help}</span>}{error && <span id={errorId} className="text-xs text-red-700">{error}</span>}</div>
}

function ResourceSelect({ id, name, defaultValue, disabled, options, ariaInvalid, ...triggerProps }) {
  return <Select name={name} defaultValue={defaultValue} disabled={disabled}><SelectTrigger id={id} className="h-10 w-full bg-white px-3 text-sm" aria-invalid={ariaInvalid} {...triggerProps}><SelectValue /></SelectTrigger><SelectContent position="popper">{options.map((status) => <SelectItem key={status} value={status}>{labels[status]}</SelectItem>)}</SelectContent></Select>
}

function numericValue(form, name) {
  const value = form.get(name)
  return value === '' ? Number.NaN : Number(value)
}

function ResourceDialog({ type, resource, onClose, onComplete }) {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState({})
  const isColdStorage = type === 'cold-storages'
  const isVehicle = type === 'vehicles'
  const title = `${resource ? 'Ubah' : 'Tambah'} ${isColdStorage ? 'penyimpanan dingin' : isVehicle ? 'truk' : 'tujuan'}`
  const mutation = useMutation({
    mutationFn: (input) => saveResource(type, { ...input, id: resource?.id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resources', type] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
      ])
      onComplete(resource ? 'Sumber daya diperbarui' : 'Sumber daya ditambahkan')
      onClose()
    },
  })

  function submit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const capacityKg = numericValue(form, 'capacityKg')
    const input = isColdStorage ? {
      name: form.get('name'),
      capacityKg,
      availableCapacityKg: capacityKg,
      operationalStatus: form.get('operationalStatus'),
    } : isVehicle ? {
      code: form.get('code'),
      capacityKg: numericValue(form, 'capacityKg'),
      operationalStatus: form.get('operationalStatus'),
      restriction: form.get('restriction')?.trim() || null,
      availabilityStart: form.get('availabilityStart') || null,
      availabilityEnd: form.get('availabilityEnd') || null,
    } : {
      name: form.get('name'),
      address: form.get('address'),
      travelMinutes: numericValue(form, 'travelMinutes'),
      receivingStart: form.get('receivingStart'),
      receivingEnd: form.get('receivingEnd'),
      status: form.get('status'),
      notes: form.get('notes')?.trim() || null,
    }
    const schema = isColdStorage ? coldStorageInputSchema : isVehicle ? vehicleInputSchema : destinationInputSchema
    const result = schema.safeParse(input)
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
      window.requestAnimationFrame(() => formElement.querySelector('[aria-invalid="true"]')?.focus())
      return
    }
    setErrors({})
    mutation.reset()
    mutation.mutate(result.data)
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ResourceDialogContent>
        <form className="grid gap-4" onSubmit={submit}>
        <DialogHeading eyebrow="Sumber daya" title={title} />
        <DialogDescription className="sr-only">Konfigurasikan sumber daya operasional yang dipilih.</DialogDescription>

        {isColdStorage ? (
          <>
            <FormField label="Nama" htmlFor="resource-name" error={errors.name}><Input className="h-10" id="resource-name" name="name" defaultValue={resource?.name ?? ''} placeholder="Ruang Dingin 1" autoFocus required aria-invalid={Boolean(errors.name)} /></FormField>
            <FormField label="Kapasitas total (kg)" htmlFor="capacity-kg" error={errors.capacityKg} help="Kapasitas tersedia dihitung dari batch yang disimpan secara fisik di sini."><Input className="h-10" id="capacity-kg" name="capacityKg" type="number" min="0.01" step="0.01" defaultValue={resource?.capacityKg ?? ''} required aria-invalid={Boolean(errors.capacityKg)} /></FormField>
            <FormField label="Status operasional" htmlFor="storage-status" error={errors.operationalStatus} help={resource?.status === 'FULL' ? 'Status tidak dapat diubah saat penyimpanan penuh.' : undefined}><ResourceSelect id="storage-status" name={resource?.status === 'FULL' ? undefined : 'operationalStatus'} defaultValue={resource?.operationalStatus ?? 'AVAILABLE'} disabled={resource?.status === 'FULL'} options={resourceOperationalStatuses} ariaInvalid={Boolean(errors.operationalStatus)} />{resource?.status === 'FULL' && <input name="operationalStatus" type="hidden" value={resource.operationalStatus} />}</FormField>
          </>
        ) : isVehicle ? (
          <>
            <FormField label="ID truk" htmlFor="truck-code" error={errors.code}><Input className="h-10" id="truck-code" name="code" defaultValue={resource?.code ?? ''} placeholder="TR-02" autoFocus required aria-invalid={Boolean(errors.code)} /></FormField>
            <FormField label="Kapasitas (kg)" htmlFor="truck-capacity" error={errors.capacityKg}><Input className="h-10" id="truck-capacity" name="capacityKg" type="number" min="0.01" step="0.01" defaultValue={resource?.capacityKg ?? ''} required aria-invalid={Boolean(errors.capacityKg)} /></FormField>
            <FormField label="Batasan" htmlFor="truck-restriction" error={errors.restriction}><Textarea id="truck-restriction" name="restriction" defaultValue={resource?.restriction ?? ''} placeholder="Batasan jalan, pemuatan, atau operasional" maxLength="500" aria-invalid={Boolean(errors.restriction)} /></FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Tersedia mulai" htmlFor="availability-start" error={errors.availabilityStart}><Input className="h-10" id="availability-start" name="availabilityStart" type="time" defaultValue={resource?.availabilityStart ?? ''} aria-invalid={Boolean(errors.availabilityStart)} /></FormField>
              <FormField label="Tersedia hingga" htmlFor="availability-end" error={errors.availabilityEnd}><Input className="h-10" id="availability-end" name="availabilityEnd" type="time" defaultValue={resource?.availabilityEnd ?? ''} aria-invalid={Boolean(errors.availabilityEnd)} /></FormField>
            </div>
            <FormField label="Status operasional" htmlFor="vehicle-status" error={errors.operationalStatus}><ResourceSelect id="vehicle-status" name="operationalStatus" defaultValue={resource?.operationalStatus ?? 'AVAILABLE'} options={resourceOperationalStatuses} ariaInvalid={Boolean(errors.operationalStatus)} /></FormField>
          </>
        ) : (
          <>
            <FormField label="Nama pengolah" htmlFor="destination-name" error={errors.name}><Input className="h-10" id="destination-name" name="name" defaultValue={resource?.name ?? ''} placeholder="Pengolah A" autoFocus required aria-invalid={Boolean(errors.name)} /></FormField>
            <FormField label="Lokasi" htmlFor="destination-address" error={errors.address}><Input className="h-10" id="destination-address" name="address" defaultValue={resource?.address ?? ''} placeholder="Tanjung Perak, Surabaya" required aria-invalid={Boolean(errors.address)} /></FormField>
            <FormField label="Waktu tempuh (menit)" htmlFor="travel-minutes" error={errors.travelMinutes}><Input className="h-10" id="travel-minutes" name="travelMinutes" type="number" min="0" step="1" defaultValue={resource?.travelMinutes ?? ''} required aria-invalid={Boolean(errors.travelMinutes)} /></FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Penerimaan mulai" htmlFor="receiving-start" error={errors.receivingStart}><Input className="h-10" id="receiving-start" name="receivingStart" type="time" defaultValue={resource?.receivingStart ?? '08:00'} required aria-invalid={Boolean(errors.receivingStart)} /></FormField>
              <FormField label="Penerimaan berakhir" htmlFor="receiving-end" error={errors.receivingEnd}><Input className="h-10" id="receiving-end" name="receivingEnd" type="time" defaultValue={resource?.receivingEnd ?? '16:00'} required aria-invalid={Boolean(errors.receivingEnd)} /></FormField>
            </div>
            <FormField label="Catatan" htmlFor="destination-notes" error={errors.notes}><Textarea id="destination-notes" name="notes" defaultValue={resource?.notes ?? ''} placeholder="Batasan penerimaan sederhana" maxLength="500" aria-invalid={Boolean(errors.notes)} /></FormField>
            <FormField label="Status" htmlFor="destination-status" error={errors.status}><ResourceSelect id="destination-status" name="status" defaultValue={resource?.status ?? 'AVAILABLE'} options={destinationStatuses} ariaInvalid={Boolean(errors.status)} /></FormField>
          </>
        )}

        {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan…' : 'Simpan sumber daya'}</Button></DialogFooter>
        </form>
      </ResourceDialogContent>
    </Dialog>
  )
}

const provisioningStatusCopy = {
  IDLE: 'Siap dikonfigurasi',
  RECEIVING_CONFIG: 'Mengirim konfigurasi',
  CONNECTING_WIFI: 'Menghubungkan ke Wi-Fi',
  CONNECTING_BACKEND: 'Mengonfirmasi koneksi backend',
  SUCCESS: 'Sensor terhubung',
  WIFI_FAILED: 'Koneksi Wi-Fi gagal',
  BACKEND_FAILED: 'Koneksi backend gagal',
  OFFLINE: 'Koneksi Wi-Fi gagal',
  INVALID_CONFIG: 'Konfigurasi ditolak',
}

function SensorProvisioningDialog({ onClose, onComplete }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState('discover')
  const [connection, setConnection] = useState(null)
  const [status, setStatus] = useState('IDLE')
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [registrationInput, setRegistrationInput] = useState(null)
  const active = useRef(true)
  const connectionRef = useRef(null)
  const provisioning = useRef(false)
  const registering = useRef(false)
  const supportError = bluetoothSupportError()

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      connectionRef.current?.disconnect()
    }
  }, [])

  async function discover() {
    setBusy(true)
    setError('')
    try {
      const sensor = await discoverSiripSensor()
      if (!active.current) {
        sensor.disconnect()
        return
      }
      connectionRef.current = sensor
      setConnection(sensor)
      setStep('configure')
    } catch (discoveryError) {
      if (active.current && discoveryError.name !== 'NotFoundError') setError(provisioningErrorMessage(discoveryError))
    } finally {
      if (active.current) setBusy(false)
    }
  }

  function selectAnother() {
    connectionRef.current?.disconnect()
    connectionRef.current = null
    setConnection(null)
    setStatus('IDLE')
    setError('')
    setStep('discover')
  }

  async function registerSensor(input) {
    if (registering.current) return
    registering.current = true
    setBusy(true)
    setError('')
    try {
      await saveResource('sensors', input)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resources', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'sensor-assignment-options'] }),
      ])
      setStep('success')
      onComplete('Sensor berhasil diprovisi')
    } catch (registrationError) {
      setError(apiError(registrationError))
      await queryClient.invalidateQueries({ queryKey: ['resources', 'sensors'] })
    } finally {
      registering.current = false
      setBusy(false)
    }
  }

  async function provision(event) {
    event.preventDefault()
    if (provisioning.current) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const result = sensorProvisioningFormSchema.safeParse({
      code: form.get('code'),
      wifiSsid: form.get('wifiSsid'),
      wifiPassword: form.get('wifiPassword'),
      backendUrl: form.get('backendUrl'),
    })
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
      window.requestAnimationFrame(() => formElement.querySelector('[aria-invalid="true"]')?.focus())
      return
    }

    let backendUrl
    try {
      backendUrl = deviceBackendUrl(result.data.backendUrl)
    } catch (configurationError) {
      setError(provisioningErrorMessage(configurationError))
      return
    }

    setErrors({})
    setError('')
    const input = { code: result.data.code, deviceUid: connection.deviceUid, provisioningStatus: 'PROVISIONED' }
    setRegistrationInput(input)
    setStatus('IDLE')
    setStep('provision')
    provisioning.current = true
    try {
      await connection.provision({ ...result.data, sensorCode: input.code, backendUrl, onStatus: setStatus })
    } catch (provisioningError) {
      setError(provisioningErrorMessage(provisioningError))
      provisioning.current = false
      return
    }
    await registerSensor(input)
    provisioning.current = false
  }

  const progress = [
    { status: 'RECEIVING_CONFIG', label: 'Kirim konfigurasi', icon: Bluetooth },
    { status: 'CONNECTING_WIFI', label: 'Hubungkan ke Wi-Fi', icon: Wifi },
    { status: 'CONNECTING_BACKEND', label: 'Konfirmasi backend', icon: Server },
  ]
  const currentProgress = { IDLE: 0, RECEIVING_CONFIG: 0, CONNECTING_WIFI: 1, CONNECTING_BACKEND: 2, SUCCESS: 3 }[status] ?? -1

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && (step !== 'provision' || status === 'SUCCESS') && onClose()}>
      <ResourceDialogContent>
        {step === 'discover' && <div className="grid gap-5">
          <DialogHeading eyebrow="Provisi sensor · 1 dari 3" title="Temukan sensor di sekitar" />
          <DialogDescription className="text-sm leading-relaxed text-slate-600">Nyalakan SIRIP ESP32 dan letakkan di dekat komputer ini. Chrome akan menampilkan perangkat yang kompatibel untuk provisi lokal.</DialogDescription>
          <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-6 text-center"><BluetoothSearching className="text-primary" size={32} /><div><strong className="text-sm">Siap memindai</strong><p className="mt-1 text-xs text-muted-foreground">Hanya perangkat yang menyiarkan layanan provisi SIRIP yang ditampilkan.</p></div></div>
          {(supportError || error) && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{supportError || error}</p>}
          <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose} disabled={busy}>Batal</Button><Button type="button" onClick={discover} disabled={Boolean(supportError) || busy}>{busy ? <><LoaderCircle className="animate-spin" />Menghubungkan…</> : <><BluetoothSearching />Temukan sensor</>}</Button></DialogFooter>
        </div>}

        {step === 'configure' && <form className="grid gap-4" onSubmit={provision}>
          <DialogHeading eyebrow="Provisi sensor · 2 dari 3" title="Konfigurasikan sensor" />
          <DialogDescription className="sr-only">Konfigurasikan sensor SIRIP yang dipilih dan koneksi Wi-Fi-nya.</DialogDescription>
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-primary"><Bluetooth size={18} /></span><div className="min-w-0"><strong className="block truncate text-xs">{connection.name}</strong><span className="block truncate text-[10px] text-muted-foreground" title={connection.deviceUid}>{connection.deviceUid}</span></div><Button className="ml-auto" variant="ghost" size="sm" type="button" onClick={selectAnother}>Ganti</Button></div>
          <FormField label="ID sensor" htmlFor="provision-sensor-code" error={errors.code}><Input className="h-10" id="provision-sensor-code" name="code" placeholder="S-003" autoFocus required aria-invalid={Boolean(errors.code)} /></FormField>
          <FormField label="SSID Wi-Fi" htmlFor="provision-wifi-ssid" error={errors.wifiSsid}><Input className="h-10" id="provision-wifi-ssid" name="wifiSsid" placeholder="RuangDingin-WiFi" required aria-invalid={Boolean(errors.wifiSsid)} autoComplete="off" /></FormField>
          <FormField label="Kata sandi Wi-Fi" htmlFor="provision-wifi-password" error={errors.wifiPassword} help="Biarkan kosong untuk jaringan terbuka. Data dikirim langsung ke ESP32 dan tidak disimpan oleh SIRIP."><Input className="h-10" id="provision-wifi-password" name="wifiPassword" type="password" maxLength="63" aria-invalid={Boolean(errors.wifiPassword)} autoComplete="new-password" /></FormField>
          <FormField label="URL backend" htmlFor="provision-backend-url" error={errors.backendUrl} help="Gunakan alamat LAN komputer backend, bukan localhost."><Input className="h-10" id="provision-backend-url" name="backendUrl" type="url" defaultValue={defaultDeviceBackendUrl()} placeholder="http://192.168.1.10:3000" required aria-invalid={Boolean(errors.backendUrl)} autoComplete="url" /></FormField>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p>}
          <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={selectAnother}>Kembali</Button><Button type="submit"><Bluetooth />Provisi sensor</Button></DialogFooter>
        </form>}

        {step === 'provision' && <div className="grid gap-5">
          <DialogHeading eyebrow="Provisi sensor · 3 dari 3" title="Menghubungkan sensor" />
          <DialogDescription className="text-sm leading-relaxed text-slate-600">Pastikan sensor tetap menyala dan berada di dekat komputer saat terhubung ke Wi-Fi dan memeriksa backend SIRIP.</DialogDescription>
          <div className="grid gap-2" role="status" aria-live="polite">{progress.map(({ status: progressStatus, label, icon: Icon }, index) => { const complete = currentProgress > index; const active = currentProgress === index; return <div className={cn('flex items-center gap-3 rounded-lg border p-3', complete ? 'border-green-200 bg-green-50' : active ? 'border-blue-200 bg-blue-50' : 'border-border bg-muted/40')} key={progressStatus}><span className={cn('grid size-8 place-items-center rounded-full', complete ? 'bg-green-600 text-white' : active ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500')}>{complete ? <Check size={16} /> : active ? <LoaderCircle className="animate-spin" size={16} /> : <Icon size={16} />}</span><span className="text-xs font-semibold">{label}</span></div> })}</div>
          <p className={cn('rounded-lg p-3 text-xs font-semibold', status === 'SUCCESS' ? 'bg-green-50 text-green-800' : ['WIFI_FAILED', 'BACKEND_FAILED', 'OFFLINE', 'INVALID_CONFIG'].includes(status) ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-primary')}>{provisioningStatusCopy[status]}</p>
          {error && <><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{error}</p><DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6">{status === 'SUCCESS' ? <><Button variant="outline" type="button" onClick={onClose} disabled={busy}>Tutup</Button><Button type="button" onClick={() => registerSensor(registrationInput)} disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" />Menambahkan sensor…</> : 'Coba tambahkan sensor lagi'}</Button></> : <Button type="button" onClick={() => { setError(''); setStatus('IDLE'); setStep('configure') }}>Tinjau konfigurasi</Button>}</DialogFooter></>}
        </div>}

        {step === 'success' && <div className="grid gap-5 text-center">
          <DialogHeading eyebrow="Provisi sensor selesai" title="Sensor telah terhubung" />
          <DialogDescription className="sr-only">Sensor telah diprovisi dan terhubung ke SIRIP.</DialogDescription>
          <div className="grid min-h-48 place-items-center rounded-xl border border-green-200 bg-green-50 p-6"><CheckCircle2 className="text-green-600" size={42} /><div><strong className="text-sm">{connection.name} siap digunakan</strong><p className="mt-1 text-xs text-muted-foreground">Sensor tersedia dan dapat dipilih saat menerima batch hasil pendaratan.</p></div></div>
          <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button type="button" onClick={onClose}>Selesai</Button></DialogFooter>
        </div>}
      </ResourceDialogContent>
    </Dialog>
  )
}

const cardClass = 'flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(2_40_88_/_3%)]'

function ResourceIcon({ children }) {
  return <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{children}</div>
}

function ResourceActions({ children }) {
  return <div className="mt-auto -mx-5 -mb-5 flex gap-2 border-t border-border p-3 px-5 [&>*]:flex-1">{children}</div>
}

function EditDeleteActions({ onEdit, onDelete }) {
  return <ResourceActions><Button variant="outline" size="sm" type="button" onClick={onEdit}><Pencil />Ubah</Button><Button variant="destructive-outline" size="sm" type="button" onClick={onDelete}><Trash2 />Hapus</Button></ResourceActions>
}

function ColdStorageCard({ resource, onEdit, onDelete }) {
  const usedPercent = Math.min(100, Math.max(0, Math.round((1 - resource.availableCapacityKg / resource.capacityKg) * 100)))
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><Snowflake size={20} /></ResourceIcon><ResourceStatusBadge status={resource.status} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.name}</h3><p className="mt-1.5 text-xs text-muted-foreground">Kapasitas total {resource.capacityKg.toLocaleString('id-ID')} kg</p></div>
      <div><div className="flex items-baseline gap-2"><strong className="text-xl tracking-[-.03em]">{resource.availableCapacityKg.toLocaleString('id-ID')} kg</strong><span className="text-xs text-muted-foreground">tersedia</span></div><div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground"><span>Terpakai</span><span className="font-semibold tabular-nums text-foreground">{usedPercent}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Kapasitas terpakai" aria-valuemin="0" aria-valuemax="100" aria-valuenow={usedPercent}><span className="block h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} /></div></div>
      <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function VehicleCard({ resource, onEdit, onDelete }) {
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><Truck size={20} /></ResourceIcon><ResourceStatusBadge status={resource.status} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.code}</h3><p className="mt-1.5 text-xs text-muted-foreground">Kapasitas muatan {resource.capacityKg.toLocaleString('id-ID')} kg</p></div>
      <div className="flex min-h-10 items-start gap-2 text-xs leading-relaxed text-slate-600"><Clock3 className="mt-0.5 shrink-0 text-muted-foreground" size={16} /><span>{resource.availabilityStart ? `Tersedia ${resource.availabilityStart}–${resource.availabilityEnd}` : 'Jadwal ketersediaan belum dikonfigurasi'}{resource.delayMinutes > 0 && ` · Terlambat ${resource.delayMinutes} menit`}{resource.restriction && ` · ${resource.restriction}`}</span></div>
      <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function DestinationCard({ resource, onEdit, onDelete }) {
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><MapPin size={20} /></ResourceIcon><ResourceStatusBadge status={resource.status} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.name}</h3><p className="mt-1.5 text-xs text-muted-foreground">{resource.address}</p></div>
      <div className="grid grid-cols-[1fr_1.35fr] gap-2"><span className="rounded-lg bg-muted/70 p-2.5 text-[10px] text-muted-foreground"><strong className="mb-1 block text-xs text-foreground">{resource.travelMinutes} menit</strong>perjalanan</span><span className="rounded-lg bg-muted/70 p-2.5 text-[10px] text-muted-foreground"><strong className="mb-1 block text-xs text-foreground">{resource.receivingStart}–{resource.receivingEnd}</strong>penerimaan</span></div>
      {resource.notes && <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground" title={resource.notes}>{resource.notes}</p>}
      <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function AssignmentDialog({ sensor, onClose, onComplete }) {
  const queryClient = useQueryClient()
  const options = useQuery({ queryKey: ['resources', 'sensor-assignment-options'], queryFn: listSensorAssignmentOptions, enabled: !sensor.assignment })
  const mutation = useMutation({
    mutationFn: (batchCode) => sensor.assignment ? unassignSensor(sensor.id) : assignSensor(sensor.id, batchCode),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resources', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'sensor-assignment-options'] }),
        queryClient.invalidateQueries({ queryKey: ['batches'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
      ])
      onComplete(sensor.assignment ? 'Penugasan sensor diakhiri' : 'Sensor ditugaskan')
      onClose()
    },
  })

  function submit(event) {
    event.preventDefault()
    mutation.mutate(sensor.assignment ? null : new FormData(event.currentTarget).get('batchCode'))
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ResourceDialogContent>
      <form className="grid gap-4" onSubmit={submit}>
        <DialogHeading eyebrow="Penugasan sensor" title={sensor.code} />
        <DialogDescription className="sr-only">Tugaskan sensor ini ke batch aktif yang belum dipantau.</DialogDescription>
        {sensor.assignment ? <p className="text-sm leading-relaxed text-slate-600">Akhiri pemantauan untuk <strong>{sensor.assignment.batchCode}</strong>? Sesi tetap tersimpan dalam riwayat dan sensor akan tersedia kembali.</p> : options.isPending ? <p className="text-sm text-muted-foreground" role="status">Memuat batch yang tersedia…</p> : options.isError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(options.error)}</p> : options.data.length ? <FormField label="Batch" htmlFor="batch-code"><Select name="batchCode" defaultValue={options.data[0].code}><SelectTrigger id="batch-code" className="h-10 w-full bg-white px-3 text-sm"><SelectValue /></SelectTrigger><SelectContent position="popper">{options.data.map((batch) => <SelectItem key={batch.id} value={batch.code}>{batch.code} · {batch.weightKg} kg · Mutu {batch.grade}</SelectItem>)}</SelectContent></Select></FormField> : <p className="text-sm text-muted-foreground">Tidak ada batch aktif tanpa pemantauan yang tersedia.</p>}
        {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose}>Batal</Button><Button type="submit" disabled={mutation.isPending || (!sensor.assignment && !options.data?.length)}>{mutation.isPending ? 'Menyimpan…' : sensor.assignment ? 'Akhiri penugasan' : 'Tugaskan sensor'}</Button></DialogFooter>
      </form>
      </ResourceDialogContent>
    </Dialog>
  )
}

function DeleteDialog({ resource, type, onClose, onComplete }) {
  const queryClient = useQueryClient()
  const name = resource.name ?? resource.code
  const mutation = useMutation({
    mutationFn: () => deleteResource(type, resource.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resources', type] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['overview'] }),
        queryClient.invalidateQueries({ queryKey: ['plans'] }),
      ])
      onComplete('Sumber daya dihapus')
      onClose()
    },
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ResourceDialogContent className="grid gap-4">
        <DialogHeading eyebrow="Hapus sumber daya" title={name} />
        <DialogDescription className="text-sm leading-relaxed text-slate-600">{type === 'sensors' ? 'Sensor akan dihapus dari sumber daya aktif, sedangkan riwayat pemantauan yang selesai tetap disimpan. Akhiri penugasannya terlebih dahulu.' : 'Tindakan ini menghapus sumber daya. Sumber daya yang tercatat dalam riwayat operasional tidak dapat dihapus.'}</DialogDescription>
        {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose}>Batal</Button><Button variant="destructive" type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Menghapus…' : 'Hapus sumber daya'}</Button></DialogFooter>
      </ResourceDialogContent>
    </Dialog>
  )
}

const sensorSimulationActions = {
  excursion: simulateSensorExcursion,
  recovery: simulateSensorRecovery,
  offline: simulateSensorOffline,
  reconnect: reconnectSensorTelemetry,
}

const sensorSimulationMessages = {
  excursion: 'Penyimpangan suhu disimulasikan',
  recovery: 'Pemulihan disimulasikan',
  offline: 'Status luring disimulasikan',
  reconnect: 'Penerimaan telemetri dipulihkan',
}

function SensorCard({ resource, onDelete, onAssignment, onComplete }) {
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const readings = useQuery({
    queryKey: ['resources', 'sensors', resource.id, 'readings'],
    queryFn: () => listSensorReadings(resource.id),
    refetchInterval: 15_000,
    enabled: resource.provisioningStatus === 'PROVISIONED',
  })
  const latest = readings.data?.at(-1)
  const simulation = useMutation({
    mutationFn: (action) => sensorSimulationActions[action](resource.id),
    onSuccess: async (_, action) => {
      await Promise.all(['overview', 'resources', 'batches', 'plans'].map((queryKey) => queryClient.invalidateQueries({ queryKey: [queryKey] })))
      onComplete(`${sensorSimulationMessages[action]} untuk ${resource.code}`)
    },
  })
  const simulated = resource.code.startsWith('SIM-S-')
  const simulationEligible = Boolean(resource.assignment) && resource.provisioningStatus === 'PROVISIONED'

  async function refresh() {
    setRefreshing(true)
    try {
      await Promise.all([
        readings.refetch(),
        queryClient.refetchQueries({ queryKey: ['resources', 'sensors'], exact: true }),
      ])
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><Cpu size={20} /></ResourceIcon><ResourceStatusBadge status={resource.connectivityStatus} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.code}</h3><p className="mt-1.5 text-xs text-muted-foreground">{resource.deviceUid}</p></div>
      <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-foreground">100 pembacaan tersimpan terbaru</span><Button variant="outline" size="sm" type="button" onClick={refresh} disabled={refreshing || resource.provisioningStatus !== 'PROVISIONED'}><RefreshCw className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Memuat ulang…' : 'Muat ulang'}</Button></div>
      <TemperatureHistory readings={readings.data} pending={readings.isFetching && !readings.data} error={readings.isError} />
      {resource.connectivityStatus === 'OFFLINE' && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Sensor luring, perekaman lokal mungkin tetap berlangsung.</p>}
      {readings.isError && readings.data && <p className="text-xs text-amber-800" role="status">Data terakhir tetap ditampilkan, tetapi pembaruan terbaru gagal dimuat.</p>}
      {resource.connectivityStatus === 'SYNCING' && <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">Menyinkronkan {resource.pendingReadingCount.toLocaleString('id-ID')} pembacaan lokal tersisa.</p>}
      <div className="flex items-end justify-between gap-3 border-t border-border pt-3"><span className="text-xs font-medium text-muted-foreground">Suhu terbaru</span><strong className="text-2xl font-bold tracking-[-.035em] tabular-nums">{latest ? `${latest.temperatureC.toFixed(1)}°C` : '—'}</strong></div>
      <dl className="grid gap-2 rounded-lg bg-muted/60 p-3">{[['Provisi', labels[resource.provisioningStatus]], ['Penugasan', resource.assignment?.batchCode ?? 'Belum ditugaskan'], ['Pengukuran terbaru', latest ? new Date(latest.measuredAt).toLocaleString('id-ID') : 'Belum pernah'], ['Sinkronisasi terakhir', resource.assignment?.lastSyncedAt ? new Date(resource.assignment.lastSyncedAt).toLocaleString('id-ID') : 'Belum pernah'], ['Unggahan terbaru', latest ? new Date(latest.receivedAt).toLocaleString('id-ID') : 'Belum pernah'], ['Komunikasi terakhir', resource.lastSeenAt ? new Date(resource.lastSeenAt).toLocaleString('id-ID') : 'Belum pernah']].map(([label, value]) => <div className="flex items-center justify-between gap-3 text-xs" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 truncate font-semibold text-foreground" title={value}>{value}</dd></div>)}</dl>
      {simulation.isError && <p className="text-xs text-red-700" role="alert">{apiError(simulation.error)}</p>}
      <div className="mt-auto -mx-5 -mb-5 grid grid-cols-2 gap-2 border-t border-border p-3 px-5">
        <Button className="col-span-2 w-full" variant="secondary" size="sm" type="button" onClick={onAssignment} disabled={resource.provisioningStatus !== 'PROVISIONED'}><Unplug />{resource.assignment ? 'Akhiri penugasan' : 'Tugaskan sensor'}</Button>
        {simulated && <><Button className="min-w-0" variant="outline" size="sm" type="button" onClick={() => simulation.mutate('excursion')} disabled={!simulationEligible || simulation.isPending}><AlertTriangle />{simulation.isPending && simulation.variables === 'excursion' ? 'Menyimulasikan…' : 'Penyimpangan'}</Button>
        <Button className="min-w-0" variant="outline" size="sm" type="button" onClick={() => simulation.mutate('recovery')} disabled={!simulationEligible || simulation.isPending}><ThermometerSnowflake />{simulation.isPending && simulation.variables === 'recovery' ? 'Memulihkan…' : 'Pemulihan'}</Button>
        {simulationEligible && resource.connectivityStatus !== 'OFFLINE' && <Button className="col-span-2 w-full" variant="outline" size="sm" type="button" onClick={() => simulation.mutate('offline')} disabled={simulation.isPending}><WifiOff />{simulation.isPending && simulation.variables === 'offline' ? 'Mengubah ke luring…' : 'Luring'}</Button>}</>}
        {!simulated && simulationEligible && (resource.connectivityStatus === 'OFFLINE'
          ? <Button className="col-span-2 w-full" variant="outline" size="sm" type="button" onClick={() => simulation.mutate('reconnect')} disabled={simulation.isPending}><Wifi />{simulation.isPending ? 'Menyambungkan…' : 'Sambungkan kembali'}</Button>
          : <Button className="col-span-2 w-full" variant="outline" size="sm" type="button" onClick={() => simulation.mutate('offline')} disabled={simulation.isPending}><WifiOff />{simulation.isPending ? 'Memutus telemetri…' : 'Luring'}</Button>)}
        <Button className={cn('min-w-0', !simulated && 'col-span-2')} variant="destructive-outline" size="sm" type="button" onClick={onDelete}><Trash2 />Hapus</Button>
      </div>
    </article>
  )
}

function TemperatureHistory({ readings, pending, error }) {
  if (pending) return <div className="h-28 animate-pulse rounded-lg bg-muted" role="status"><span className="sr-only">Memuat riwayat suhu</span></div>
  if (error) return <div className="grid h-28 place-items-center rounded-lg bg-red-50 px-4 text-center text-xs font-medium text-red-700" role="alert">Riwayat suhu tidak tersedia. Gunakan Muat ulang untuk mencoba lagi.</div>
  if (!readings?.length) return <div className="grid h-28 place-items-center rounded-lg bg-muted/60 px-4 text-center text-xs text-muted-foreground">Belum ada pembacaan yang ditugaskan</div>

  const width = 300
  const height = 92
  const padding = 8
  const temperatures = readings.map(({ temperatureC }) => temperatureC)
  const minimum = Math.min(...temperatures)
  const maximum = Math.max(...temperatures)
  const range = maximum - minimum || 1
  const firstTime = Date.parse(readings[0].measuredAt)
  const lastTime = Date.parse(readings.at(-1).measuredAt)
  const timeRange = lastTime - firstTime
  const points = readings.map((reading, index) => {
    const x = padding + (width - padding * 2) * (timeRange ? (Date.parse(reading.measuredAt) - firstTime) / timeRange : readings.length === 1 ? 0.5 : index / (readings.length - 1))
    const y = maximum === minimum ? height / 2 : padding + (height - padding * 2) * (1 - (reading.temperatureC - minimum) / range)
    return `${x},${y}`
  }).join(' ')
  const time = (value) => new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return <figure className="rounded-lg bg-muted/60 px-3 pt-3 pb-2">
    <svg className="h-23 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${readings.length} pembacaan suhu dari ${minimum.toFixed(1)} hingga ${maximum.toFixed(1)} derajat Celsius`}>
      <title>Riwayat suhu</title>
      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" className="text-border" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      {readings.length === 1 ? <circle cx={width / 2} cy={height / 2} r="3.5" className="fill-primary" vectorEffect="non-scaling-stroke" /> : <polyline points={points} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
    </svg>
    <figcaption className="mt-1 flex justify-between text-[10px] font-medium tabular-nums text-muted-foreground"><span>{time(readings[0].measuredAt)}</span><span>{time(readings.at(-1).measuredAt)}</span></figcaption>
  </figure>
}

export function ResourcesPage() {
  const [type, setType] = useState('cold-storages')
  const [dialogResource, setDialogResource] = useState(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [provisioningOpen, setProvisioningOpen] = useState(false)
  const [sensorAction, setSensorAction] = useState(null)
  const [deleteResourceState, setDeleteResourceState] = useState(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef()
  const dialogTrigger = useRef(null)
  const query = useQuery({ queryKey: ['resources', type], queryFn: () => listResources(type), refetchInterval: type === 'sensors' ? 3_000 : false })
  const readiness = useQuery({ queryKey: ['resources', 'readiness'], queryFn: getSetupReadiness })
  const tabByReadinessKey = { coldStorages: 'cold-storages', vehicles: 'vehicles', destinations: 'destinations', sensors: 'sensors' }
  const isColdStorage = type === 'cold-storages'
  const isVehicle = type === 'vehicles'
  const isDestination = type === 'destinations'
  const resourceLabel = isColdStorage ? 'penyimpanan dingin' : isVehicle ? 'truk' : isDestination ? 'tujuan' : 'sensor'

  useEffect(() => () => window.clearTimeout(noticeTimer.current), [])

  function complete(message) {
    window.clearTimeout(noticeTimer.current)
    setNotice(message)
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3500)
  }

  function openDialog(resource, trigger) {
    dialogTrigger.current = trigger
    setDialogResource(resource)
    setDialogOpen(true)
  }

  function openCreate(trigger) {
    dialogTrigger.current = trigger
    if (type === 'sensors') setProvisioningOpen(true)
    else openDialog(undefined, trigger)
  }

  function remove(resource, trigger) {
    dialogTrigger.current = trigger
    setDeleteResourceState({ resource, type })
  }

  function openSensorAction(action, sensor, trigger) {
    dialogTrigger.current = trigger
    setSensorAction({ type: action, sensor })
  }

  function closeAndRestore(close) {
    close()
    window.requestAnimationFrame(() => dialogTrigger.current?.focus())
  }

  return (
    <div className="mx-auto w-full max-w-[1180px] px-8 pt-12 pb-7 max-[780px]:px-4 max-[780px]:py-6">
      <PageHeader title="Sumber Daya" description="Kelola sumber daya operasional yang dapat digunakan SIRIP." action={<Button type="button" onClick={(event) => openCreate(event.currentTarget)}><Plus />{type === 'sensors' ? 'Provisi sensor' : `Tambah ${resourceLabel}`}</Button>} />

      {readiness.isSuccess && !readiness.data.ready && <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4" aria-label="Progres penyiapan"><div className="flex items-center justify-between gap-4 max-[560px]:items-stretch max-[560px]:flex-col"><div><span className="text-[10px] font-bold tracking-[.08em] text-primary uppercase">Progres penyiapan</span><strong className="mt-1 block text-sm">{readiness.data.completedSteps} dari {readiness.data.totalSteps} selesai</strong></div><div className="h-2 w-full max-w-70 overflow-hidden rounded-full bg-primary/15 max-[560px]:max-w-none" role="progressbar" aria-label="Progres penyiapan" aria-valuemin="0" aria-valuemax={readiness.data.totalSteps} aria-valuenow={readiness.data.completedSteps}><span className="block h-full rounded-full bg-primary" style={{ width: `${readiness.data.completedSteps / readiness.data.totalSteps * 100}%` }} /></div></div><div className="mt-3 grid grid-cols-4 gap-2 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">{readiness.data.steps.map((step) => <Button key={step.key} className="justify-start bg-white" variant="outline" size="sm" type="button" onClick={() => setType(tabByReadinessKey[step.key])}><span className={cn('grid size-5 place-items-center rounded-full text-[10px]', step.complete ? 'bg-green-600 text-white' : 'bg-primary/10 text-primary')}>{step.complete ? <Check size={13} /> : step.count}</span>{setupStepLabels[step.key] ?? step.label}</Button>)}</div></section>}

      <Tabs value={type} onValueChange={setType}>
        <div className="mb-5 rounded-xl border border-border bg-card p-1">
          <TabsList className="grid !h-auto w-full grid-cols-2 bg-transparent p-0 min-[560px]:!h-11 min-[560px]:grid-cols-4" aria-label="Jenis sumber daya">
            {tabs.map(({ id, label, icon: Icon }) => <TabsTrigger className="min-h-11 gap-2 px-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none after:hidden min-[560px]:min-h-0" key={id} value={id}><Icon size={17} />{label}</TabsTrigger>)}
          </TabsList>
        </div>

        {tabs.map(({ id }) => <TabsContent value={id} className="mt-0" key={id}>
          {id === type && <>
          {query.isPending && <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground" role="status">Memuat sumber daya…</div>}
          {query.isError && <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50/40 px-5 text-center" role="alert"><strong className="text-sm text-foreground">Sumber daya tidak dapat dimuat</strong><span className="max-w-sm text-xs text-muted-foreground">{apiError(query.error)}</span><Button className="mt-2" variant="outline" type="button" onClick={() => query.refetch()}>Coba lagi</Button></div>}
           {query.isSuccess && !query.data.length && <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/50 px-5 text-center" role="status"><ResourceIcon>{isColdStorage ? <Snowflake size={22} /> : isVehicle ? <Truck size={22} /> : isDestination ? <MapPin size={22} /> : <Cpu size={22} />}</ResourceIcon><strong className="mt-1 text-sm text-foreground">Belum ada {resourceLabel} yang dikonfigurasi</strong><span className="max-w-sm text-xs text-muted-foreground">Tambahkan semua sumber daya yang dapat digunakan dalam operasi Anda.</span><Button className="mt-2" type="button" onClick={(event) => openCreate(event.currentTarget)}><Plus />{type === 'sensors' ? 'Provisi sensor pertama' : 'Tambah sumber daya pertama'}</Button></div>}
          {query.isSuccess && query.data.length > 0 && (
            <Appear className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1" key={type} stagger="[data-animate-card]">
          {query.data.map((resource) => isColdStorage
            ? <ColdStorageCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} />
            : isVehicle
              ? <VehicleCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} />
              : isDestination
                ? <DestinationCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} />
                  : <SensorCard key={resource.id} resource={resource} onDelete={(event) => remove(resource, event.currentTarget)} onAssignment={(event) => openSensorAction('assignment', resource, event.currentTarget)} onComplete={complete} />)}
            </Appear>
          )}
          </>}
        </TabsContent>)}
      </Tabs>

      <div className={notice ? 'fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-70 flex min-h-11 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 text-xs font-semibold text-green-800 shadow-[0_12px_35px_rgb(2_40_88_/_14%)]' : 'sr-only'} role="status" aria-live="polite">{notice && <><Check size={16} />{notice}</>}</div>
      {dialogOpen && <ResourceDialog type={type} resource={dialogResource} onClose={() => closeAndRestore(() => setDialogOpen(false))} onComplete={complete} />}
      {provisioningOpen && <SensorProvisioningDialog onClose={() => closeAndRestore(() => setProvisioningOpen(false))} onComplete={complete} />}
      {sensorAction?.type === 'assignment' && <AssignmentDialog sensor={sensorAction.sensor} onClose={() => closeAndRestore(() => setSensorAction(null))} onComplete={complete} />}
      {deleteResourceState && <DeleteDialog resource={deleteResourceState.resource} type={deleteResourceState.type} onClose={() => closeAndRestore(() => setDeleteResourceState(null))} onComplete={complete} />}
    </div>
  )
}
