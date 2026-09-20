import type { Request, Response } from 'express'
import * as ratingService from './rating.service'
import * as reputationService from './reputation.service'
import { createRatingSchema, projectIdParamSchema, userIdParamSchema } from './rating.schema'

// ─────────────────────────────────────────────────────────────
// Controller نازک — fromUserId فقط از req.user.id
// ─────────────────────────────────────────────────────────────

export async function createRating(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const input = createRatingSchema.parse(req.body)
  const rating = await ratingService.createRating(req.user!, projectId, input)
  res.status(201).json({ success: true, message: 'ارزیابی ثبت شد', data: rating })
}

export async function listProjectRatings(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const items = await ratingService.listProjectRatings(req.user!, projectId)
  res.json({ success: true, message: 'ارزیابی‌های پروژه', data: { items } })
}

export async function getUserReputation(req: Request, res: Response): Promise<void> {
  const { userId } = userIdParamSchema.parse(req.params)
  const reputation = await reputationService.getUserReputation(userId)
  res.json({ success: true, message: 'اعتبار کاربر', data: reputation })
}
