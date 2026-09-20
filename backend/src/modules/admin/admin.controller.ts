import type { Request, Response } from 'express'
import * as adminService from './admin.service'
import { paginationSchema } from '../../utils/pagination'
import {
  decisionSchema,
  createTeamSchema,
  updateTeamSchema,
  projectMatchParamsSchema,
  projectIdParamSchema,
  dashboardPaginationSchema,
} from './admin.schema'
import { projectIdParamSchema as matchingProjectIdSchema } from '../matching/matching.schema'

// ─────────────────────────────────────────────────────────────
// Controller نازک Admin — تمام مسیرها requireAuth + ADMIN در router
// ─────────────────────────────────────────────────────────────

export async function reviewProject(req: Request, res: Response): Promise<void> {
  const { id } = matchingProjectIdSchema.parse(req.params)
  const project = await adminService.moveProjectToReview(id)
  res.json({ success: true, message: 'پروژه وارد مرحله‌ی بررسی شد', data: project })
}

export async function startProject(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const result = await adminService.startProjectExecution(projectId)
  res.json({ success: true, message: 'اجرای پروژه آغاز شد', data: result })
}

export async function completeProject(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const result = await adminService.completeProjectExecution(projectId)
  res.json({ success: true, message: 'پروژه با موفقیت تکمیل شد', data: result })
}

export async function listMatches(req: Request, res: Response): Promise<void> {
  const { id } = matchingProjectIdSchema.parse(req.params)
  const pagination = paginationSchema.parse(req.query)
  const result = await adminService.adminListMatches(id, pagination)
  res.json({ success: true, message: 'تطبیق‌های پروژه (نمای ادمین)', data: result })
}

export async function decideMatch(req: Request, res: Response): Promise<void> {
  const { projectId, specialistId } = projectMatchParamsSchema.parse(req.params)
  const { decision } = decisionSchema.parse(req.body)
  const result = await adminService.decideMatch(projectId, specialistId, decision)
  const m = result.match
  res.json({
    success: true,
    message: result.note,
    data: {
      projectId: m.projectId,
      specialistId: m.specialistId,
      status: m.status,
      totalScore: Number(m.totalScore),
      trustScore: Number(m.trustScore),
      changed: result.changed,
    },
  })
}

export async function createTeam(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const input = createTeamSchema.parse(req.body)
  const team = await adminService.createTeam(projectId, input)
  res.status(201).json({ success: true, message: 'تیم پیشنهادی پروژه تشکیل شد', data: team })
}

export async function updateTeam(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const input = updateTeamSchema.parse(req.body)
  const team = await adminService.updateTeam(projectId, input)
  res.json({ success: true, message: 'تیم به‌روزرسانی شد', data: team })
}

// ─────────────────────────────────────────────────────────────
// M12 — Admin Dashboard (فقط خواندنی؛ RBAC در router اعمال شده)
// ─────────────────────────────────────────────────────────────

export async function dashboardSummary(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getDashboardSummary()
  res.json({ success: true, message: 'خلاصه داشبورد مدیریت', data })
}

export async function dashboardRecentProjects(req: Request, res: Response): Promise<void> {
  const pagination = dashboardPaginationSchema.parse(req.query)
  const data = await adminService.listRecentProjects(pagination)
  res.json({ success: true, message: 'آخرین پروژه‌ها', data })
}

export async function dashboardAttention(req: Request, res: Response): Promise<void> {
  const pagination = dashboardPaginationSchema.parse(req.query)
  const data = await adminService.listAttentionProjects(pagination)
  res.json({ success: true, message: 'پروژه‌های نیازمند بررسی مدیریت', data })
}

export async function dashboardMatchSummary(_req: Request, res: Response): Promise<void> {
  const data = await adminService.getMatchSummary()
  res.json({ success: true, message: 'خلاصه وضعیت تطبیق‌ها', data })
}
