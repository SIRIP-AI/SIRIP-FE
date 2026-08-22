import { api } from '@/lib/axios.js'
import { demoResultSchema } from './demo-schema.js'

export async function loadDemoData() {
  return demoResultSchema.parse((await api.post('/api/debug/demo')).data)
}

export function demoError(error) {
  return error.response?.data?.error ?? error.message ?? 'Demo data could not be generated'
}
