import type { Request, Response } from 'express'
import * as skillsService from './skills.service'
import { listSkillsQuerySchema } from './skills.schema'

export async function listSkills(req: Request, res: Response): Promise<void> {
  const query = listSkillsQuerySchema.parse(req.query)
  const result = await skillsService.listSkills(query)
  res.json({ success: true, message: 'فهرست مهارت‌ها', data: result })
}
