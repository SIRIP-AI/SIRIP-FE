import { z } from 'zod'

import { api } from '@/lib/axios.js'
import { sortReadings } from '@/lib/ordering.js'

export const coldStorageStatuses = ['AVAILABLE', 'FULL', 'UNAVAILABLE']
export const resourceOperationalStatuses = ['AVAILABLE', 'UNAVAILABLE']
export const vehicleStatuses = ['AVAILABLE', 'ASSIGNED', 'UNAVAILABLE']
export const destinationStatuses = ['AVAILABLE', 'UNAVAILABLE']
export const sensorProvisioningStatuses = ['PENDING', 'PROVISIONED']

export const coldStorageInputSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  capacityKg: z.number().positive('Kapasitas harus lebih dari nol'),
  availableCapacityKg: z.number().nonnegative('Kapasitas tersedia tidak boleh negatif'),
  operationalStatus: z.enum(resourceOperationalStatuses),
}).refine((value) => value.availableCapacityKg <= value.capacityKg, {
  message: 'Kapasitas tersedia tidak boleh melebihi kapasitas total',
  path: ['availableCapacityKg'],
})

export const vehicleInputSchema = z.object({
  code: z.string().trim().min(1, 'ID truk wajib diisi').max(100, 'ID truk maksimal 100 karakter'),
  capacityKg: z.number().positive('Kapasitas harus lebih dari nol'),
  operationalStatus: z.enum(resourceOperationalStatuses),
  restriction: z.string().trim().max(500, 'Batasan maksimal 500 karakter').nullish().transform((value) => value ?? null),
  availabilityStart: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
  availabilityEnd: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).nullable(),
}).refine((value) => (value.availabilityStart === null) === (value.availabilityEnd === null), {
  message: 'Waktu mulai dan selesai harus diisi',
  path: ['availabilityEnd'],
}).refine((value) => !value.availabilityStart || !value.availabilityEnd || value.availabilityEnd > value.availabilityStart, {
  message: 'Waktu selesai harus setelah waktu mulai',
  path: ['availabilityEnd'],
})

export const destinationInputSchema = z.object({
  name: z.string().trim().min(1, 'Nama pengolah wajib diisi').max(100, 'Nama pengolah maksimal 100 karakter'),
  address: z.string().trim().min(1, 'Lokasi wajib diisi').max(100, 'Lokasi maksimal 100 karakter'),
  travelMinutes: z.number().int().nonnegative('Waktu tempuh tidak boleh negatif'),
  receivingStart: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Waktu mulai wajib diisi'),
  receivingEnd: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Waktu selesai wajib diisi'),
  status: z.enum(destinationStatuses),
  notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter').nullable(),
}).refine((value) => value.receivingEnd > value.receivingStart, {
  message: 'Waktu selesai harus setelah waktu mulai',
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
  code: z.string().trim().min(1, 'ID sensor wajib diisi').max(100, 'ID sensor maksimal 100 karakter'),
  deviceUid: z.string().trim().min(1, 'UID perangkat wajib diisi').max(100, 'UID perangkat maksimal 100 karakter'),
  provisioningStatus: z.enum(sensorProvisioningStatuses),
})

const utf8Length = (value) => new TextEncoder().encode(value).byteLength

export const sensorProvisioningFormSchema = z.object({
  code: z.string().trim().min(1, 'ID sensor wajib diisi').refine((value) => utf8Length(value) <= 100, 'ID sensor maksimal 100 byte UTF-8'),
  wifiSsid: z.string().min(1, 'SSID Wi-Fi wajib diisi').refine((value) => utf8Length(value) <= 32, 'SSID Wi-Fi maksimal 32 byte UTF-8'),
  wifiPassword: z.string().refine((value) => value.length === 0 || value.length >= 8, 'Kata sandi Wi-Fi harus kosong atau minimal 8 karakter').refine((value) => utf8Length(value) <= 63, 'Kata sandi Wi-Fi maksimal 63 byte UTF-8'),
  backendUrl: z.string().trim().min(1, 'URL backend wajib diisi').refine((value) => utf8Length(value) <= 255, 'URL backend maksimal 255 byte UTF-8'),
})

const sensorSchema = sensorInputSchema.safeExtend({
  id: z.string(),
  status: z.enum(['AVAILABLE', 'ASSIGNED', 'OFFLINE', 'ERROR']),
  connectivityStatus: z.enum(['ONLINE', 'SYNCING', 'OFFLINE', 'ERROR', 'NEVER_CONNECTED']),
  lastSeenAt: z.string().datetime().nullable(),
  pendingReadingCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  assignment: z.object({ batchCode: z.string(), lastSyncedAt: z.string().datetime().nullable() }).nullable(),
})

export const sensorOfflineResultSchema = z.strictObject({
  sensorId: z.string(),
  lastSeenAt: z.string().datetime(),
  lastSyncedAt: z.string().datetime(),
  processedAt: z.string().datetime(),
  telemetryBlocked: z.boolean(),
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
  const readings = z.array(temperatureReadingSchema).max(100, 'Pembacaan sensor maksimal 100 entri').parse((await api.get(`/api/sensors/${id}/readings`)).data)
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

export async function simulateSensorOffline(id) {
  return sensorOfflineResultSchema.parse((await api.post(`/api/debug/demo/sensors/${id}/offline`)).data)
}

export async function reconnectSensorTelemetry(id) {
  return z.strictObject({ sensorId: z.string(), reconnectedAt: z.string().datetime() }).parse((await api.post(`/api/debug/demo/sensors/${id}/reconnect`)).data)
}

export function apiError(error) {
  if (error?.response?.data?.error) return error.response.data.error
  return error?.request && !error.response ? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' : 'Data sumber daya tidak dapat diproses. Silakan coba lagi.'
}
