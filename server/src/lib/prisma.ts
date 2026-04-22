import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  __leasecheckPrisma?: PrismaClient
}

export const prisma =
  globalForPrisma.__leasecheckPrisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__leasecheckPrisma = prisma
}
