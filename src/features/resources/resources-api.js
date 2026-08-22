import { z } from 'zod'

import { api } from '@/lib/axios.js'
import { sortReadings } from '@/lib/ordering.js'

export const coldStorageStatuses = ['AVAILABLE', 'FULL', 'UNAVAILABLE']
export const resourceOperationalStatuses = ['AVAILABLE', 'UNAVAILABLE']
export const vehicleStatuses = ['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE']
export const destinationStatuses = ['AVAILABLE', 'UNAVAILABLE']
export const sensorProvisioningStatuses = ['PENDING', 'PROVISIONED']

export const coldStorageInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  capacityKg: z.number().positive('Capacity must be greater than zero'),
  availableCapacityKg: z.number().nonnegative('Available capacity cannot be negative'),
  operationalStatus: z.enum(resourceOperationalStatuses),
}).refine((value) => value.availableCapacityKg <= value.capacityKg, {
  message: 'Available capacity cannot exceed total capacity',
  path: ['availableCapacityKg'],
})

export const vehicleInputSchema = z.object({
  code: z.string().trim().min(1, 'Truck ID is required').max(100),
  capacityKg: z.number().positive('Capacity must be greater than zero'),
  operationalStatus: z.enum(resourceOperationalStatuses),
  restriction: z.string().trim().max(500).nullish().transform((value) => value ?? null),
  availabilityStart: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  availabilityEnd: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
}).refine((value) => (value.availabilityStart === null) === (value.availabilityEnd === null), {
  message: 'Start and end time must both be provided',
  path: ['availabilityEnd'],
}).refine((value) => !value.availabilityStart || !value.availabilityEnd || value.availabilityEnd > value.availabilityStart, {
  message: 'End time must be after start time',
  path: ['availabilityEnd'],
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
  status: z.enum(coldStorageStatuses),
  updatedAt: z.string().datetime(),
})

const vehicleSchema = vehicleInputSchema.safeExtend({
  id: z.string(),
  status: z.enum(vehicleStatuses),
  delayMinutes: z.number().int().nonnegative(),
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

const utf8Length = (value) => new TextEncoder().encode(value).byteLength

export const sensorProvisioningFormSchema = z.object({
  code: z.string().trim().min(1, 'Sensor ID is required').refine((value) => utf8Length(value) <= 100, 'Sensor ID must be at most 100 UTF-8 bytes'),
  wifiSsid: z.string().min(1, 'Wi-Fi SSID is required').refine((value) => utf8Length(value) <= 32, 'Wi-Fi SSID must be at most 32 UTF-8 bytes'),
  wifiPassword: z.string().refine((value) => value.length === 0 || value.length >= 8, 'Wi-Fi password must be empty or at least 8 characters').refine((value) => utf8Length(value) <= 63, 'Wi-Fi password must be at most 63 UTF-8 bytes'),
  backendUrl: z.string().trim().min(1, 'Backend URL is required').refine((value) => utf8Length(value) <= 255, 'Backend URL must be at most 255 UTF-8 bytes'),
})

const sensorSchema = sensorInputSchema.safeExtend({
  id: z.string(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'OFFLINE', 'ERROR']),
  connectivityStatus: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'NEVER_CONNECTED']),
  lastSeenAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  assignment: z.object({ batchCode: z.string(), lastSyncedAt: z.string().datetime().nullable() }).nullable(),
})

const temperatureReadingSchema = z.object({
  id: z.string(),
  readingUid: z.string(),
  sensorSessionId: z.string(),
  sequenceNumber: z.number().int().nonnegative(),
  temperatureC: z.number(),
  measuredAt: z.string().datetime(),
  receivedAt: z.string().datetime(),
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

const readinessSchema = z.object({
  ready: z.boolean(),
  completedSteps: z.number().int(),
  totalSteps: z.number().int(),
  steps: z.array(z.object({ key: z.string(), label: z.string(), complete: z.boolean(), count: z.number().int() })),
})

export async function getSetupReadiness() {
  return readinessSchema.parse((await api.get('/api/setup-readiness')).data)
}

export async function listSensorAssignmentOptions() {
  return z.array(batchOptionSchema).parse((await api.get('/api/sensor-assignment-options')).data)
}

export async function listSensorReadings(id) {
  const readings = z.array(temperatureReadingSchema).max(100).parse((await api.get(`/api/sensors/${id}/readings`)).data)
  return sortReadings(readings)
}

export async function assignSensor(id, batchCode) {
  return sensorSchema.parse((await api.post(`/api/sensors/${id}/assignment`, { batchCode })).data)
}

export async function unassignSensor(id) {
  return sensorSchema.parse((await api.delete(`/api/sensors/${id}/assignment`)).data)
}

const diagnosticsSchema = z.object({
  sensor: sensorSchema,
  latestReading: temperatureReadingSchema.nullable(),
  lastSyncedAt: z.string().datetime().nullable(),
  sessionStatus: z.enum(['ACTIVE', 'COMPLETED']).nullable(),
})

export async function getSensorDiagnostics(id) {
  return diagnosticsSchema.parse((await api.get(`/api/sensors/${id}/diagnostics`)).data)
}

export async function simulateSensorExcursion(id) {
  return z.object({ sensorId: z.string(), readingCount: z.literal(5), temperatures: z.array(z.number()).length(5), generatedAt: z.string().datetime() }).parse((await api.post(`/api/debug/demo/sensors/${id}/excursion`)).data)
}

export async function simulateSensorRecovery(id) {
  return z.object({ sensorId: z.string(), readingCount: z.literal(5), temperatures: z.array(z.number()).length(5), generatedAt: z.string().datetime() }).parse((await api.post(`/api/debug/demo/sensors/${id}/recovery`)).data)
}

export function apiError(error) {
  return error.response?.data?.error ?? error.message ?? 'Something went wrong'
}
