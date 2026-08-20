import { z } from 'zod'

import { api } from '@/lib/axios.js'

const statusSchema = z.object({ connected: z.boolean(), connectedAt: z.string().datetime().nullable(), botUrl: z.string().url().nullable() })
const linkSchema = z.object({ url: z.string().url(), expiresAt: z.string().datetime() })

export async function getTelegramStatus() {
  return statusSchema.parse((await api.get('/api/integrations/telegram')).data)
}

export async function createTelegramLink() {
  return linkSchema.parse((await api.post('/api/integrations/telegram/link')).data)
}

export async function disconnectTelegram() {
  await api.delete('/api/integrations/telegram')
}

export function telegramError(error) {
  return error.response?.data?.error ?? error.message ?? 'Telegram is unavailable'
}
