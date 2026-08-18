const serviceUuid = '7d2e0001-6f4b-4c0d-9d83-2d02b76aa001'

const characteristicUuids = {
  deviceUid: '7d2e0002-6f4b-4c0d-9d83-2d02b76aa001',
  wifiSsid: '7d2e0003-6f4b-4c0d-9d83-2d02b76aa001',
  wifiPassword: '7d2e0004-6f4b-4c0d-9d83-2d02b76aa001',
  sensorCode: '7d2e0005-6f4b-4c0d-9d83-2d02b76aa001',
  backendUrl: '7d2e0006-6f4b-4c0d-9d83-2d02b76aa001',
  command: '7d2e0007-6f4b-4c0d-9d83-2d02b76aa001',
  status: '7d2e0008-6f4b-4c0d-9d83-2d02b76aa001',
}

export const provisioningStatuses = [
  'IDLE',
  'RECEIVING_CONFIG',
  'CONNECTING_WIFI',
  'CONNECTING_BACKEND',
  'SUCCESS',
  'WIFI_FAILED',
  'BACKEND_FAILED',
  'INVALID_CONFIG',
]

const terminalStatuses = new Set(['SUCCESS', 'WIFI_FAILED', 'BACKEND_FAILED', 'INVALID_CONFIG'])
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export class ProvisioningError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ProvisioningError'
    this.status = status
  }
}

export function bluetoothSupportError() {
  if (!window.isSecureContext) return 'Bluetooth provisioning requires HTTPS or localhost.'
  if (!navigator.bluetooth) return 'Bluetooth provisioning requires desktop Chrome with Bluetooth enabled.'
  return null
}

export function defaultDeviceBackendUrl() {
  return import.meta.env.VITE_DEVICE_API_URL?.trim() ?? ''
}

export function deviceBackendUrl(value) {
  value = value.trim()
  if (!value) throw new ProvisioningError('Enter an address the ESP32 can reach on this network.')
  let url
  try {
    url = new URL(value)
  } catch {
    throw new ProvisioningError('Backend URL must be a valid HTTP or HTTPS URL.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || ['localhost', '127.0.0.1', '0.0.0.0', '::1', '::', '[::1]', '[::]'].includes(url.hostname)) {
    throw new ProvisioningError('Backend URL must use a LAN-reachable HTTP or HTTPS address, not localhost or a wildcard address.')
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new ProvisioningError('Backend URL must contain only the origin, for example http://192.168.1.10:3000.')
  }
  return url.origin
}

function decode(value) {
  return decoder.decode(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)).trim()
}

function validateText(value, label, maximumBytes) {
  if (!value || encoder.encode(value).byteLength > maximumBytes) {
    throw new ProvisioningError(`${label} is required and must be at most ${maximumBytes} UTF-8 bytes.`, 'INVALID_CONFIG')
  }
}

async function write(characteristic, value) {
  await characteristic.writeValueWithResponse(typeof value === 'string' ? encoder.encode(value) : value)
}

export async function discoverSiripSensor() {
  const supportError = bluetoothSupportError()
  if (supportError) throw new ProvisioningError(supportError)

  const device = await navigator.bluetooth.requestDevice({ filters: [{ services: [serviceUuid] }] })
  const server = await device.gatt.connect()
  let characteristics
  let deviceUid
  try {
    const service = await server.getPrimaryService(serviceUuid)
    const entries = await Promise.all(Object.entries(characteristicUuids).map(async ([name, uuid]) => [name, await service.getCharacteristic(uuid)]))
    characteristics = Object.fromEntries(entries)
    deviceUid = decode(await characteristics.deviceUid.readValue())
    if (!deviceUid || encoder.encode(deviceUid).byteLength > 100) throw new ProvisioningError('The selected device did not provide a valid device UID.', 'INVALID_CONFIG')
  } catch (error) {
    if (device.gatt.connected) device.gatt.disconnect()
    throw error
  }

  return {
    name: device.name || 'SIRIP sensor',
    deviceUid,
    disconnect() {
      if (device.gatt.connected) device.gatt.disconnect()
    },
    async provision({ wifiSsid, wifiPassword, sensorCode, backendUrl, onStatus }) {
      validateText(wifiSsid, 'Wi-Fi SSID', 32)
      if (wifiPassword && (encoder.encode(wifiPassword).byteLength < 8 || encoder.encode(wifiPassword).byteLength > 63)) {
        throw new ProvisioningError('Wi-Fi password must be empty or between 8 and 63 UTF-8 bytes.', 'INVALID_CONFIG')
      }
      validateText(sensorCode, 'Sensor ID', 100)
      validateText(backendUrl, 'Backend URL', 255)
      const statusCharacteristic = characteristics.status
      await statusCharacteristic.startNotifications()

      return new Promise((resolve, reject) => {
        let settled = false
        const timeout = window.setTimeout(() => finish(new ProvisioningError('The sensor did not finish provisioning within 60 seconds.')), 60_000)

        function finish(error) {
          if (settled) return
          settled = true
          window.clearTimeout(timeout)
          statusCharacteristic.removeEventListener('characteristicvaluechanged', handleStatus)
          device.removeEventListener('gattserverdisconnected', handleDisconnected)
          if (error) reject(error)
          else resolve()
        }

        function handleDisconnected() {
          finish(new ProvisioningError('The Bluetooth connection to the sensor was lost.'))
        }

        function handleStatus(event) {
          const status = decode(event.target.value)
          if (!provisioningStatuses.includes(status)) return
          onStatus(status)
          if (!terminalStatuses.has(status)) return
          if (status === 'SUCCESS') finish()
          else finish(new ProvisioningError(status === 'WIFI_FAILED' ? 'The sensor could not connect to Wi-Fi.' : status === 'BACKEND_FAILED' ? 'The sensor reached Wi-Fi but could not reach the SIRIP backend.' : 'The sensor rejected the provisioning configuration.', status))
        }

        statusCharacteristic.addEventListener('characteristicvaluechanged', handleStatus)
        device.addEventListener('gattserverdisconnected', handleDisconnected)
        Promise.resolve()
          .then(() => write(characteristics.wifiSsid, wifiSsid))
          .then(() => write(characteristics.wifiPassword, wifiPassword))
          .then(() => write(characteristics.sensorCode, sensorCode))
          .then(() => write(characteristics.backendUrl, backendUrl))
          .then(() => write(characteristics.command, new Uint8Array([1])))
          .catch((error) => finish(error))
      })
    },
  }
}
