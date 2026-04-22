import type { AuthTokenPayload } from '../lib/jwt'

declare global {
  namespace Express {
    interface Request {
      requestId?: string
      user?: AuthTokenPayload
    }
  }
}

export {}
