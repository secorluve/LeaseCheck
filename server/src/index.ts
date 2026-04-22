import { createServer } from 'node:http'
import { env } from './config/env'
import { logger } from './config/logger'
import { prisma } from './lib/prisma'
import { createApp } from './app'
import { seedSubscriptionPlans } from './services/bootstrap.service'

async function bootstrap() {
  await prisma.$connect()
  await seedSubscriptionPlans()

  const app = createApp()
  const server = createServer(app)

  server.listen(env.PORT, () => {
    logger.info('LeaseCheck API started', {
      port: env.PORT,
      env: env.NODE_ENV,
    })
  })

  const shutdown = async (signal: string) => {
    logger.info('Shutting down server', { signal })

    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
}

bootstrap().catch(async (error) => {
  logger.error('Server bootstrap failed', {
    error: error instanceof Error ? error.message : 'unknown_error',
  })
  await prisma.$disconnect()
  process.exit(1)
})
