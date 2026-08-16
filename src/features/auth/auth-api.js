import { z } from 'zod'

import { api } from '@/lib/axios.js'

export const loginInputSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  phone: z.string(),
})

const authResponseSchema = z.object({ user: userSchema })

export const sessionQueryOptions = {
  queryKey: ['auth', 'session'],
  queryFn: async () => {
    try {
      return authResponseSchema.parse((await api.get('/api/auth/session')).data).user
    } catch (error) {
      if (error.response?.status === 401) return null
      throw error
    }
  },
  retry: false,
  staleTime: 5 * 60 * 1000,
}

export async function login(credentials) {
  return authResponseSchema.parse((await api.post('/api/auth/login', loginInputSchema.parse(credentials))).data).user
}

export async function logout() {
  await api.delete('/api/auth/session')
}

export function authError(error) {
  return error.response?.data?.error ?? error.message ?? 'Unable to sign in'
}
