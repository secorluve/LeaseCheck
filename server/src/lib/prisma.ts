import prismaClientPkg from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import type { PrismaClient as PrismaClientType } from '@prisma/client'
import { env } from '../config/env'

const { PrismaClient } = prismaClientPkg
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
})

const globalForPrisma = globalThis as typeof globalThis & {
  __leasecheckPrisma?: PrismaClientType
}

export const prisma =
  globalForPrisma.__leasecheckPrisma ??
  new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__leasecheckPrisma = prisma
}
