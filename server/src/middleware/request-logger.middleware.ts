import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { logger } from '../config/logger'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now()
  const requestId = randomUUID()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)

  res.on('finish', () => {
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    })
  })

  next()
}
