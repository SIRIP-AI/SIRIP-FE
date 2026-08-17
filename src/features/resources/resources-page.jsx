import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Bluetooth, Check, Clock3, Cpu, MapPin, Pencil, Plus, Snowflake, Trash2, Truck, Unplug } from 'lucide-react'

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
  getSensorDiagnostics,
  getSetupReadiness,
  listResources,
  listSensorAssignmentOptions,
  saveResource,
  sensorInputSchema,
  sensorProvisioningStatuses,
  unassignSensor,
  vehicleInputSchema,
  resourceOperationalStatuses,
} from '@/features/resources/resources-api.js'
import { cn } from '@/lib/utils.js'

const tabs = [
  { id: 'cold-storages', label: 'Cold Storage', icon: Snowflake },
  { id: 'vehicles', label: 'Trucks', icon: Truck },
  { id: 'destinations', label: 'Destinations', icon: MapPin },
  { id: 'sensors', label: 'Sensors', icon: Cpu },
]

const labels = {
  AVAILABLE: 'Available',
  FULL: 'Full',
  UNAVAILABLE: 'Unavailable',
  ASSIGNED: 'Assigned',
  PENDING: 'Pending',
  PROVISIONED: 'Provisioned',
  ONLINE: 'Online',
  OFFLINE: 'Offline',
  ERROR: 'Error',
  NEVER_CONNECTED: 'Never connected',
}

