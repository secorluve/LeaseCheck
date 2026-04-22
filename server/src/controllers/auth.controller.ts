import type { Request, Response } from 'express'
import { successResponse } from '../utils/api-response'
import { AuthService } from '../services/auth.service'

const authService = new AuthService()

export async function registerController(req: Request, res: Response) {
  const payload = await authService.register(req.body)
  res.status(201).json(successResponse(payload))
}

export async function loginController(req: Request, res: Response) {
  const payload = await authService.login(req.body)
  res.json(successResponse(payload))
}

export async function meController(req: Request, res: Response) {
  const payload = await authService.me(req.user!.sub)
  res.json(successResponse(payload))
}
