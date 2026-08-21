import { api } from '@/lib/axios.js'
import { demoResetResultSchema, demoResultSchema } from './demo-schema.js'

export async function loadDemoData() {
  return demoResultSchema.parse((await api.post('/api/debug/demo')).data)
}

export async function resetDemoAccount() {
  return demoResetResultSchema.parse((await api.post('/api/debug/demo/reset')).data)
}

export function demoError(error) {
  return error.response?.data?.error ?? error.message ?? 'Demo data could not be generated'
}