const tones = {
  AVAILABLE: 'healthy',
  FULL: 'warning',
  ASSIGNED: 'neutral',
  UNAVAILABLE: 'critical',
  PENDING: 'warning',
  PROVISIONED: 'healthy',
  ONLINE: 'healthy',
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
  const isDestination = type === 'destinations'
  const title = `${resource ? 'Edit' : 'Add'} ${isColdStorage ? 'cold storage' : isVehicle ? 'truck' : isDestination ? 'destination' : 'sensor'}`
  const mutation = useMutation({
    mutationFn: (input) => saveResource(type, { ...input, id: resource?.id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['resources', type] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'readiness'] }),
      ])
      onComplete(resource ? 'Resource updated' : 'Resource added')
      onClose()
    },
  })

  function submit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const input = isColdStorage ? {
      name: form.get('name'),
      capacityKg: numericValue(form, 'capacityKg'),
      availableCapacityKg: numericValue(form, 'availableCapacityKg'),
      operationalStatus: form.get('operationalStatus'),
    } : isVehicle ? {
      code: form.get('code'),
      capacityKg: numericValue(form, 'capacityKg'),
      operationalStatus: form.get('operationalStatus'),
      restriction: form.get('restriction')?.trim() || null,
      availabilityStart: form.get('availabilityStart') || null,
      availabilityEnd: form.get('availabilityEnd') || null,
    } : isDestination ? {
      name: form.get('name'),
      address: form.get('address'),
      travelMinutes: numericValue(form, 'travelMinutes'),
      receivingStart: form.get('receivingStart'),
      receivingEnd: form.get('receivingEnd'),
      status: form.get('status'),
      notes: form.get('notes')?.trim() || null,
    } : {
      code: form.get('code'),
      deviceUid: form.get('deviceUid'),
      provisioningStatus: form.get('provisioningStatus'),
    }
    const schema = isColdStorage ? coldStorageInputSchema : isVehicle ? vehicleInputSchema : isDestination ? destinationInputSchema : sensorInputSchema
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
        <DialogHeading eyebrow="Resource" title={title} />
        <DialogDescription className="sr-only">Configure the selected operational resource.</DialogDescription>

        {isColdStorage ? (
          <>
            <FormField label="Name" htmlFor="resource-name" error={errors.name}><Input className="h-10" id="resource-name" name="name" defaultValue={resource?.name ?? ''} placeholder="Cold Room 1" autoFocus required aria-invalid={Boolean(errors.name)} /></FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Total capacity (kg)" htmlFor="capacity-kg" error={errors.capacityKg}><Input className="h-10" id="capacity-kg" name="capacityKg" type="number" min="0.01" step="0.01" defaultValue={resource?.capacityKg ?? ''} required aria-invalid={Boolean(errors.capacityKg)} /></FormField>
              <FormField label="Available capacity (kg)" htmlFor="available-capacity-kg" error={errors.availableCapacityKg}><Input className="h-10" id="available-capacity-kg" name="availableCapacityKg" type="number" min="0" step="0.01" defaultValue={resource?.availableCapacityKg ?? ''} required aria-invalid={Boolean(errors.availableCapacityKg)} /></FormField>
            </div>
            <FormField label="Operational status" htmlFor="storage-status" error={errors.operationalStatus} help={resource?.status === 'FULL' ? 'Status cannot be changed while storage is full.' : undefined}><ResourceSelect id="storage-status" name={resource?.status === 'FULL' ? undefined : 'operationalStatus'} defaultValue={resource?.operationalStatus ?? 'AVAILABLE'} disabled={resource?.status === 'FULL'} options={resourceOperationalStatuses} ariaInvalid={Boolean(errors.operationalStatus)} />{resource?.status === 'FULL' && <input name="operationalStatus" type="hidden" value={resource.operationalStatus} />}</FormField>
          </>
        ) : isVehicle ? (
          <>
            <FormField label="Truck ID" htmlFor="truck-code" error={errors.code}><Input className="h-10" id="truck-code" name="code" defaultValue={resource?.code ?? ''} placeholder="TR-02" autoFocus required aria-invalid={Boolean(errors.code)} /></FormField>
            <FormField label="Capacity (kg)" htmlFor="truck-capacity" error={errors.capacityKg}><Input className="h-10" id="truck-capacity" name="capacityKg" type="number" min="0.01" step="0.01" defaultValue={resource?.capacityKg ?? ''} required aria-invalid={Boolean(errors.capacityKg)} /></FormField>
            <FormField label="Restriction" htmlFor="truck-restriction" error={errors.restriction}><Textarea id="truck-restriction" name="restriction" defaultValue={resource?.restriction ?? ''} placeholder="Road, loading, or operational restriction" maxLength="500" aria-invalid={Boolean(errors.restriction)} /></FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Available from" htmlFor="availability-start" error={errors.availabilityStart}><Input className="h-10" id="availability-start" name="availabilityStart" type="time" defaultValue={resource?.availabilityStart ?? ''} aria-invalid={Boolean(errors.availabilityStart)} /></FormField>
              <FormField label="Available until" htmlFor="availability-end" error={errors.availabilityEnd}><Input className="h-10" id="availability-end" name="availabilityEnd" type="time" defaultValue={resource?.availabilityEnd ?? ''} aria-invalid={Boolean(errors.availabilityEnd)} /></FormField>
            </div>
            <FormField label="Operational status" htmlFor="vehicle-status" error={errors.operationalStatus}><ResourceSelect id="vehicle-status" name="operationalStatus" defaultValue={resource?.operationalStatus ?? 'AVAILABLE'} options={resourceOperationalStatuses} ariaInvalid={Boolean(errors.operationalStatus)} /></FormField>
          </>
        ) : isDestination ? (
          <>
            <FormField label="Processor name" htmlFor="destination-name" error={errors.name}><Input className="h-10" id="destination-name" name="name" defaultValue={resource?.name ?? ''} placeholder="Processor A" autoFocus required aria-invalid={Boolean(errors.name)} /></FormField>
            <FormField label="Location" htmlFor="destination-address" error={errors.address}><Input className="h-10" id="destination-address" name="address" defaultValue={resource?.address ?? ''} placeholder="Tanjung Perak, Surabaya" required aria-invalid={Boolean(errors.address)} /></FormField>
            <FormField label="Travel time (minutes)" htmlFor="travel-minutes" error={errors.travelMinutes}><Input className="h-10" id="travel-minutes" name="travelMinutes" type="number" min="0" step="1" defaultValue={resource?.travelMinutes ?? ''} required aria-invalid={Boolean(errors.travelMinutes)} /></FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Receiving starts" htmlFor="receiving-start" error={errors.receivingStart}><Input className="h-10" id="receiving-start" name="receivingStart" type="time" defaultValue={resource?.receivingStart ?? '08:00'} required aria-invalid={Boolean(errors.receivingStart)} /></FormField>
              <FormField label="Receiving ends" htmlFor="receiving-end" error={errors.receivingEnd}><Input className="h-10" id="receiving-end" name="receivingEnd" type="time" defaultValue={resource?.receivingEnd ?? '16:00'} required aria-invalid={Boolean(errors.receivingEnd)} /></FormField>
            </div>
            <FormField label="Notes" htmlFor="destination-notes" error={errors.notes}><Textarea id="destination-notes" name="notes" defaultValue={resource?.notes ?? ''} placeholder="Simple receiving constraints" maxLength="500" aria-invalid={Boolean(errors.notes)} /></FormField>
            <FormField label="Status" htmlFor="destination-status" error={errors.status}><ResourceSelect id="destination-status" name="status" defaultValue={resource?.status ?? 'AVAILABLE'} options={destinationStatuses} ariaInvalid={Boolean(errors.status)} /></FormField>
          </>
        ) : (
          <>
            <FormField label="Sensor ID" htmlFor="sensor-code" error={errors.code}><Input className="h-10" id="sensor-code" name="code" defaultValue={resource?.code ?? ''} placeholder="S-003" autoFocus required aria-invalid={Boolean(errors.code)} /></FormField>
            <FormField label="Device UID" htmlFor="device-uid" error={errors.deviceUid}><Input className="h-10" id="device-uid" name="deviceUid" defaultValue={resource?.deviceUid ?? ''} placeholder="esp32-s-003" required aria-invalid={Boolean(errors.deviceUid)} /></FormField>
            <FormField label="Provisioning status" htmlFor="provisioning-status" error={errors.provisioningStatus}><ResourceSelect id="provisioning-status" name="provisioningStatus" defaultValue={resource?.provisioningStatus ?? 'PENDING'} options={sensorProvisioningStatuses} ariaInvalid={Boolean(errors.provisioningStatus)} /></FormField>
            <p className="flex gap-3 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-slate-600"><Bluetooth className="shrink-0 text-primary" size={16} />Configure Wi-Fi on the ESP32 over BLE, then mark it provisioned after connectivity is confirmed.</p>
          </>
        )}

        {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save resource'}</Button></DialogFooter>
        </form>
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
  return <ResourceActions><Button variant="outline" size="sm" type="button" onClick={onEdit}><Pencil />Edit</Button><Button variant="destructive-outline" size="sm" type="button" onClick={onDelete}><Trash2 />Delete</Button></ResourceActions>
}

