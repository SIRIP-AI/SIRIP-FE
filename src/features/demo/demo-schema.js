import { z } from 'zod'

export const demoResultSchema = z.strictObject({
  trips: z.array(z.strictObject({ id: z.string(), code: z.string() })),
  batches: z.array(z.strictObject({
    id: z.string(),
    code: z.string(),
    tripCode: z.string(),
    currentTemperatureC: z.number(),
    remainingQualityWindowDays: z.number(),
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

export const demoResetResultSchema = z.strictObject({
  resetAt: z.string().datetime(),
  deleted: z.strictObject({
    fishingTrips: z.number().int().nonnegative(),
    batches: z.number().int().nonnegative(),
    plans: z.number().int().nonnegative(),
    sensors: z.number().int().nonnegative(),
    telemetry: z.number().int().nonnegative(),
    alerts: z.number().int().nonnegative(),
    messagingConnections: z.number().int().nonnegative(),
    messagingLinkTokens: z.number().int().nonnegative(),
    messagingConversations: z.number().int().nonnegative(),
  }),
  restored: z.strictObject({ resources: z.number().int().nonnegative() }),
  sessionPreserved: z.literal(true),
})
