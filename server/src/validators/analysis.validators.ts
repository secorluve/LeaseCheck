import { z } from 'zod'

export const createAnalysisSchema = z
  .object({
    url: z.url('Invalid listing URL').optional(),
    manualText: z.string().trim().min(20, 'Manual text must contain at least 20 characters').max(12000).optional(),
    title: z.string().trim().min(3).max(240).optional(),
    location: z.string().trim().min(2).max(240).optional(),
    price: z.coerce.number().int().positive().max(1000000000).optional(),
    saveReport: z.boolean().optional().default(false),
  })
  .superRefine((value, ctx) => {
    if (!value.url && !value.manualText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either a listing URL or manual listing text',
        path: ['url'],
      })
    }
  })

export const analysisHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export const analysisIdParamSchema = z.object({
  id: z.uuid('Invalid analysis identifier'),
})