function ColdStorageCard({ resource, onEdit, onDelete }) {
  const usedPercent = Math.min(100, Math.max(0, Math.round((1 - resource.availableCapacityKg / resource.capacityKg) * 100)))
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><Snowflake size={20} /></ResourceIcon><ResourceStatusBadge status={resource.status} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.name}</h3><p className="mt-1.5 text-xs text-muted-foreground">{resource.capacityKg.toLocaleString()} kg total capacity</p></div>
      <div><div className="flex items-baseline gap-2"><strong className="text-xl tracking-[-.03em]">{resource.availableCapacityKg.toLocaleString()} kg</strong><span className="text-xs text-muted-foreground">available</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Capacity used" aria-valuemin="0" aria-valuemax="100" aria-valuenow={usedPercent}><span className="block h-full rounded-full bg-primary" style={{ width: `${usedPercent}%` }} /></div></div>
      <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function VehicleCard({ resource, onEdit, onDelete }) {
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><Truck size={20} /></ResourceIcon><ResourceStatusBadge status={resource.status} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.code}</h3><p className="mt-1.5 text-xs text-muted-foreground">{resource.capacityKg.toLocaleString()} kg load capacity</p></div>
      <div className="flex min-h-10 items-start gap-2 text-xs leading-relaxed text-slate-600"><Clock3 className="mt-0.5 shrink-0 text-muted-foreground" size={16} /><span>{resource.availabilityStart ? `Available ${resource.availabilityStart}–${resource.availabilityEnd}` : 'No availability window configured'}{resource.delayMinutes > 0 && ` · Delayed ${resource.delayMinutes} min`}{resource.restriction && ` · ${resource.restriction}`}</span></div>
      <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

