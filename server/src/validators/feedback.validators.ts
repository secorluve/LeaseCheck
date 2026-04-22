import { z } from 'zod'

export const feedbackSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email('Invalid email address').transform((value) => value.trim().toLowerCase()),
  message: z.string().trim().min(10).max(2000),
})
