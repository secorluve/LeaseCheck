import { prisma } from '../lib/prisma'

export class FeedbackService {
  async create(input: { userId?: string; name: string; email: string; message: string }) {
    const feedback = await prisma.feedback.create({
      data: {
        userId: input.userId,
        name: input.name,
        email: input.email,
        message: input.message,
      },
    })

    return {
      id: feedback.id,
      createdAt: feedback.createdAt.toISOString(),
    }
  }
}
