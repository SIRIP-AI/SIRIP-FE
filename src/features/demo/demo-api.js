import { api } from '@/lib/axios.js'
import { demoResetResultSchema, demoResultSchema } from './demo-schema.js'

export async function loadDemoData() {
  return demoResultSchema.parse((await api.post('/api/debug/demo')).data)
}

export async function resetDemoData() {
  return demoResetResultSchema.parse((await api.post('/api/debug/demo/reset')).data)
}

export function demoError(error) {
  return error.response?.data?.error ?? error.message ?? 'The demo action could not be completed'
}
