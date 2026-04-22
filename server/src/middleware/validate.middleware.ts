import type { NextFunction, Request, Response } from 'express'
import type { ZodTypeAny } from 'zod'
import { ApiError } from '../utils/api-error'

type Target = 'body' | 'query' | 'params'

export function validate(schema: ZodTypeAny, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target])

    if (!result.success) {
      next(
        new ApiError(400, 'Validation failed', {
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        }),
      )
      return
    }

    req[target] = result.data
    next()
  }
}
