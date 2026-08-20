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

export async function loadDemoData() {
  return demoResultSchema.parse((await api.post('/api/debug/demo')).data)
}

export function demoError(error) {
  return error.response?.data?.error ?? error.message ?? 'Demo data could not be generated'
}
