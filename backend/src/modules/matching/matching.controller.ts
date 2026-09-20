import type { Request, Response } from 'express'
import * as matchingService from './matching.service'
import { projectIdParamSchema, matchParamsSchema } from './matching.schema'
import { paginationSchema } from '../../utils/pagination'

export async function startMatching(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params)
  const result = await matchingService.startMatching(req.user!.id, id)
  res.json({ success: true, message: 'تطبیق متخصصان انجام شد', data: result })
}

export async function listMatches(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params)
  const pagination = paginationSchema.parse(req.query)
  const result = await matchingService.listMatches(req.user!, id, pagination)
  res.json({ success: true, message: 'فهرست تطبیق‌های پروژه', data: result })
}

export async function getMatchDetails(req: Request, res: Response): Promise<void> {
  const { id, specialistId } = matchParamsSchema.parse(req.params)
  const result = await matchingService.getMatchDetails(req.user!, id, specialistId)
  res.json({ success: true, message: 'جزئیات تطبیق', data: result })
}
