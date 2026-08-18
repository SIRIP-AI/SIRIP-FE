import assert from 'node:assert/strict'
import { test } from 'node:test'

import { sortEvents, sortPlanSteps, sortReadings } from './ordering.js'

const reading = (id, sequenceNumber, measuredAt) => ({ id, sequenceNumber, measuredAt })

test('sortReadings orders out-of-order readings by measuredAt ascending', () => {
  const input = [reading('3', 3, '2026-08-18T08:00:00Z'), reading('1', 1, '2026-08-18T06:00:00Z'), reading('2', 2, '2026-08-18T07:00:00Z')]
  assert.deepEqual(sortReadings(input).map(({ id }) => id), ['1', '2', '3'])
  assert.deepEqual(input.map(({ id }) => id), ['3', '1', '2'])
})

test('sortReadings breaks equal measuredAt by sequenceNumber then numeric id', () => {
  const at = '2026-08-18T06:00:00Z'
  const input = [reading('10', 2, at), reading('9', 2, at), reading('2', 1, at), reading('1', 1, at)]
  assert.deepEqual(sortReadings(input).map(({ id }) => id), ['1', '2', '9', '10'])
})

test('sortReadings keeps input order for readings equal on every key', () => {
  const at = '2026-08-18T06:00:00Z'
  const first = { ...reading('1', 1, at), marker: 'first' }
  const second = { ...reading('1', 1, at), marker: 'second' }
  assert.deepEqual(sortReadings([first, second]).map(({ marker }) => marker), ['first', 'second'])
})

test('sortPlanSteps orders by sequence and keeps input order for equal sequences', () => {
  const first = { id: 'a', sequence: 2 }
  const second = { id: 'b', sequence: 1 }
  const third = { id: 'c', sequence: 2 }
  assert.deepEqual(sortPlanSteps([first, second, third]).map(({ id }) => id), ['b', 'a', 'c'])
})

test('sortEvents orders alerts by occurredAt then numeric id', () => {
  const at = '2026-08-18T06:00:00Z'
  const input = [
    { id: '2', occurredAt: '2026-08-18T07:00:00Z' },
    { id: '10', occurredAt: at },
    { id: '9', occurredAt: at },
    { id: '1', occurredAt: '2026-08-18T05:00:00Z' },
  ]
  assert.deepEqual(sortEvents(input).map(({ id }) => id), ['1', '9', '10', '2'])
})
