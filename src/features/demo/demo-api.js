import { z } from 'zod'

import { api } from '@/lib/axios.js'

const demoResultSchema = z.object({
  trip: z.object({ id: z.string(), code: z.string() }),
  batch: z.object({ id: z.string(), code: z.string() }),
  sensor: z.object({ id: z.string(), code: z.string() }),
  readingCount: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  currentTemperatureC: z.number(),
  remainingQualityWindowDays: z.number(),
})

const demoResetResultSchema = z.strictObject({
  resetAt: z.string().datetime(),
  deleted: z.strictObject({
    fishingTrips: z.number().int().nonnegative(),
    batches: z.number().int().nonnegative(),
    plans: z.number().int().nonnegative(),
    sensors: z.number().int().nonnegative(),
    telemetry: z.number().int().nonnegative(),
    alerts: z.number().int().nonnegative(),
  }),
  restored: z.strictObject({ resources: z.number().int().nonnegative() }),
  sessionPreserved: z.literal(true),
})

export async function loadDemoData() {
  return demoResultSchema.parse((await api.post('/api/debug/demo')).data)
}

export async function resetDemoAccount() {
  return demoResetResultSchema.parse((await api.post('/api/debug/demo/reset')).data)
}

export function demoError(error) {
  return error.response?.data?.error ?? error.message ?? 'Demo data could not be generated'
}
