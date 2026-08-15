import { z } from 'zod'

import { api } from '@/lib/axios.js'

export const coldStorageStatuses = ['AVAILABLE', 'FULL', 'UNAVAILABLE']
export const vehicleStatuses = ['AVAILABLE', 'ASSIGNED', 'DELAYED', 'UNAVAILABLE']

export const coldStorageInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  capacityKg: z.number().positive('Capacity must be greater than zero'),
  availableCapacityKg: z.number().nonnegative('Available capacity cannot be negative'),
  status: z.enum(coldStorageStatuses),
}).refine((value) => value.availableCapacityKg <= value.capacityKg, {
  message: 'Available capacity cannot exceed total capacity',
  path: ['availableCapacityKg'],
})

export const vehicleInputSchema = z.object({
  code: z.string().trim().min(1, 'Truck ID is required').max(100),
  capacityKg: z.number().positive('Capacity must be greater than zero'),
  status: z.enum(vehicleStatuses),
  delayMinutes: z.number().int().nonnegative('Delay cannot be negative'),
  availableFrom: z.string().datetime().nullable(),
})

const coldStorageSchema = coldStorageInputSchema.safeExtend({
  id: z.string(),
  updatedAt: z.string().datetime(),
})

const vehicleSchema = vehicleInputSchema.safeExtend({
  id: z.string(),
  updatedAt: z.string().datetime(),
})

const resources = {
  'cold-storages': { response: z.array(coldStorageSchema), input: coldStorageInputSchema },
  vehicles: { response: z.array(vehicleSchema), input: vehicleInputSchema },
}

export async function listResources(type) {
  return resources[type].response.parse((await api.get(`/api/${type}`)).data)
}

export async function saveResource(type, resource) {
  const input = resources[type].input.parse(resource)
  const response = resource.id
    ? await api.put(`/api/${type}/${resource.id}`, input)
    : await api.post(`/api/${type}`, input)
  const schema = type === 'cold-storages' ? coldStorageSchema : vehicleSchema
  return schema.parse(response.data)
}

export async function deleteResource(type, id) {
  await api.delete(`/api/${type}/${id}`)
}

export function apiError(error) {
  return error.response?.data?.error ?? error.message ?? 'Something went wrong'
}
