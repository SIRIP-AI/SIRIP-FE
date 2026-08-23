import { z } from 'zod'

export const demoResultSchema = z.strictObject({
  trips: z.array(z.strictObject({ id: z.string(), code: z.string() })),
  batches: z.array(z.strictObject({
    id: z.string(),
    code: z.string(),
    tripCode: z.string(),
    currentTemperatureC: z.number().nullable(),
    remainingQualityWindowDays: z.number().nullable(),
  })),
  sensors: z.array(z.strictObject({
    id: z.string(),
    code: z.string(),
    batchCode: z.string(),
    readingCount: z.number().int().nonnegative(),
  })),
  readingCount: z.number().int().positive(),
  generatedAt: z.string().datetime(),
})

const deletionCount = z.number().int().nonnegative()

export const demoResetResultSchema = z.strictObject({
  resetAt: z.string().datetime(),
  deleted: z.strictObject({
    fishingTrips: deletionCount,
    batches: deletionCount,
    plans: deletionCount,
    sensors: deletionCount,
    telemetry: deletionCount,
    alerts: deletionCount,
    messagingConnections: deletionCount,
    messagingLinkTokens: deletionCount,
    messagingConversations: deletionCount,
  }),
  restored: z.strictObject({ resources: z.literal(8) }),
  sessionPreserved: z.literal(true),
})
