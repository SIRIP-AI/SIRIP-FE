import assert from 'node:assert/strict'
import { test } from 'node:test'

import { resolvePlanLineage } from './plan-lineage.js'

test('menemukan pendahulu dan fakta selesai yang dipertahankan di seluruh daftar rencana', () => {
  const completed = { id: 'step-1', sequence: 1, actionType: 'LOAD', status: 'COMPLETED', completedAt: '2026-08-22T10:00:00.000Z', batch: { id: '7' } }
  const predecessor = { id: '10', version: 1, steps: [completed] }
  const plan = { id: '11', previousPlanId: '10', steps: [{ ...completed, id: 'step-2' }] }
  assert.deepEqual(resolvePlanLineage(plan, { activePlans: [], proposedPlans: [], history: [predecessor] }), { predecessor, retainedCompletedSteps: 1 })
})

test('mengembalikan null ketika pendahulu tidak tersedia', () => {
  assert.equal(resolvePlanLineage({ previousPlanId: '10' }, { activePlans: [], proposedPlans: [], history: [] }), null)
})

test('mencocokkan langkah pengembalian kendaraan tanpa batch yang dipertahankan', () => {
  const returned = { id: 'step-return', sequence: 3, actionType: 'RETURN_TO_BASE', status: 'COMPLETED', completedAt: '2026-08-22T12:00:00.000Z', batch: null }
  const predecessor = { id: '10', steps: [returned] }
  const plan = { previousPlanId: '10', steps: [{ ...returned, id: 'copied-return' }] }

  assert.equal(resolvePlanLineage(plan, { activePlans: [predecessor], proposedPlans: [], history: [] }).retainedCompletedSteps, 1)
})
