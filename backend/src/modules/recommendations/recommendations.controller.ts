import type { Request, Response } from 'express'
import * as recommendationsService from './recommendations.service'
import { listRecommendationsQuerySchema, projectIdParamSchema } from './recommendations.schema'

// ─────────────────────────────────────────────────────────────
// Controller نازک — هویت فقط از req.user.id (توکن)
// ─────────────────────────────────────────────────────────────

export async function listMyRecommendations(req: Request, res: Response): Promise<void> {
  const pagination = listRecommendationsQuerySchema.parse(req.query)
  const result = await recommendationsService.listMyRecommendations(req.user!.id, pagination)
  res.json({ success: true, message: 'پروژه‌های پیشنهادی شما', data: result })
}

export async function countMyRecommendations(req: Request, res: Response): Promise<void> {
  const count = await recommendationsService.countMyRecommendations(req.user!.id)
  res.json({ success: true, message: 'تعداد پیشنهادهای فعال', data: { count } })
}

export async function getMyRecommendation(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const result = await recommendationsService.getMyRecommendation(req.user!.id, projectId)
  res.json({ success: true, message: 'جزئیات پیشنهاد', data: result })
}
