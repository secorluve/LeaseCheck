import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword } from '../lib/hash'
import { signAccessToken } from '../lib/jwt'
import { ApiError } from '../utils/api-error'
import type { AuthPayloadDto, PublicUserDto } from '../types/api'

function toPublicUserDto(user: {
  id: string
  name: string
  email: string
  role: string
  createdAt: Date
  subscriptionPlan: { code: string; name: string; description: string | null } | null
}): PublicUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    subscriptionPlan: user.subscriptionPlan
      ? {
          code: user.subscriptionPlan.code,
          name: user.subscriptionPlan.name,
          description: user.subscriptionPlan.description,
        }
      : null,
  }
}

async function findDefaultPlan() {
  return prisma.subscriptionPlan.findUnique({
    where: { code: 'FREE' },
  })
}

export class AuthService {
  async register(input: { name: string; email: string; password: string }): Promise<AuthPayloadDto> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })

    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists')
    }

    const defaultPlan = await findDefaultPlan()
    const passwordHash = await hashPassword(input.password)

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        subscriptionPlanId: defaultPlan?.id,
      },
      include: {
        subscriptionPlan: {
          select: {
            code: true,
            name: true,
            description: true,
          },
        },
      },
    })

    const publicUser = toPublicUserDto(user)

    return {
      user: publicUser,
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    }
  }

  async login(input: { email: string; password: string }): Promise<AuthPayloadDto> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        subscriptionPlan: {
          select: {
            code: true,
            name: true,
            description: true,
          },
        },
      },
    })

    if (!user) {
      throw new ApiError(401, 'Invalid email or password')
    }

    const passwordOk = await verifyPassword(input.password, user.passwordHash)

    if (!passwordOk) {
      throw new ApiError(401, 'Invalid email or password')
    }

    return {
      user: toPublicUserDto(user),
      accessToken: signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
      }),
    }
  }

  async me(userId: string): Promise<PublicUserDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptionPlan: {
          select: {
            code: true,
            name: true,
            description: true,
          },
        },
      },
    })

    if (!user) {
      throw new ApiError(404, 'User not found')
    }

    return toPublicUserDto(user)
  }
}
