import { z } from 'zod'

import { api } from '@/lib/axios.js'

const isoDateTimeSchema = z.string().datetime({ offset: true })
const planIdSchema = z.string().regex(/^[1-9]\d*$/)
const stepIdSchema = z.string().min(1)
const batchIdSchema = z.string().regex(/^[1-9]\d*$/)
const destinationIdSchema = z.string().regex(/^[1-9]\d*$/)

const triggerSchema = z.strictObject({
  id: z.string(),
  type: z.string(),
  source: z.enum(['SYSTEM', 'WEB', 'WHATSAPP', 'TELEGRAM']),
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
  actionType: z.enum(['STORE', 'LOAD', 'DISPATCH', 'RETURN_TO_BASE', 'HANDOVER', 'INSPECT', 'OTHER']),
  scheduledAt: isoDateTimeSchema,
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELED']),
  completedAt: isoDateTimeSchema.nullable(),
  rationale: z.string().nullable(),
  batch: z.strictObject({ id: z.string(), code: z.string() }).nullable(),
  resources: z.array(resourceSchema),
})

const planSchema = z.strictObject({
  id: planIdSchema,
  version: z.number().int().positive(),
  status: z.enum(['PROPOSED', 'ACTIVE', 'COMPLETED', 'SUPERSEDED', 'DISMISSED']),
  previousPlanId: z.string().nullable(),
  summary: z.string(),
  destinationId: destinationIdSchema.nullable(),
  deadline: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  approvedAt: isoDateTimeSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  trigger: triggerSchema.nullable(),
  batches: z.array(z.object({ id: z.string(), code: z.string() })),
  steps: z.array(stepSchema),
})

const generationResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('PROPOSAL'), proposal: planSchema }),
  z.strictObject({ status: z.literal('NO_VALID_PROPOSAL_FOUND'), reason: z.string().min(1) }),
])

const plansSchema = z.strictObject({
  updatedAt: isoDateTimeSchema,
  activePlans: z.array(planSchema),
  proposedPlans: z.array(planSchema),
  history: z.array(planSchema),
})

export const plansQueryOptions = {
  queryKey: ['plans'],
  queryFn: async () => plansSchema.parse((await api.get('/api/plans')).data),
  refetchInterval: 30_000,
}

export function planQueryOptions(planId) {
  const safePlanId = planIdSchema.parse(planId)
  return {
    queryKey: ['plans', safePlanId],
    queryFn: async () => planSchema.parse((await api.get(`/api/plans/${encodeURIComponent(safePlanId)}`)).data),
  }
}

export async function createPlanProposal(value) {
  const input = z.strictObject({ batchIds: z.array(batchIdSchema).min(1), destinationId: destinationIdSchema, deadline: isoDateTimeSchema }).parse(value)
  return generationResultSchema.parse((await api.post('/api/plans/proposals', input)).data)
}

export async function createPlanRevision(planId, instruction) {
  const safePlanId = planIdSchema.parse(planId)
  const input = z.string().trim().min(1).max(2000).parse(instruction)
  return generationResultSchema.parse((await api.post(`/api/plans/${encodeURIComponent(safePlanId)}/revisions`, { instruction: input })).data)
}

export async function approvePlan(planId) {
  const safePlanId = planIdSchema.parse(planId)
  return planSchema.parse((await api.post(`/api/plans/${encodeURIComponent(safePlanId)}/approve`)).data)
}

export async function dismissPlan(planId) {
  const safePlanId = planIdSchema.parse(planId)
  return planSchema.parse((await api.post(`/api/plans/${encodeURIComponent(safePlanId)}/dismiss`)).data)
}

export async function completePlanStep(planId, stepId) {
  const safePlanId = planIdSchema.parse(planId)
  const safeStepId = stepIdSchema.parse(stepId)
  const response = await api.post(`/api/plans/${encodeURIComponent(safePlanId)}/steps/${encodeURIComponent(safeStepId)}/complete`)
  return planSchema.parse(response.data)
}
