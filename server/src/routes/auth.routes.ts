import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { loginController, meController, registerController } from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import { loginSchema, registerSchema } from '../validators/auth.validators'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(registerController))
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(loginController))
router.get('/me', requireAuth, asyncHandler(meController))

export default router
