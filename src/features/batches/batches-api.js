import { z } from 'zod'

import { api } from '@/lib/axios.js'

export const fishingTripInputSchema = z.object({
  code: z.string().trim().min(1, 'Trip ID is required').max(100),
  vesselName: z.string().trim().min(1, 'Vessel is required').max(100),
})

export const batchInputSchema = z.object({
  code: z.string().trim().min(1, 'Batch ID is required').max(100),
  fishingTripId: z.string().regex(/^\d+$/, 'Fishing trip is required'),
  weightKg: z.number().positive('Weight must be greater than zero'),
  grade: z.string().trim().min(1, 'Grade is required').max(100),
  receivedAt: z.string().datetime(),
})

const fishingTripSchema = fishingTripInputSchema.extend({
  id: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().nullable(),
  status: z.enum(['ACTIVE', 'COMPLETED']),
  createdAt: z.string().datetime(),
  batchCount: z.number().int().nonnegative(),
})

const batchSchema = z.object({
  id: z.string(),
  code: z.string(),
  fishingTripId: z.string(),
  fishingTrip: z.object({ id: z.string(), code: z.string(), vesselName: z.string() }),
  weightKg: z.number(),
  grade: z.string(),
  status: z.enum(['MONITORING', 'ACTIVE', 'INSPECTION_HOLD', 'HANDED_OVER', 'CLOSED']),
  receivedAt: z.string().datetime(),
  handedOverAt: z.string().datetime().nullable(),
  equivalentQualityAgeDays: z.number().nullable(),
  remainingQualityWindowDays: z.number().nullable(),
  qualityEstimateStartedAt: z.string().datetime().nullable(),
  currentTemperatureC: z.number().nullable(),
  activeSensor: z.object({ code: z.string(), status: z.string() }).nullable(),
  location: z.object({ type: z.enum(['INTAKE', 'COLD_STORAGE', 'VEHICLE', 'DESTINATION']), id: z.string().nullable(), name: z.string() }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export async function listFishingTrips() {
  return z.array(fishingTripSchema).parse((await api.get('/api/fishing-trips')).data)
}

export async function saveFishingTrip(trip) {
  const input = fishingTripInputSchema.parse(trip)
  const response = trip.id
    ? await api.put(`/api/fishing-trips/${trip.id}`, input)
    : await api.post('/api/fishing-trips', input)
  return fishingTripSchema.parse(response.data)
}

export async function completeFishingTrip(id, batches) {
  return z.object({ trip: fishingTripSchema, batches: z.array(z.object({ id: z.string(), code: z.string(), weightKg: z.number(), grade: z.string(), sensorId: z.string() })) }).parse((await api.post(`/api/fishing-trips/${id}/complete`, { batches })).data)
}

export async function deleteFishingTrip(id) {
  await api.delete(`/api/fishing-trips/${id}`)
}

export async function listBatches() {
  return z.array(batchSchema).parse((await api.get('/api/batches')).data)
}

export async function saveBatch(batch) {
  const input = batchInputSchema.parse(batch)
  const response = batch.id
    ? await api.put(`/api/batches/${batch.id}`, input)
    : await api.post('/api/batches', input)
  return batchSchema.parse(response.data)
}

export async function deleteBatch(id) {
  await api.delete(`/api/batches/${id}`)
}

export function apiError(error) {
  return error.response?.data?.error ?? error.message ?? 'Something went wrong'
}
