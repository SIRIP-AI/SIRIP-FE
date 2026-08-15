import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock3, MapPin, Pencil, Plus, Snowflake, Trash2, Truck } from 'lucide-react'

import { Appear } from '@/components/appear.jsx'
import {
  apiError,
  coldStorageInputSchema,
  coldStorageStatuses,
  deleteResource,
  destinationInputSchema,
  destinationStatuses,
  listResources,
  saveResource,
  vehicleInputSchema,
  vehicleStatuses,
} from '@/features/setup/setup-api.js'

const tabs = [
  { id: 'cold-storages', label: 'Cold Storage', icon: Snowflake },
  { id: 'vehicles', label: 'Trucks', icon: Truck },
  { id: 'destinations', label: 'Destinations', icon: MapPin },
]

const labels = {
  AVAILABLE: 'Available',
  FULL: 'Full',
  UNAVAILABLE: 'Unavailable',
  ASSIGNED: 'Assigned',
  DELAYED: 'Delayed',
}

const tones = {
  AVAILABLE: 'healthy',
  FULL: 'warning',
  ASSIGNED: 'neutral',
  DELAYED: 'warning',
  UNAVAILABLE: 'critical',
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
  const title = `${resource ? 'Edit' : 'Add'} ${isColdStorage ? 'cold storage' : isVehicle ? 'truck' : 'destination'}`
  const mutation = useMutation({
    mutationFn: (input) => saveResource(type, { ...input, id: resource?.id }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['setup', type] })
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
    } : {
      name: form.get('name'),
      address: form.get('address'),
      travelMinutes: Number(form.get('travelMinutes')),
      receivingStart: form.get('receivingStart'),
      receivingEnd: form.get('receivingEnd'),
      status: form.get('status'),
      notes: form.get('notes')?.trim() || null,
    }
    const schema = isColdStorage ? coldStorageInputSchema : isVehicle ? vehicleInputSchema : destinationInputSchema
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
        ) : (
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

function ColdStorageCard({ resource, onEdit, onDelete, deleting }) {
  const usedPercent = Math.round((1 - resource.availableCapacityKg / resource.capacityKg) * 100)
  return (
    <article className="resource-card">
      <div className="resource-card-heading"><div className="resource-icon"><Snowflake size={20} /></div><StatusBadge status={resource.status} /></div>
      <div><h3>{resource.name}</h3><p>{resource.capacityKg.toLocaleString()} kg total capacity</p></div>
      <div className="capacity-row"><strong>{resource.availableCapacityKg.toLocaleString()} kg</strong><span>available</span></div>
      <div className="capacity-track" aria-label={`${usedPercent}% capacity used`}><span style={{ width: `${usedPercent}%` }} /></div>
      <div className="resource-actions"><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete} disabled={deleting}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

function VehicleCard({ resource, onEdit, onDelete, deleting }) {
  return (
    <article className="resource-card">
      <div className="resource-card-heading"><div className="resource-icon"><Truck size={20} /></div><StatusBadge status={resource.status} /></div>
      <div><h3>{resource.code}</h3><p>{resource.capacityKg.toLocaleString()} kg load capacity</p></div>
      <div className="vehicle-detail"><Clock3 size={16} /><span>{resource.restriction ?? (resource.delayMinutes ? `${resource.delayMinutes} minute delay` : resource.availableFrom ? `Available ${new Date(resource.availableFrom).toLocaleString()}` : 'No known delay or restriction')}</span></div>
      <div className="resource-actions"><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete} disabled={deleting}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

function DestinationCard({ resource, onEdit, onDelete, deleting }) {
  return (
    <article className="resource-card">
      <div className="resource-card-heading"><div className="resource-icon"><MapPin size={20} /></div><StatusBadge status={resource.status} /></div>
      <div><h3>{resource.name}</h3><p>{resource.address}</p></div>
      <div className="destination-details"><span><strong>{resource.travelMinutes} min</strong> travel</span><span><strong>{resource.receivingStart}–{resource.receivingEnd}</strong> receiving</span></div>
      {resource.notes && <p className="resource-note">{resource.notes}</p>}
      <div className="resource-actions"><button type="button" onClick={onEdit}><Pencil size={15} />Edit</button><button className="delete-button" type="button" onClick={onDelete} disabled={deleting}><Trash2 size={15} />Delete</button></div>
    </article>
  )
}

export function SetupPage() {
  const queryClient = useQueryClient()
  const [type, setType] = useState('cold-storages')
  const [dialogResource, setDialogResource] = useState(undefined)
  const [dialogOpen, setDialogOpen] = useState(false)
  const query = useQuery({ queryKey: ['setup', type], queryFn: () => listResources(type) })
  const deletion = useMutation({
    mutationFn: ({ resourceType, id }) => deleteResource(resourceType, id),
    onSuccess: (_, variables) => queryClient.invalidateQueries({ queryKey: ['setup', variables.resourceType] }),
  })
  const isColdStorage = type === 'cold-storages'
  const isVehicle = type === 'vehicles'
  const resourceLabel = isColdStorage ? 'cold storage' : isVehicle ? 'truck' : 'destination'
  const resourceName = (resource) => resource.name ?? resource.code

  function openDialog(resource) {
    setDialogResource(resource)
    setDialogOpen(true)
  }

  function remove(resource) {
    if (window.confirm(`Delete ${resourceName(resource)}?`)) {
      deletion.mutate({ resourceType: type, id: resource.id })
    }
  }

  return (
    <div className="dashboard setup-dashboard">
      <div className="page-heading setup-heading">
        <div><h1>Setup</h1><p>Configure the operational resources SIRIP is allowed to use.</p></div>
        <button className="button button-primary" type="button" onClick={() => openDialog(undefined)}><Plus size={17} />Add {resourceLabel}</button>
      </div>

      <div className="setup-tabs" role="tablist" aria-label="Setup resources">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={type === id ? 'active' : ''} type="button" role="tab" aria-selected={type === id} onClick={() => setType(id)}><Icon size={17} />{label}</button>)}
      </div>

      {deletion.isError && <p className="page-error" role="alert">{apiError(deletion.error)}</p>}
      {query.isPending && <div className="resource-state">Loading resources…</div>}
      {query.isError && <div className="resource-state error-state"><strong>Could not load resources</strong><span>{apiError(query.error)}</span><button className="button button-secondary" type="button" onClick={() => query.refetch()}>Try again</button></div>}
      {query.isSuccess && !query.data.length && <div className="resource-state empty-state"><div className="resource-icon">{isColdStorage ? <Snowflake size={22} /> : isVehicle ? <Truck size={22} /> : <MapPin size={22} />}</div><strong>No {resourceLabel} configured</strong><span>Add every resource your operation can use.</span><button className="button button-primary" type="button" onClick={() => openDialog(undefined)}><Plus size={17} />Add first resource</button></div>}
      {query.isSuccess && query.data.length > 0 && (
        <Appear className="resource-grid" key={type}>
          {query.data.map((resource) => isColdStorage
            ? <ColdStorageCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} deleting={deletion.isPending} />
            : isVehicle
              ? <VehicleCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} deleting={deletion.isPending} />
              : <DestinationCard key={resource.id} resource={resource} onEdit={() => openDialog(resource)} onDelete={() => remove(resource)} deleting={deletion.isPending} />)}
        </Appear>
      )}

      {dialogOpen && <ResourceDialog type={type} resource={dialogResource} onClose={() => setDialogOpen(false)} />}
    </div>
  )
}
