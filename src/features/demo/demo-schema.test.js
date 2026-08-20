import assert from 'node:assert/strict'
import { test } from 'node:test'

import { demoResetResultSchema, demoResultSchema } from './demo-schema.js'

const result = {
  trips: [{ id: 'trip-1', code: 'TRIP-001' }],
  batches: [{ id: 'batch-1', code: 'BATCH-001', tripCode: 'TRIP-001', currentTemperatureC: 1.8, remainingQualityWindowDays: 8.4 }],
  sensors: [{ id: 'sensor-1', code: 'SENSOR-001', batchCode: 'BATCH-001', readingCount: 5 }],
  readingCount: 5,
  generatedAt: '2026-08-21T12:00:00.000Z',
}

test('demoResultSchema accepts the plural operations demo response', () => {
  assert.deepEqual(demoResultSchema.parse(result), result)
})

test('demoResultSchema rejects the former singular response', () => {
  assert.equal(demoResultSchema.safeParse({ ...result, trips: undefined, trip: result.trips[0] }).success, false)
})

test('demoResetResultSchema accepts Telegram conversation cleanup count', () => {
  const reset = {
    resetAt: '2026-08-21T12:00:00.000Z',
    deleted: {
      fishingTrips: 3,
      batches: 6,
      plans: 1,
      sensors: 6,
      telemetry: 30,
      alerts: 2,
      messagingConnections: 1,
      messagingLinkTokens: 0,
      messagingConversations: 1,
    },
    restored: { resources: 8 },
    sessionPreserved: true,
  }

  assert.deepEqual(demoResetResultSchema.parse(reset), reset)
})
