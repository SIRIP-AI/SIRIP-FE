import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolvePlanLineage } from './plan-lineage.js'

test('resolves predecessor and retained completed facts across plan lists', () => {
  const completed = { id: 'step-1', sequence: 1, actionType: 'LOAD', status: 'COMPLETED', completedAt: '2026-08-22T10:00:00.000Z', batch: { id: '7' } }
  const predecessor = { id: '10', version: 1, steps: [completed] }
  const plan = { id: '11', previousPlanId: '10', steps: [{ ...completed, id: 'step-2' }] }
  assert.deepEqual(resolvePlanLineage(plan, { activePlans: [], proposedPlans: [], history: [predecessor] }), { predecessor, retainedCompletedSteps: 1 })
})

test('returns null when no loaded predecessor is available', () => {
  assert.equal(resolvePlanLineage({ previousPlanId: '10' }, { activePlans: [], proposedPlans: [], history: [] }), null)
})
