import assert from 'node:assert/strict'
import test from 'node:test'

import { z } from 'zod'
import { createPlanChangeResultSchema } from './plan-change-schema.js'

const generationResultSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('PROPOSAL'), proposal: z.object({ id: z.string() }) }),
  z.strictObject({ status: z.literal('NO_VALID_PROPOSAL_FOUND'), reason: z.string().min(1) }),
])
const planChangeResultSchema = createPlanChangeResultSchema(generationResultSchema)

test('parses report changes separately from preference revisions', () => {
  const noProposal = { status: 'NO_VALID_PROPOSAL_FOUND', reason: 'Tidak ada kendaraan tersedia.' }
  const report = planChangeResultSchema.parse({ kind: 'REPORT_APPLIED', report: { kind: 'VEHICLE_STATUS', entityName: 'TR-01', value: 'UNAVAILABLE' }, eventId: '9', generation: noProposal })
  const preference = planChangeResultSchema.parse({ kind: 'PREFERENCE_REVISION', generation: noProposal })

  assert.equal(report.report.entityName, 'TR-01')
  assert.equal(preference.generation.status, 'NO_VALID_PROPOSAL_FOUND')
});

test('rejects unsupported report values and response drift', () => {
  const generation = { status: 'NO_VALID_PROPOSAL_FOUND', reason: 'No proposal.' }
  assert.throws(() => planChangeResultSchema.parse({ kind: 'REPORT_APPLIED', report: { kind: 'VEHICLE_STATUS', entityName: 'TR-01', value: 'BROKEN' }, eventId: '9', generation }))
  assert.throws(() => planChangeResultSchema.parse({ kind: 'PREFERENCE_REVISION', generation, extra: true }))
});