function DestinationCard({ resource, onEdit, onDelete }) {
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><MapPin size={20} /></ResourceIcon><ResourceStatusBadge status={resource.status} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.name}</h3><p className="mt-1.5 text-xs text-muted-foreground">{resource.address}</p></div>
      <div className="grid grid-cols-[1fr_1.35fr] gap-2"><span className="rounded-lg bg-muted/70 p-2.5 text-[10px] text-muted-foreground"><strong className="mb-1 block text-xs text-foreground">{resource.travelMinutes} min</strong>travel</span><span className="rounded-lg bg-muted/70 p-2.5 text-[10px] text-muted-foreground"><strong className="mb-1 block text-xs text-foreground">{resource.receivingStart}–{resource.receivingEnd}</strong>receiving</span></div>
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
      ])
      onComplete(sensor.assignment ? 'Sensor assignment ended' : 'Sensor assigned')
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
        <DialogHeading eyebrow="Sensor assignment" title={sensor.code} />
        <DialogDescription className="sr-only">Assign this sensor to an active unmonitored batch.</DialogDescription>
        {sensor.assignment ? <p className="text-sm leading-relaxed text-slate-600">End monitoring for <strong>{sensor.assignment.batchCode}</strong>? The session remains in history and the sensor becomes available again.</p> : options.isPending ? <p className="text-sm text-muted-foreground" role="status">Loading available batches…</p> : options.isError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(options.error)}</p> : options.data.length ? <FormField label="Batch" htmlFor="batch-code"><Select name="batchCode" defaultValue={options.data[0].code}><SelectTrigger id="batch-code" className="h-10 w-full bg-white px-3 text-sm"><SelectValue /></SelectTrigger><SelectContent position="popper">{options.data.map((batch) => <SelectItem key={batch.id} value={batch.code}>{batch.code} · {batch.weightKg} kg · Grade {batch.grade}</SelectItem>)}</SelectContent></Select></FormField> : <p className="text-sm text-muted-foreground">No active unmonitored batches are available.</p>}
        {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending || (!sensor.assignment && !options.data?.length)}>{mutation.isPending ? 'Saving…' : sensor.assignment ? 'End assignment' : 'Assign sensor'}</Button></DialogFooter>
      </form>
      </ResourceDialogContent>
    </Dialog>
  )
}

function DiagnosticsDialog({ sensor, onClose }) {
  const query = useQuery({ queryKey: ['resources', 'sensor-diagnostics', sensor.id], queryFn: () => getSensorDiagnostics(sensor.id) })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ResourceDialogContent className="grid gap-4">
        <DialogHeading eyebrow="Diagnostics" title={sensor.code} />
        <DialogDescription className="sr-only">Latest sensor connectivity, session, synchronization, and temperature details.</DialogDescription>
        {query.isPending ? <p className="text-sm text-muted-foreground" role="status">Loading diagnostics…</p> : query.isError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(query.error)}</p> : <dl className="grid grid-cols-2 gap-2">{[['Connectivity', <ResourceStatusBadge key="status" status={query.data.sensor.connectivityStatus} />], ['Last communication', query.data.sensor.lastSeenAt ? new Date(query.data.sensor.lastSeenAt).toLocaleString() : 'Never'], ['Session', query.data.sessionStatus ?? 'None'], ['Last sync', query.data.lastSyncedAt ? new Date(query.data.lastSyncedAt).toLocaleString() : 'Never'], ['Latest temperature', query.data.latestReading ? `${query.data.latestReading.temperatureC}°C` : 'No readings received']].map(([label, value], index) => <div className={cn('flex min-h-18 flex-col items-start justify-center gap-2 rounded-lg border p-3', index === 4 && 'col-span-2')} key={label}><dt className="text-[10px] text-muted-foreground">{label}</dt><dd className="text-xs font-semibold">{value}</dd></div>)}</dl>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button type="button" onClick={onClose}>Done</Button></DialogFooter>
      </ResourceDialogContent>
    </Dialog>
  )
}

function BleDialog({ sensor, onClose }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ResourceDialogContent className="grid gap-4">
        <DialogHeading eyebrow="Manual BLE sync" title={sensor.code} />
        <DialogDescription className="sr-only">Guidance for manually synchronizing this sensor over Bluetooth.</DialogDescription>
        <div className="flex gap-3 rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-slate-600"><Bluetooth className="shrink-0 text-primary" size={24} /><div><strong className="text-foreground">Device connection required</strong><p className="mt-1">Bring this browser device near the ESP32. Manual sync will be enabled when the firmware BLE service and secure pairing protocol are available.</p></div></div>
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button type="button" onClick={onClose}>Done</Button></DialogFooter>
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
      ])
      onComplete('Resource deleted')
      onClose()
    },
  })
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ResourceDialogContent className="grid gap-4">
        <DialogHeading eyebrow="Delete resource" title={name} />
        <DialogDescription className="text-sm leading-relaxed text-slate-600">This removes the resource. Resources referenced by operational history cannot be deleted.</DialogDescription>
        {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{apiError(mutation.error)}</p>}
        <DialogFooter className="mt-1 -mx-6 -mb-6 p-4 sm:px-6"><Button variant="outline" type="button" onClick={onClose}>Cancel</Button><Button variant="destructive" type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Deleting…' : 'Delete resource'}</Button></DialogFooter>
      </ResourceDialogContent>
    </Dialog>
  )
}

