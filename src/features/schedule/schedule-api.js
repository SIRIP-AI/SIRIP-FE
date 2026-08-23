import { z } from 'zod'

import { SCHEDULE_QUERY_KEY } from '@/features/schedule/schedule.js'
import { api } from '@/lib/axios.js'

const timestamp = z.string().datetime({ offset: true })
const resource = z.object({ type: z.enum(['COLD_STORAGE', 'VEHICLE', 'DESTINATION']), id: z.string(), name: z.string() })
const step = z.object({
  id: z.string(),
  sequence: z.number().int().positive(),
  actionType: z.enum(['STORE', 'LOAD', 'DISPATCH', 'RETURN_TO_BASE', 'HANDOVER', 'INSPECT', 'OTHER']),
  scheduledAt: timestamp,
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELED']),
  completedAt: timestamp.nullable(),
  batch: z.object({ id: z.string(), code: z.string() }).nullable(),
  resources: z.array(resource),
})
const plan = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  status: z.literal('ACTIVE'),
  summary: z.string(),
  batches: z.array(z.object({ id: z.string(), code: z.string() })),
  steps: z.array(step),
})
const response = z.object({ updatedAt: timestamp, activePlans: z.array(plan) })

export const scheduleQueryOptions = {
  queryKey: SCHEDULE_QUERY_KEY,
  queryFn: async () => response.parse((await api.get('/api/plans')).data),
  refetchInterval: 30_000,
}
