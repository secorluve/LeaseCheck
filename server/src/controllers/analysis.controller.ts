import type { Request, Response } from 'express'
import { AnalysisService } from '../services/analysis/analysis.service'
import { successResponse } from '../utils/api-response'

const analysisService = new AnalysisService()

export async function createAnalysisController(req: Request, res: Response) {
  const payload = await analysisService.create(req.body, req.user?.sub)
  res.status(201).json(successResponse(payload))
}

export async function analysisHistoryController(req: Request, res: Response) {
  const query = req.query as unknown as { page: number; limit: number }
  const { page, limit } = query
  const payload = await analysisService.history(req.user!.sub, page, limit)
  res.json(successResponse(payload))
}

export async function analysisByIdController(req: Request, res: Response) {
  const analysisId = req.params.id as string
  const payload = await analysisService.getById(req.user!.sub, analysisId)
  res.json(successResponse(payload))
}

export async function deleteAnalysisController(req: Request, res: Response) {
  const analysisId = req.params.id as string
  await analysisService.delete(req.user!.sub, analysisId)
  res.json(successResponse({ id: analysisId }))
}
