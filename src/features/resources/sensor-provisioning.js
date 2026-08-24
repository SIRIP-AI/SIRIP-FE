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
  'OFFLINE',
  'INVALID_CONFIG',
]

const terminalStatuses = new Set(['SUCCESS', 'WIFI_FAILED', 'BACKEND_FAILED', 'OFFLINE', 'INVALID_CONFIG'])
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export class ProvisioningError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ProvisioningError'
    this.status = status
  }
}

const bluetoothErrorMessages = {
  InvalidStateError: 'Koneksi Bluetooth tidak lagi aktif. Hubungkan ulang sensor lalu coba lagi.',
  NetworkError: 'Operasi Bluetooth gagal. Dekatkan sensor, hubungkan ulang, lalu coba lagi.',
  NotFoundError: 'Tidak ada sensor yang dipilih.',
  NotReadableError: 'Bluetooth sedang digunakan atau tidak dapat diakses. Periksa adaptor Bluetooth lalu coba lagi.',
  NotSupportedError: 'Operasi Bluetooth ini tidak didukung oleh perangkat atau browser.',
  OperationError: 'Sensor menolak operasi Bluetooth. Hubungkan ulang sensor lalu coba lagi.',
  SecurityError: 'Browser tidak diizinkan mengakses karakteristik Bluetooth sensor.',
}

export function provisioningErrorMessage(error) {
  if (error?.name === 'ProvisioningError' && error.message) return error.message
  return bluetoothErrorMessages[error?.name] ?? 'Provisi Bluetooth gagal. Hubungkan ulang sensor lalu coba lagi.'
}

export function bluetoothSupportError() {
  if (!window.isSecureContext) return 'Provisi Bluetooth memerlukan HTTPS atau localhost.'
  if (!navigator.bluetooth) return 'Provisi Bluetooth memerlukan Chrome desktop dengan Bluetooth aktif.'
  return null
}

export function defaultDeviceBackendUrl() {
  return import.meta.env.VITE_DEVICE_API_URL?.trim() ?? ''
}

export function deviceBackendUrl(value) {
  value = value.trim()
  if (!value) throw new ProvisioningError('Masukkan alamat yang dapat dijangkau ESP32 di jaringan ini.')
  let url
  try {
    url = new URL(value)
  } catch {
    throw new ProvisioningError('URL backend harus berupa URL HTTP atau HTTPS yang valid.')
  }
  if (!['http:', 'https:'].includes(url.protocol) || ['localhost', '127.0.0.1', '0.0.0.0', '::1', '::', '[::1]', '[::]'].includes(url.hostname)) {
    throw new ProvisioningError('URL backend harus menggunakan alamat HTTP atau HTTPS yang dapat dijangkau melalui LAN, bukan localhost atau alamat karakter pengganti.')
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new ProvisioningError('URL backend hanya boleh memuat asal, misalnya http://192.168.1.10:3000.')
  }
  return url.origin
}

function decode(value) {
  return decoder.decode(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)).trim()
}

function validateText(value, label, maximumBytes) {
  if (!value || encoder.encode(value).byteLength > maximumBytes) {
    throw new ProvisioningError(`${label} wajib diisi dan maksimal ${maximumBytes} byte UTF-8.`, 'INVALID_CONFIG')
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
    if (!deviceUid || encoder.encode(deviceUid).byteLength > 100) throw new ProvisioningError('Perangkat yang dipilih tidak memberikan UID perangkat yang valid.', 'INVALID_CONFIG')
  } catch (error) {
    if (device.gatt.connected) device.gatt.disconnect()
    throw error
  }

  return {
    name: device.name || 'Sensor SIRIP',
    deviceUid,
    disconnect() {
      if (device.gatt.connected) device.gatt.disconnect()
    },
    async provision({ wifiSsid, wifiPassword, sensorCode, backendUrl, onStatus }) {
      validateText(wifiSsid, 'Wi-Fi SSID', 32)
      if (wifiPassword && (encoder.encode(wifiPassword).byteLength < 8 || encoder.encode(wifiPassword).byteLength > 63)) {
        throw new ProvisioningError('Kata sandi Wi-Fi harus kosong atau sepanjang 8 hingga 63 byte UTF-8.', 'INVALID_CONFIG')
      }
      validateText(sensorCode, 'ID sensor', 100)
      validateText(backendUrl, 'URL backend', 255)
      const statusCharacteristic = characteristics.status
      await statusCharacteristic.startNotifications()

      return new Promise((resolve, reject) => {
        let settled = false
        const timeout = window.setTimeout(() => finish(new ProvisioningError('Provisi sensor tidak selesai dalam 60 detik.')), 60_000)

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
          finish(new ProvisioningError('Koneksi Bluetooth ke sensor terputus.'))
        }

        function handleStatus(event) {
          const status = decode(event.target.value)
          if (!provisioningStatuses.includes(status)) return
          onStatus(status)
          if (!terminalStatuses.has(status)) return
          if (status === 'SUCCESS') finish()
          else finish(new ProvisioningError(['WIFI_FAILED', 'OFFLINE'].includes(status) ? 'Sensor tidak dapat terhubung ke Wi-Fi.' : status === 'BACKEND_FAILED' ? 'Sensor terhubung ke Wi-Fi, tetapi tidak dapat menjangkau backend SIRIP.' : 'Sensor menolak konfigurasi provisi.', status))
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
