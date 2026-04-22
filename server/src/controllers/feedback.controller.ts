import type { Request, Response } from 'express'
import { FeedbackService } from '../services/feedback.service'
import { successResponse } from '../utils/api-response'

const feedbackService = new FeedbackService()

export async function createFeedbackController(req: Request, res: Response) {
  const payload = await feedbackService.create({
    ...req.body,
    userId: req.user?.sub,
  })

  res.status(201).json(successResponse(payload))
}
