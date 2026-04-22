import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  analysisByIdController,
  analysisHistoryController,
  createAnalysisController,
  deleteAnalysisController,
} from '../controllers/analysis.controller'
import { optionalAuth, requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate.middleware'
import { asyncHandler } from '../utils/async-handler'
import {
  analysisHistoryQuerySchema,
  analysisIdParamSchema,
  createAnalysisSchema,
} from '../validators/analysis.validators'

const router = Router()

const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/', analysisLimiter, optionalAuth, validate(createAnalysisSchema), asyncHandler(createAnalysisController))
router.get('/history', requireAuth, validate(analysisHistoryQuerySchema, 'query'), asyncHandler(analysisHistoryController))
router.get('/:id', requireAuth, validate(analysisIdParamSchema, 'params'), asyncHandler(analysisByIdController))
router.delete('/:id', requireAuth, validate(analysisIdParamSchema, 'params'), asyncHandler(deleteAnalysisController))

export default router
