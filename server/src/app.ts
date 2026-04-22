import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config/env'
import { errorHandler } from './middleware/error-handler.middleware'
import { notFoundHandler } from './middleware/not-found.middleware'
import { requestLogger } from './middleware/request-logger.middleware'
import apiRoutes from './routes'

function corsOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin) {
    callback(null, true)
    return
  }

  const allowedOrigins = env.CLIENT_URL.split(',').map((item) => item.trim())
  callback(null, allowedOrigins.includes(origin))
}

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  )
  app.use(helmet())
  app.use(express.json({ limit: '1mb' }))
  app.use(requestLogger)

  app.use('/api', apiRoutes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
