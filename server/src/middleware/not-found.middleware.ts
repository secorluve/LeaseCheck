import type { Request, Response } from 'express'
import { errorResponse } from '../utils/api-response'

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json(errorResponse('Route not found'))
}
