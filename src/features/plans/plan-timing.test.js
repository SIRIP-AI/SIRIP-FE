import assert from 'node:assert/strict'
import { test } from 'node:test'

import { formatDuration } from './plan-timing.js'

test('memformat durasi tepat dalam bahasa Indonesia tanpa membulatkan unit yang lebih kecil', () => {
  assert.equal(formatDuration(0), '0 detik')
  assert.equal(formatDuration(1), '1 detik')
  assert.equal(formatDuration(90), '1 menit 30 detik')
  assert.equal(formatDuration(90_061), '1 hari 1 jam 1 menit 1 detik')
})
