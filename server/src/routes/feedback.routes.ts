import { Router } from 'express'
import { createFeedbackController } from '../controllers/feedback.controller'
import { optionalAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { feedbackSchema } from '../validators/feedback.validators'

const router = Router()

router.post('/', optionalAuth, validate(feedbackSchema), asyncHandler(createFeedbackController))

export default router
