import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatDuration } from './plan-timing.js'

test('formats exact durations without rounding away smaller units', () => {
  assert.equal(formatDuration(0), '0 seconds')
  assert.equal(formatDuration(1), '1 second')
  assert.equal(formatDuration(90), '1 minute 30 seconds')
  assert.equal(formatDuration(90_061), '1 day 1 hour 1 minute 1 second')
})