function SensorCard({ resource, onEdit, onDelete, onAssignment, onDiagnostics, onBleSync }) {
  return (
    <article className={cardClass} data-animate-card>
      <div className="flex items-center justify-between gap-3"><ResourceIcon><Cpu size={20} /></ResourceIcon><ResourceStatusBadge status={resource.connectivityStatus} /></div>
      <div><h3 className="text-lg font-bold tracking-[-.025em]">{resource.code}</h3><p className="mt-1.5 text-xs text-muted-foreground">{resource.deviceUid}</p></div>
      <dl className="grid gap-2 rounded-lg bg-muted/60 p-3">{[['Provisioning', labels[resource.provisioningStatus]], ['Assignment', resource.assignment?.batchCode ?? 'Unassigned'], ['Last seen', resource.lastSeenAt ? new Date(resource.lastSeenAt).toLocaleString() : 'Never']].map(([label, value]) => <div className="flex items-center justify-between gap-3 text-xs" key={label}><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 truncate font-semibold text-foreground" title={value}>{value}</dd></div>)}</dl>
      <div className="mt-auto grid gap-2"><Button className="w-full" variant="secondary" size="sm" type="button" onClick={onAssignment}><Unplug />{resource.assignment ? 'End assignment' : 'Assign sensor'}</Button><div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" type="button" onClick={onDiagnostics}><Activity />Diagnostics</Button><Button variant="outline" size="sm" type="button" onClick={onBleSync}><Bluetooth />BLE sync</Button></div></div>
      <EditDeleteActions onEdit={onEdit} onDelete={onDelete} />
    </article>
  )
}

export function ResourcesPage() {
  const [type, setType] = useState('cold-storages')
  const [dialogResource, setDialogResource] = useState(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sensorAction, setSensorAction] = useState(null)
  const [deleteResourceState, setDeleteResourceState] = useState(null)
  const [notice, setNotice] = useState('')
  const noticeTimer = useRef()
  const dialogTrigger = useRef(null)
  const query = useQuery({ queryKey: ['resources', type], queryFn: () => listResources(type) })
  const readiness = useQuery({ queryKey: ['resources', 'readiness'], queryFn: getSetupReadiness })
  const tabByReadinessKey = { coldStorages: 'cold-storages', vehicles: 'vehicles', destinations: 'destinations', sensors: 'sensors' }
  const isColdStorage = type === 'cold-storages'
  const isVehicle = type === 'vehicles'
  const isDestination = type === 'destinations'
  const resourceLabel = isColdStorage ? 'cold storage' : isVehicle ? 'truck' : isDestination ? 'destination' : 'sensor'

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
      <PageHeader title="Resources" description="Manage the operational resources SIRIP is allowed to use." action={<Button type="button" onClick={(event) => openDialog(undefined, event.currentTarget)}><Plus />Add {resourceLabel}</Button>} />

      {readiness.isSuccess && !readiness.data.ready && <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4" aria-label="Setup progress"><div className="flex items-center justify-between gap-4 max-[560px]:items-stretch max-[560px]:flex-col"><div><span className="text-[10px] font-bold tracking-[.08em] text-primary uppercase">Setup progress</span><strong className="mt-1 block text-sm">{readiness.data.completedSteps} of {readiness.data.totalSteps} complete</strong></div><div className="h-2 w-full max-w-70 overflow-hidden rounded-full bg-primary/15 max-[560px]:max-w-none" role="progressbar" aria-label="Setup progress" aria-valuemin="0" aria-valuemax={readiness.data.totalSteps} aria-valuenow={readiness.data.completedSteps}><span className="block h-full rounded-full bg-primary" style={{ width: `${readiness.data.completedSteps / readiness.data.totalSteps * 100}%` }} /></div></div><div className="mt-3 grid grid-cols-4 gap-2 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">{readiness.data.steps.map((step) => <Button key={step.key} className="justify-start bg-white" variant="outline" size="sm" type="button" onClick={() => setType(tabByReadinessKey[step.key])}><span className={cn('grid size-5 place-items-center rounded-full text-[10px]', step.complete ? 'bg-green-600 text-white' : 'bg-primary/10 text-primary')}>{step.complete ? <Check size={13} /> : step.count}</span>{step.label}</Button>)}</div></section>}

      <Tabs value={type} onValueChange={setType}>
        <div className="mb-5 overflow-x-auto rounded-xl border border-border bg-card p-1">
          <TabsList className="grid h-11 min-w-[520px] w-full grid-cols-4 bg-transparent p-0" aria-label="Resource type">
            {tabs.map(({ id, label, icon: Icon }) => <TabsTrigger className="h-full gap-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none after:hidden" key={id} value={id}><Icon size={17} />{label}</TabsTrigger>)}
          </TabsList>
        </div>

        {tabs.map(({ id }) => <TabsContent value={id} className="mt-0" key={id}>
          {id === type && <>
          {query.isPending && <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 text-sm text-muted-foreground" role="status">Loading resources…</div>}
          {query.isError && <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-red-200 bg-red-50/40 px-5 text-center" role="alert"><strong className="text-sm text-foreground">Could not load resources</strong><span className="max-w-sm text-xs text-muted-foreground">{apiError(query.error)}</span><Button className="mt-2" variant="outline" type="button" onClick={() => query.refetch()}>Try again</Button></div>}
          {query.isSuccess && !query.data.length && <div className="flex min-h-72 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white/50 px-5 text-center" role="status"><ResourceIcon>{isColdStorage ? <Snowflake size={22} /> : isVehicle ? <Truck size={22} /> : isDestination ? <MapPin size={22} /> : <Cpu size={22} />}</ResourceIcon><strong className="mt-1 text-sm text-foreground">No {resourceLabel} configured</strong><span className="max-w-sm text-xs text-muted-foreground">Add every resource your operation can use.</span><Button className="mt-2" type="button" onClick={(event) => openDialog(undefined, event.currentTarget)}><Plus />Add first resource</Button></div>}
          {query.isSuccess && query.data.length > 0 && (
            <Appear className="grid grid-cols-3 gap-3.5 max-[1020px]:grid-cols-2 max-[640px]:grid-cols-1" key={type} stagger="[data-animate-card]">
          {query.data.map((resource) => isColdStorage
            ? <ColdStorageCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} />
            : isVehicle
              ? <VehicleCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} />
              : isDestination
                ? <DestinationCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} />
                : <SensorCard key={resource.id} resource={resource} onEdit={(event) => openDialog(resource, event.currentTarget)} onDelete={(event) => remove(resource, event.currentTarget)} onAssignment={(event) => openSensorAction('assignment', resource, event.currentTarget)} onDiagnostics={(event) => openSensorAction('diagnostics', resource, event.currentTarget)} onBleSync={(event) => openSensorAction('ble', resource, event.currentTarget)} />)}
            </Appear>
          )}
          </>}
        </TabsContent>)}
      </Tabs>

      <div className={notice ? 'fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] z-70 flex min-h-11 max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 text-xs font-semibold text-green-800 shadow-[0_12px_35px_rgb(2_40_88_/_14%)]' : 'sr-only'} role="status" aria-live="polite">{notice && <><Check size={16} />{notice}</>}</div>
      {dialogOpen && <ResourceDialog type={type} resource={dialogResource} onClose={() => closeAndRestore(() => setDialogOpen(false))} onComplete={complete} />}
      {sensorAction?.type === 'assignment' && <AssignmentDialog sensor={sensorAction.sensor} onClose={() => closeAndRestore(() => setSensorAction(null))} onComplete={complete} />}
      {sensorAction?.type === 'diagnostics' && <DiagnosticsDialog sensor={sensorAction.sensor} onClose={() => closeAndRestore(() => setSensorAction(null))} />}
      {sensorAction?.type === 'ble' && <BleDialog sensor={sensorAction.sensor} onClose={() => closeAndRestore(() => setSensorAction(null))} />}
      {deleteResourceState && <DeleteDialog resource={deleteResourceState.resource} type={deleteResourceState.type} onClose={() => closeAndRestore(() => setDeleteResourceState(null))} onComplete={complete} />}
    </div>
  )
}
