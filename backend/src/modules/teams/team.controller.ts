import type { Request, Response } from 'express'
import { z } from 'zod'
import * as teamService from './team.service'

export async function getTeam(req: Request, res: Response): Promise<void> {
  const { projectId } = z.object({ projectId: z.uuid('شناسه پروژه نامعتبر است') }).parse(req.params)
  const team = await teamService.getTeamForViewer(req.user!, projectId)
  res.json({ success: true, message: 'تیم پروژه', data: team })
}
