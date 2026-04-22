import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../lib/jwt'
import { ApiError } from '../utils/api-error'

function extractBearerToken(authorization?: string): string | null {
  if (!authorization) return null
  const [scheme, token] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    next()
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(new ApiError(401, 'Invalid or expired access token'))
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    next(new ApiError(401, 'Authentication required'))
    return
  }

  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(new ApiError(401, 'Invalid or expired access token'))
  }
}
