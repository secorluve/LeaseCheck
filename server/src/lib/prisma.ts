import prismaClientPkg from '@prisma/client'
import type { PrismaClient as PrismaClientType } from '@prisma/client'

const { PrismaClient } = prismaClientPkg

const globalForPrisma = globalThis as typeof globalThis & {
  __leasecheckPrisma?: PrismaClientType
}

export const prisma =
  globalForPrisma.__leasecheckPrisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__leasecheckPrisma = prisma
}
