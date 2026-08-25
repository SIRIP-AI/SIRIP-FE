import { z } from 'zod'

export function createPlanChangeResultSchema(generationResultSchema) {
  const reportValueSchema = z.union([z.number(), z.enum(['AVAILABLE', 'UNAVAILABLE', 'INSPECTION_HOLD', 'ACTIVE', 'ERROR'])])
  return z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('REPORT_APPLIED'),
      report: z.strictObject({ kind: z.enum(['VEHICLE_DELAY', 'VEHICLE_STATUS', 'STORAGE_STATUS', 'DESTINATION_STATUS', 'BATCH_STATUS', 'SENSOR_STATUS']), entityName: z.string(), value: reportValueSchema }),
      eventId: z.string(),
      generation: generationResultSchema,
    }),
    z.strictObject({ kind: z.literal('PREFERENCE_REVISION'), generation: generationResultSchema }),
  ])
}
