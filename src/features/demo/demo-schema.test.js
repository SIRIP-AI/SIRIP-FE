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

test('demoResultSchema menerima respons demo operasi berbentuk jamak', () => {
  assert.deepEqual(demoResultSchema.parse(result), result)
})

test('demoResultSchema menolak respons tunggal lama', () => {
  assert.equal(demoResultSchema.safeParse({ ...result, trips: undefined, trip: result.trips[0] }).success, false)
})

const resetResult = {
  resetAt: '2026-08-21T12:00:00.000Z',
  deleted: { fishingTrips: 3, batches: 6, plans: 1, sensors: 3, telemetry: 15, alerts: 2, messagingConnections: 0, messagingLinkTokens: 1, messagingConversations: 1 },
  restored: { resources: 8 },
  sessionPreserved: true,
}

test('demoResetResultSchema menerima respons atur ulang yang tepat', () => {
  assert.deepEqual(demoResetResultSchema.parse(resetResult), resetResult)
})

test('demoResetResultSchema menolak jumlah tidak valid dan penyimpangan kontrak', () => {
  assert.equal(demoResetResultSchema.safeParse({ ...resetResult, deleted: { ...resetResult.deleted, batches: -1 } }).success, false)
  assert.equal(demoResetResultSchema.safeParse({ ...resetResult, restored: { resources: 7 } }).success, false)
  assert.equal(demoResetResultSchema.safeParse({ ...resetResult, extra: true }).success, false)
})
