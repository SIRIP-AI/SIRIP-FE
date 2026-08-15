import { z } from 'zod'

import { api } from '@/lib/axios.js'

export const coldStorageStatuses = ['AVAILABLE', 'FULL', 'UNAVAILABLE']
export const vehicleStatuses = ['AVAILABLE', 'ASSIGNED', 'DELAYED', 'UNAVAILABLE']
export const destinationStatuses = ['AVAILABLE', 'UNAVAILABLE']
export const sensorProvisioningStatuses = ['PENDING', 'PROVISIONED']

export const coldStorageInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  capacityKg: z.number().positive('Capacity must be greater than zero'),
  availableCapacityKg: z.number().nonnegative('Available capacity cannot be negative'),
  status: z.enum(coldStorageStatuses),
}).refine((value) => value.availableCapacityKg <= value.capacityKg, {
  message: 'Available capacity cannot exceed total capacity',
  path: ['availableCapacityKg'],
})

export const vehicleInputSchema = z.object({
  code: z.string().trim().min(1, 'Truck ID is required').max(100),
  capacityKg: z.number().positive('Capacity must be greater than zero'),
  status: z.enum(vehicleStatuses),
  delayMinutes: z.number().int().nonnegative('Delay cannot be negative'),
  restriction: z.string().trim().max(500).nullish().transform((value) => value ?? null),
  availableFrom: z.string().datetime().nullish().transform((value) => value ?? null),
})

export const destinationInputSchema = z.object({
  name: z.string().trim().min(1, 'Processor name is required').max(100),
  address: z.string().trim().min(1, 'Location is required').max(100),
  travelMinutes: z.number().int().nonnegative('Travel time cannot be negative'),
  receivingStart: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Start time is required'),
  receivingEnd: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'End time is required'),
  status: z.enum(destinationStatuses),
  notes: z.string().trim().max(500).nullable(),
}).refine((value) => value.receivingEnd > value.receivingStart, {
  message: 'End time must be after start time',
  path: ['receivingEnd'],
})

const coldStorageSchema = coldStorageInputSchema.safeExtend({
  id: z.string(),
  updatedAt: z.string().datetime(),
})

const vehicleSchema = vehicleInputSchema.safeExtend({
  id: z.string(),
  updatedAt: z.string().datetime(),
})

const destinationSchema = destinationInputSchema.safeExtend({
  id: z.string(),
  updatedAt: z.string().datetime(),
})

export const sensorInputSchema = z.object({
  code: z.string().trim().min(1, 'Sensor ID is required').max(100),
  deviceUid: z.string().trim().min(1, 'Device UID is required').max(100),
  provisioningStatus: z.enum(sensorProvisioningStatuses),
})

const sensorSchema = sensorInputSchema.safeExtend({
  id: z.string(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'OFFLINE', 'ERROR']),
  connectivityStatus: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'NEVER_CONNECTED']),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  assignment: z.object({ batchCode: z.string(), lastSyncedAt: z.string().datetime().nullable() }).nullable(),
})

const resources = {
  'cold-storages': { response: z.array(coldStorageSchema), item: coldStorageSchema, input: coldStorageInputSchema },
  vehicles: { response: z.array(vehicleSchema), item: vehicleSchema, input: vehicleInputSchema },
  destinations: { response: z.array(destinationSchema), item: destinationSchema, input: destinationInputSchema },
  sensors: { response: z.array(sensorSchema), item: sensorSchema, input: sensorInputSchema },
}

export async function listResources(type) {
  return resources[type].response.parse((await api.get(`/api/${type}`)).data)
}

export async function saveResource(type, resource) {
  const input = resources[type].input.parse(resource)
  const response = resource.id
    ? await api.put(`/api/${type}/${resource.id}`, input)
    : await api.post(`/api/${type}`, input)
  return resources[type].item.parse(response.data)
}

export async function deleteResource(type, id) {
  await api.delete(`/api/${type}/${id}`)
}

const batchOptionSchema = z.object({ id: z.string(), code: z.string(), weightKg: z.number(), grade: z.string() })

export async function listSensorAssignmentOptions() {
  return z.array(batchOptionSchema).parse((await api.get('/api/sensor-assignment-options')).data)
}

export async function assignSensor(id, batchCode) {
  return sensorSchema.parse((await api.post(`/api/sensors/${id}/assignment`, { batchCode })).data)
}

export async function unassignSensor(id) {
  return sensorSchema.parse((await api.delete(`/api/sensors/${id}/assignment`)).data)
}

const diagnosticsSchema = z.object({
  sensor: sensorSchema,
  latestReading: z.object({ temperatureC: z.number(), measuredAt: z.string().datetime(), receivedAt: z.string().datetime() }).nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  sessionStatus: z.enum(['ACTIVE', 'COMPLETED']).nullable(),
})

export async function getSensorDiagnostics(id) {
  return diagnosticsSchema.parse((await api.get(`/api/sensors/${id}/diagnostics`)).data)
}

export function apiError(error) {
  return error.response?.data?.error ?? error.message ?? 'Something went wrong'
}
