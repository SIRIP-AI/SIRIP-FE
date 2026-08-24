import assert from 'node:assert/strict'
import test from 'node:test'

import { ProvisioningError, provisioningErrorMessage, provisioningStatuses } from './sensor-provisioning.js'

test('formats provisioning and Web Bluetooth errors', () => {
  assert.equal(provisioningErrorMessage(new ProvisioningError('Sensor tidak dapat terhubung ke Wi-Fi.')), 'Sensor tidak dapat terhubung ke Wi-Fi.')
  assert.equal(provisioningErrorMessage(new DOMException('', 'SecurityError')), 'Browser tidak diizinkan mengakses karakteristik Bluetooth sensor.')
  assert.equal(provisioningErrorMessage(new DOMException('', 'NetworkError')), 'Operasi Bluetooth gagal. Dekatkan sensor, hubungkan ulang, lalu coba lagi.')
  assert.equal(provisioningErrorMessage(new Error('internal detail')), 'Provisi Bluetooth gagal. Hubungkan ulang sensor lalu coba lagi.')
})

test('treats the firmware OFFLINE status as a provisioning result', () => {
  assert.equal(provisioningStatuses.includes('OFFLINE'), true)
})
