import { z } from 'zod'

import { api } from '@/lib/axios.js'

export const loginInputSchema = z.object({
  email: z.email('Masukkan alamat email yang valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

export const signupInputSchema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100, 'Nama maksimal 100 karakter'),
  email: z.email('Masukkan alamat email yang valid'),
  phone: z.string().trim().regex(/^\+?[0-9][0-9 ()-]{6,19}$/, 'Masukkan nomor telepon yang valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter').max(200, 'Kata sandi maksimal 200 karakter'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Kata sandi tidak cocok',
  path: ['confirmPassword'],
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

export async function signup(input) {
  const registration = signupInputSchema.parse(input)
  return authResponseSchema.parse((await api.post('/api/auth/signup', {
    name: registration.name,
    email: registration.email,
    phone: registration.phone,
    password: registration.password,
  })).data).user
}

export async function logout() {
  await api.delete('/api/auth/session')
}

export function authError(error) {
  if (error.response?.status === 401) return 'Email atau kata sandi salah'
  if (error.response?.status === 409) return 'Email sudah terdaftar'
  return 'Tidak dapat memproses akun. Silakan coba lagi.'
}
