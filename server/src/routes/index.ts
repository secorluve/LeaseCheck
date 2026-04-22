import { Router } from 'express'
import authRoutes from './auth.routes'
import analysisRoutes from './analysis.routes'
import feedbackRoutes from './feedback.routes'
import { successResponse } from '../utils/api-response'

const router = Router()

router.get('/health', (_req, res) => {
  res.json(
    successResponse({
      status: 'ok',
      service: 'leasecheck-api',
      timestamp: new Date().toISOString(),
    }),
  )
})

router.use('/auth', authRoutes)
router.use('/analysis', analysisRoutes)
router.use('/feedback', feedbackRoutes)

export default router
