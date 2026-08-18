import { z } from 'zod'

import { api } from '@/lib/axios.js'

const isoDateTimeSchema = z.string().datetime({ offset: true })
const planIdSchema = z.string().regex(/^[1-9]\d*$/)
const stepIdSchema = z.string().min(1)

const triggerSchema = z.strictObject({
  type: z.string(),
  message: z.string(),
  occurredAt: isoDateTimeSchema,
})

const resourceSchema = z.strictObject({
  type: z.enum(['COLD_STORAGE', 'VEHICLE', 'DESTINATION']),
  id: z.string(),
  name: z.string(),
})

const stepSchema = z.strictObject({
  id: stepIdSchema,
  sequence: z.number().int().positive(),
  actionType: z.enum(['STORE', 'LOAD', 'DISPATCH', 'HANDOVER', 'INSPECT', 'OTHER']),
  scheduledAt: isoDateTimeSchema,
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELED']),
  completedAt: isoDateTimeSchema.nullable(),
  notes: z.string().nullable(),
  batch: z.strictObject({ id: z.string(), code: z.string() }),
  resource: resourceSchema.nullable(),
})

const planSchema = z.strictObject({
  id: planIdSchema,
  version: z.number().int().positive(),
  status: z.enum(['PROPOSED', 'ACTIVE', 'SUPERSEDED', 'DISMISSED']),
  previousPlanId: z.string().nullable(),
  reason: z.string(),
  createdAt: isoDateTimeSchema,
  approvedAt: isoDateTimeSchema.nullable(),
  trigger: triggerSchema.nullable(),
  steps: z.array(stepSchema),
})

const plansSchema = z.strictObject({
  updatedAt: isoDateTimeSchema,
  activePlan: planSchema.nullable(),
  proposedPlans: z.array(planSchema),
  history: z.array(planSchema),
})

export const plansQueryOptions = {
  queryKey: ['plans'],
  queryFn: async () => plansSchema.parse((await api.get('/api/plans')).data),
  refetchInterval: 30_000,
}

export async function completePlanStep(planId, stepId) {
  const safePlanId = planIdSchema.parse(planId)
  const safeStepId = stepIdSchema.parse(stepId)
  const response = await api.post(`/api/plans/${encodeURIComponent(safePlanId)}/steps/${encodeURIComponent(safeStepId)}/complete`)
  return planSchema.parse(response.data)
}
