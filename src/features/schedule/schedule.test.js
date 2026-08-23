import assert from 'node:assert/strict'
import test from 'node:test'

import { eventsForDay, jakartaDateKey, monthGrid, projectSchedule, SCHEDULE_QUERY_KEY, shiftMonth } from './schedule.js'

test('keeps the reduced schedule response out of the plans cache', () => {
  assert.deepEqual(SCHEDULE_QUERY_KEY, ['schedule'])
})

test('uses Jakarta day boundaries', () => {
  assert.equal(jakartaDateKey('2026-08-23T17:30:00Z'), '2026-08-24')
})

test('builds a six-week Sunday-first month grid', () => {
  const grid = monthGrid('2026-08')
  assert.equal(grid.length, 42)
  assert.equal(grid[0].key, '2026-07-26')
  assert.equal(grid.at(-1).key, '2026-09-05')
  assert.equal(shiftMonth('2026-01', -1), '2025-12')
})

test('projects active plan steps in time order and repeats five colors', () => {
  const plans = Array.from({ length: 6 }, (_, index) => ({ id: String(index + 1), version: 1, summary: `Plan ${index + 1}`, steps: [{ id: String(index), sequence: 1, actionType: 'LOAD', scheduledAt: `2026-08-24T0${5 - Math.min(index, 5)}:00:00Z`, status: 'UPCOMING', completedAt: null, batch: null, resources: [] }] }))
  const events = projectSchedule(plans)
  assert.equal(events.find(({ planId }) => planId === '1').colorIndex, 0)
  assert.equal(events.find(({ planId }) => planId === '6').colorIndex, 0)
  assert.deepEqual(eventsForDay(events, '2026-08-24', new Set(['2'])).map(({ planId }) => planId), ['2'])
})
