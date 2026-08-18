import { z } from 'zod'

import { api } from '@/lib/axios.js'
import { sortEvents, sortPlanSteps } from '@/lib/ordering.js'

const overviewSchema = z.object({
  updatedAt: z.string().datetime(),
  summary: z.object({
    activeBatchCount: z.number().int().nonnegative(),
    atRiskBatchCount: z.number().int().nonnegative(),
    activeAlertCount: z.number().int().nonnegative(),
    activePlanVersion: z.number().int().positive().nullable(),
  }),
  priorityBatches: z.array(z.object({
    code: z.string(),
    currentTemperatureC: z.number().nullable(),
    remainingQualityWindowDays: z.number().nullable(),
    qualityStatus: z.enum(['NORMAL', 'WARNING', 'CRITICAL', 'UNKNOWN']),
    sensor: z.object({
      code: z.string(),
      connectivityStatus: z.enum(['ONLINE', 'OFFLINE', 'ERROR', 'NEVER_CONNECTED', 'UNASSIGNED']),
    }).nullable(),
  })),
  activePlan: z.object({
    id: z.string(),
    version: z.number().int().positive(),
    status: z.literal('ACTIVE'),
    reason: z.string(),
    steps: z.array(z.object({
      id: z.string(),
      sequence: z.number().int().positive(),
      actionType: z.enum(['STORE', 'LOAD', 'DISPATCH', 'HANDOVER', 'INSPECT', 'OTHER']),
      scheduledAt: z.string().datetime(),
      status: z.enum(['UPCOMING', 'COMPLETED']),
      batchCode: z.string(),
      resource: z.string().nullable(),
    })),
  }).nullable(),
  alerts: z.array(z.object({
    id: z.string(),
    batchId: z.string().nullable(),
    type: z.string(),
    source: z.enum(['SYSTEM', 'WEB', 'WHATSAPP']),
    severity: z.enum(['WARNING', 'CRITICAL']),
    title: z.string(),
    description: z.string(),
    occurredAt: z.string().datetime(),
  })),
})

export const overviewQueryOptions = {
  queryKey: ['overview'],
  queryFn: async () => {
    const overview = overviewSchema.parse((await api.get('/api/overview')).data)
    return {
      ...overview,
      activePlan: overview.activePlan && { ...overview.activePlan, steps: sortPlanSteps(overview.activePlan.steps) },
      alerts: sortEvents(overview.alerts),
    }
  },
  refetchInterval: 30_000,
}
