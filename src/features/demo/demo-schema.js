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
