import { api } from '@/lib/axios.js'
import { demoResetResultSchema, demoResultSchema } from './demo-schema.js'

export async function loadDemoData() {
  return demoResultSchema.parse((await api.post('/api/debug/demo')).data)
}

export async function resetDemoData() {
  return demoResetResultSchema.parse((await api.post('/api/debug/demo/reset')).data)
}

export function demoError(error) {
  if (error?.response?.data?.error) return error.response.data.error
  return error?.request && !error.response ? 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' : 'Tindakan demo tidak dapat diselesaikan. Silakan coba lagi.'
}
