import type { NextFunction, Request, Response } from 'express'
import { logger } from '../config/logger'
import { errorResponse } from '../utils/api-response'
import { ApiError } from '../utils/api-error'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const apiError =
    err instanceof ApiError
      ? err
      : new ApiError(500, 'Internal server error', err instanceof Error ? { cause: err.message } : undefined)

  logger.error('Request failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: apiError.statusCode,
    message: apiError.message,
    details: apiError.details,
    stack: err instanceof Error ? err.stack : undefined,
  })

  res.status(apiError.statusCode).json(errorResponse(apiError.message, apiError.details))
}
