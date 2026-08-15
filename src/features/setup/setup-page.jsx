import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Bluetooth, Check, Clock3, Cpu, MapPin, Pencil, Plus, Snowflake, Trash2, Truck, Unplug } from 'lucide-react'

import { Appear } from '@/components/appear.jsx'
import {
  apiError,
  assignSensor,
  coldStorageInputSchema,
  coldStorageStatuses,
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
  vehicleStatuses,
} from '@/features/setup/setup-api.js'

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
  DELAYED: 'Delayed',
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
  DELAYED: 'warning',
  UNAVAILABLE: 'critical',
  PENDING: 'warning',
  PROVISIONED: 'healthy',
  ONLINE: 'healthy',
  OFFLINE: 'warning',
  ERROR: 'critical',
  NEVER_CONNECTED: 'neutral',
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${tones[status]}`}><span className="status-dot" />{labels[status]}</span>
}

function localDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

function ResourceDialog({ type, resource, onClose }) {
  const queryClient = useQueryClient()
  const dialogRef = useRef(null)
  const [errors, setErrors] = useState({})
  const isColdStorage = type === 'cold-storages'
  const isVehicle = type === 'vehicles'
  const isDestination = type === 'destinations'
  const title = `${resource ? 'Edit' : 'Add'} ${isColdStorage ? 'cold storage' : isVehicle ? 'truck' : isDestination ? 'destination' : 'sensor'}`
  const mutation = useMutation({
    mutationFn: (input) => saveResource(type, { ...input, id: resource?.id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setup', type] }),
        queryClient.invalidateQueries({ queryKey: ['setup', 'readiness'] }),
      ])
      onClose()
    },
  })

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = isColdStorage ? {
      name: form.get('name'),
      capacityKg: Number(form.get('capacityKg')),
      availableCapacityKg: Number(form.get('availableCapacityKg')),
      status: form.get('status'),
    } : isVehicle ? {
      code: form.get('code'),
      capacityKg: Number(form.get('capacityKg')),
      status: form.get('status'),
      delayMinutes: Number(form.get('delayMinutes')),
      restriction: form.get('restriction')?.trim() || null,
      availableFrom: form.get('availableFrom') ? new Date(form.get('availableFrom')).toISOString() : null,
    } : isDestination ? {
      name: form.get('name'),
      address: form.get('address'),
      travelMinutes: Number(form.get('travelMinutes')),
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
      return
    }
    setErrors({})
    mutation.mutate(result.data)
  }

  return (
    <dialog ref={dialogRef} className="resource-dialog" aria-labelledby="resource-dialog-title" onCancel={onClose} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="resource-form" onSubmit={submit}>
        <div className="dialog-heading">
          <div><span>Setup resource</span><h2 id="resource-dialog-title">{title}</h2></div>
          <button className="dialog-close" type="button" onClick={onClose} aria-label="Close dialog">×</button>
        </div>

        {isColdStorage ? (
          <>
            <label>Name<input name="name" defaultValue={resource?.name ?? ''} placeholder="Cold Room 1" autoFocus aria-invalid={Boolean(errors.name)} />{errors.name && <span>{errors.name}</span>}</label>
            <div className="form-grid">
              <label>Total capacity (kg)<input name="capacityKg" type="number" min="0.01" step="0.01" defaultValue={resource?.capacityKg ?? ''} aria-invalid={Boolean(errors.capacityKg)} />{errors.capacityKg && <span>{errors.capacityKg}</span>}</label>
              <label>Available capacity (kg)<input name="availableCapacityKg" type="number" min="0" step="0.01" defaultValue={resource?.availableCapacityKg ?? ''} aria-invalid={Boolean(errors.availableCapacityKg)} />{errors.availableCapacityKg && <span>{errors.availableCapacityKg}</span>}</label>
            </div>
            <label>Status<select name="status" defaultValue={resource?.status ?? 'AVAILABLE'}>{coldStorageStatuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
          </>
        ) : isVehicle ? (
          <>
            <label>Truck ID<input name="code" defaultValue={resource?.code ?? ''} placeholder="TR-02" autoFocus aria-invalid={Boolean(errors.code)} />{errors.code && <span>{errors.code}</span>}</label>
            <div className="form-grid">
              <label>Capacity (kg)<input name="capacityKg" type="number" min="0.01" step="0.01" defaultValue={resource?.capacityKg ?? ''} aria-invalid={Boolean(errors.capacityKg)} />{errors.capacityKg && <span>{errors.capacityKg}</span>}</label>
              <label>Delay (minutes)<input name="delayMinutes" type="number" min="0" step="1" defaultValue={resource?.delayMinutes ?? 0} aria-invalid={Boolean(errors.delayMinutes)} />{errors.delayMinutes && <span>{errors.delayMinutes}</span>}</label>
            </div>
            <label>Restriction<textarea name="restriction" defaultValue={resource?.restriction ?? ''} placeholder="Road, loading, or operational restriction" maxLength="500" aria-invalid={Boolean(errors.restriction)} />{errors.restriction && <span>{errors.restriction}</span>}</label>
            <label>Available from<input name="availableFrom" type="datetime-local" defaultValue={localDateTime(resource?.availableFrom)} aria-invalid={Boolean(errors.availableFrom)} />{errors.availableFrom && <span>{errors.availableFrom}</span>}</label>
            <label>Status<select name="status" defaultValue={resource?.status ?? 'AVAILABLE'}>{vehicleStatuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
          </>
        ) : isDestination ? (
          <>
            <label>Processor name<input name="name" defaultValue={resource?.name ?? ''} placeholder="Processor A" autoFocus aria-invalid={Boolean(errors.name)} />{errors.name && <span>{errors.name}</span>}</label>
            <label>Location<input name="address" defaultValue={resource?.address ?? ''} placeholder="Tanjung Perak, Surabaya" aria-invalid={Boolean(errors.address)} />{errors.address && <span>{errors.address}</span>}</label>
            <label>Travel time (minutes)<input name="travelMinutes" type="number" min="0" step="1" defaultValue={resource?.travelMinutes ?? ''} aria-invalid={Boolean(errors.travelMinutes)} />{errors.travelMinutes && <span>{errors.travelMinutes}</span>}</label>
            <div className="form-grid">
              <label>Receiving starts<input name="receivingStart" type="time" defaultValue={resource?.receivingStart ?? '08:00'} aria-invalid={Boolean(errors.receivingStart)} />{errors.receivingStart && <span>{errors.receivingStart}</span>}</label>
              <label>Receiving ends<input name="receivingEnd" type="time" defaultValue={resource?.receivingEnd ?? '16:00'} aria-invalid={Boolean(errors.receivingEnd)} />{errors.receivingEnd && <span>{errors.receivingEnd}</span>}</label>
            </div>
            <label>Notes<textarea name="notes" defaultValue={resource?.notes ?? ''} placeholder="Simple receiving constraints" maxLength="500" aria-invalid={Boolean(errors.notes)} />{errors.notes && <span>{errors.notes}</span>}</label>
            <label>Status<select name="status" defaultValue={resource?.status ?? 'AVAILABLE'}>{destinationStatuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
          </>
        ) : (
          <>
            <label>Sensor ID<input name="code" defaultValue={resource?.code ?? ''} placeholder="S-003" autoFocus aria-invalid={Boolean(errors.code)} />{errors.code && <span>{errors.code}</span>}</label>
            <label>Device UID<input name="deviceUid" defaultValue={resource?.deviceUid ?? ''} placeholder="esp32-s-003" aria-invalid={Boolean(errors.deviceUid)} />{errors.deviceUid && <span>{errors.deviceUid}</span>}</label>
            <label>Provisioning status<select name="provisioningStatus" defaultValue={resource?.provisioningStatus ?? 'PENDING'}>{sensorProvisioningStatuses.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></label>
            <p className="form-help"><Bluetooth size={16} />Configure Wi-Fi on the ESP32 over BLE, then mark it provisioned after connectivity is confirmed.</p>
          </>
        )}

        {mutation.isError && <p className="form-error" role="alert">{apiError(mutation.error)}</p>}
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save resource'}</button>
        </div>
      </form>
    </dialog>
  )
}

function ColdStorageCard({ resource, onEdit, onDelete }) {
  const usedPercent = Math.round((1 - resource.availableCapacityKg / resource.capacityKg) * 100)
  return (
    <article className="resource-card">
      <div className="resource-card-heading"><div className="resource-icon"><Snowflake size={20} /></div><StatusBadge status={resource.status} /></div>
      <div><h3>{resource.name}</h3><p>{resource.capacityKg.toLocaleString()} kg total capacity</p></div>
      <div className="capacity-row"><strong>{resource.availableCapacityKg.toLocaleString()} kg</strong><span>available</span></div>
      <div className="capacity-track" aria-label={`${usedPercent}% capacity used`}><span style={{ width: `${usedPercent}%` }} /></div>
      <div className="resource-actions"><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

function VehicleCard({ resource, onEdit, onDelete }) {
  return (
    <article className="resource-card">
      <div className="resource-card-heading"><div className="resource-icon"><Truck size={20} /></div><StatusBadge status={resource.status} /></div>
      <div><h3>{resource.code}</h3><p>{resource.capacityKg.toLocaleString()} kg load capacity</p></div>
      <div className="vehicle-detail"><Clock3 size={16} /><span>{resource.restriction ?? (resource.delayMinutes ? `${resource.delayMinutes} minute delay` : resource.availableFrom ? `Available ${new Date(resource.availableFrom).toLocaleString()}` : 'No known delay or restriction')}</span></div>
      <div className="resource-actions"><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

function DestinationCard({ resource, onEdit, onDelete }) {
  return (
    <article className="resource-card">
      <div className="resource-card-heading"><div className="resource-icon"><MapPin size={20} /></div><StatusBadge status={resource.status} /></div>
      <div><h3>{resource.name}</h3><p>{resource.address}</p></div>
      <div className="destination-details"><span><strong>{resource.travelMinutes} min</strong> travel</span><span><strong>{resource.receivingStart}–{resource.receivingEnd}</strong> receiving</span></div>
      {resource.notes && <p className="resource-note">{resource.notes}</p>}
      <div className="resource-actions"><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

function AssignmentDialog({ sensor, onClose }) {
  const queryClient = useQueryClient()
  const dialogRef = useRef(null)
  const options = useQuery({ queryKey: ['setup', 'sensor-assignment-options'], queryFn: listSensorAssignmentOptions, enabled: !sensor.assignment })
  const mutation = useMutation({
    mutationFn: (batchCode) => sensor.assignment ? unassignSensor(sensor.id) : assignSensor(sensor.id, batchCode),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setup', 'sensors'] }),
        queryClient.invalidateQueries({ queryKey: ['setup', 'sensor-assignment-options'] }),
      ])
      onClose()
    },
  })

  useEffect(() => dialogRef.current?.showModal(), [])

  function submit(event) {
    event.preventDefault()
    mutation.mutate(sensor.assignment ? null : new FormData(event.currentTarget).get('batchCode'))
  }

  return (
    <dialog ref={dialogRef} className="resource-dialog" aria-labelledby="assignment-dialog-title" onCancel={onClose} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <form className="resource-form" onSubmit={submit}>
        <div className="dialog-heading"><div><span>Sensor assignment</span><h2 id="assignment-dialog-title">{sensor.code}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Close dialog">×</button></div>
        {sensor.assignment ? <p className="dialog-copy">End monitoring for <strong>{sensor.assignment.batchCode}</strong>? The session remains in history and the sensor becomes available again.</p> : options.isPending ? <p className="dialog-copy">Loading available batches…</p> : options.isError ? <p className="form-error" role="alert">{apiError(options.error)}</p> : options.data.length ? <label>Batch<select name="batchCode">{options.data.map((batch) => <option key={batch.id} value={batch.code}>{batch.code} · {batch.weightKg} kg · Grade {batch.grade}</option>)}</select></label> : <p className="dialog-copy">No active unmonitored batches are available.</p>}
        {mutation.isError && <p className="form-error" role="alert">{apiError(mutation.error)}</p>}
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit" disabled={mutation.isPending || (!sensor.assignment && !options.data?.length)}>{mutation.isPending ? 'Saving…' : sensor.assignment ? 'End assignment' : 'Assign sensor'}</button></div>
      </form>
    </dialog>
  )
}

function DiagnosticsDialog({ sensor, onClose }) {
  const dialogRef = useRef(null)
  const query = useQuery({ queryKey: ['setup', 'sensor-diagnostics', sensor.id], queryFn: () => getSensorDiagnostics(sensor.id) })
  useEffect(() => dialogRef.current?.showModal(), [])
  return (
    <dialog ref={dialogRef} className="resource-dialog" aria-labelledby="diagnostics-dialog-title" onCancel={onClose} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="resource-form">
        <div className="dialog-heading"><div><span>Diagnostics</span><h2 id="diagnostics-dialog-title">{sensor.code}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Close dialog">×</button></div>
        {query.isPending ? <p className="dialog-copy">Loading diagnostics…</p> : query.isError ? <p className="form-error" role="alert">{apiError(query.error)}</p> : <div className="diagnostics-grid"><div><span>Connectivity</span><StatusBadge status={query.data.sensor.connectivityStatus} /></div><div><span>Last communication</span><strong>{query.data.sensor.lastSeenAt ? new Date(query.data.sensor.lastSeenAt).toLocaleString() : 'Never'}</strong></div><div><span>Session</span><strong>{query.data.sessionStatus ?? 'None'}</strong></div><div><span>Last sync</span><strong>{query.data.lastSyncedAt ? new Date(query.data.lastSyncedAt).toLocaleString() : 'Never'}</strong></div><div className="diagnostic-reading"><span>Latest temperature</span><strong>{query.data.latestReading ? `${query.data.latestReading.temperatureC}°C` : 'No readings received'}</strong></div></div>}
        <div className="dialog-actions"><button className="button button-primary" type="button" onClick={onClose}>Done</button></div>
      </div>
    </dialog>
  )
}

function BleDialog({ sensor, onClose }) {
  const dialogRef = useRef(null)
  useEffect(() => dialogRef.current?.showModal(), [])
  return (
    <dialog ref={dialogRef} className="resource-dialog" aria-labelledby="ble-dialog-title" onCancel={onClose} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="resource-form">
        <div className="dialog-heading"><div><span>Manual BLE sync</span><h2 id="ble-dialog-title">{sensor.code}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Close dialog">×</button></div>
        <div className="ble-guidance"><Bluetooth size={24} /><div><strong>Device connection required</strong><p>Bring this browser device near the ESP32. Manual sync will be enabled when the firmware BLE service and secure pairing protocol are available.</p></div></div>
        <div className="dialog-actions"><button className="button button-primary" type="button" onClick={onClose}>Done</button></div>
      </div>
    </dialog>
  )
}

function DeleteDialog({ resource, type, onClose }) {
  const queryClient = useQueryClient()
  const dialogRef = useRef(null)
  const name = resource.name ?? resource.code
  const mutation = useMutation({
    mutationFn: () => deleteResource(type, resource.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setup', type] }),
        queryClient.invalidateQueries({ queryKey: ['setup', 'readiness'] }),
      ])
      onClose()
    },
  })
  useEffect(() => dialogRef.current?.showModal(), [])
  return (
    <dialog ref={dialogRef} className="resource-dialog" aria-labelledby="delete-dialog-title" onCancel={onClose} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="resource-form">
        <div className="dialog-heading"><div><span>Delete resource</span><h2 id="delete-dialog-title">{name}</h2></div><button className="dialog-close" type="button" onClick={onClose} aria-label="Close dialog">×</button></div>
        <p className="dialog-copy">This removes the resource from setup. Resources referenced by operational history cannot be deleted.</p>
        {mutation.isError && <p className="form-error" role="alert">{apiError(mutation.error)}</p>}
        <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-danger" type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>{mutation.isPending ? 'Deleting…' : 'Delete resource'}</button></div>
      </div>
    </dialog>
  )
}

function SensorCard({ resource, onEdit, onDelete, onAssignment, onDiagnostics, onBleSync }) {
  return (
    <article className="resource-card sensor-card">
      <div className="resource-card-heading"><div className="resource-icon"><Cpu size={20} /></div><StatusBadge status={resource.connectivityStatus} /></div>
      <div><h3>{resource.code}</h3><p>{resource.deviceUid}</p></div>
      <div className="sensor-meta"><span><strong>{labels[resource.provisioningStatus]}</strong> provisioning</span><span><strong>{resource.assignment?.batchCode ?? 'Unassigned'}</strong> assignment</span><span><strong>{resource.lastSeenAt ? new Date(resource.lastSeenAt).toLocaleString() : 'Never'}</strong> last seen</span></div>
      <div className="resource-actions sensor-actions"><button type="button" onClick={onAssignment}><Unplug size={15} />{resource.assignment ? 'Unassign' : 'Assign'}</button><button type="button" onClick={onDiagnostics}><Activity size={15} />Diagnostics</button><button type="button" onClick={onBleSync}><Bluetooth size={15} />BLE sync</button><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

export function SetupPage() {
  const [type, setType] = useState('cold-storages')
  const [dialogResource, setDialogResource] = useState(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sensorAction, setSensorAction] = useState(null)
  const [deleteResourceState, setDeleteResourceState] = useState(null)
  const query = useQuery({ queryKey: ['setup', type], queryFn: () => listResources(type) })
  const readiness = useQuery({ queryKey: ['setup', 'readiness'], queryFn: getSetupReadiness })
  const tabByReadinessKey = { coldStorages: 'cold-storages', vehicles: 'vehicles', destinations: 'destinations', sensors: 'sensors' }
  const isColdStorage = type === 'cold-storages'
  const isVehicle = type === 'vehicles'
  const isDestination = type === 'destinations'
  const resourceLabel = isColdStorage ? 'cold storage' : isVehicle ? 'truck' : isDestination ? 'destination' : 'sensor'

  function openDialog(resource) {
    setDialogResource(resource)
    setDialogOpen(true)
  }

  function remove(resource) {
    setDeleteResourceState({ resource, type })
  }

  return (
    <div className="dashboard setup-dashboard">
      <div className="page-heading setup-heading">
        <div><h1>Setup</h1><p>Configure the operational resources SIRIP is allowed to use.</p></div>
        <button className="button button-primary" type="button" onClick={() => openDialog(undefined)}><Plus size={17} />Add {resourceLabel}</button>
      </div>

      {readiness.isSuccess && <section className={readiness.data.ready ? 'readiness-panel ready' : 'readiness-panel'} aria-label="Setup progress"><div className="readiness-summary"><div><span>Setup progress</span><strong>{readiness.data.ready ? 'Ready for operations' : `${readiness.data.completedSteps} of ${readiness.data.totalSteps} complete`}</strong></div><div className="readiness-meter" aria-label={`${readiness.data.completedSteps} of ${readiness.data.totalSteps} steps complete`}><span style={{ width: `${readiness.data.completedSteps / readiness.data.totalSteps * 100}%` }} /></div></div><div className="readiness-steps">{readiness.data.steps.map((step) => <button key={step.key} className={step.complete ? 'complete' : ''} type="button" onClick={() => setType(tabByReadinessKey[step.key])}><span>{step.complete ? <Check size={13} /> : step.count}</span>{step.label}</button>)}</div></section>}

      <div className="setup-tabs" role="tablist" aria-label="Setup resources">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={type === id ? 'active' : ''} type="button" role="tab" aria-selected={type === id} onClick={() => setType(id)}><Icon size={17} />{label}</button>)}
      </div>

      {query.isPending && <div className="resource-state">Loading resources…</div>}
      {query.isError && <div className="resource-state error-state"><strong>Could not load resources</strong><span>{apiError(query.error)}</span><button className="button button-secondary" type="button" onClick={() => query.refetch()}>Try again</button></div>}
      {query.isSuccess && !query.data.length && <div className="resource-state empty-state"><div className="resource-icon">{isColdStorage ? <Snowflake size={22} /> : isVehicle ? <Truck size={22} /> : isDestination ? <MapPin size={22} /> : <Cpu size={22} />}</div><strong>No {resourceLabel} configured</strong><span>Add every resource your operation can use.</span><button className="button button-primary" type="button" onClick={() => openDialog(undefined)}><Plus size={17} />Add first resource</button></div>}
      {query.isSuccess && query.data.length > 0 && (
        <Appear className="resource-grid" key={type}>
          {query.data.map((resource) => isColdStorage
            ? <ColdStorageCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} />
            : isVehicle
              ? <VehicleCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} />
              : isDestination
                ? <DestinationCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} />
                : <SensorCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} onAssignment={() => setSensorAction({ type: 'assignment', sensor: resource })} onDiagnostics={() => setSensorAction({ type: 'diagnostics', sensor: resource })} onBleSync={() => setSensorAction({ type: 'ble', sensor: resource })} />)}
        </Appear>
      )}

      {dialogOpen && <ResourceDialog type={type} resource={dialogResource} onClose={() => setDialogOpen(false)} />}
      {sensorAction?.type === 'assignment' && <AssignmentDialog sensor={sensorAction.sensor} onClose={() => setSensorAction(null)} />}
      {sensorAction?.type === 'diagnostics' && <DiagnosticsDialog sensor={sensorAction.sensor} onClose={() => setSensorAction(null)} />}
      {sensorAction?.type === 'ble' && <BleDialog sensor={sensorAction.sensor} onClose={() => setSensorAction(null)} />}
      {deleteResourceState && <DeleteDialog resource={deleteResourceState.resource} type={deleteResourceState.type} onClose={() => setDeleteResourceState(null)} />}
    </div>
  )
}
