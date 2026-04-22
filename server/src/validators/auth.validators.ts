import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, 'Password must contain at least 8 characters')
  .max(128, 'Password is too long')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must contain at least 2 characters').max(80),
  email: z.email('Invalid email address').transform((value) => value.trim().toLowerCase()),
  password: passwordSchema,
})

export const loginSchema = z.object({
  email: z.email('Invalid email address').transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1, 'Password is required'),
})
