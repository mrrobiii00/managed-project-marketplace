import type { Request, Response } from 'express'
import * as projectService from './project.service'
import {
  createProjectSchema,
  updateProjectSchema,
  projectIdParamSchema,
} from './project.schema'
import { paginationSchema } from '../../utils/pagination'

// ─────────────────────────────────────────────────────────────
// Controller نازک — مالکیت (clientId) فقط از req.user.id
// ─────────────────────────────────────────────────────────────

export async function createProject(req: Request, res: Response): Promise<void> {
  const input = createProjectSchema.parse(req.body)
  const project = await projectService.createProject(req.user!.id, input)
  res.status(201).json({ success: true, message: 'پروژه با موفقیت ایجاد شد', data: project })
}

export async function listMyProjects(req: Request, res: Response): Promise<void> {
  const pagination = paginationSchema.parse(req.query)
  const result = await projectService.listMyProjects(req.user!.id, pagination)
  res.json({ success: true, message: 'پروژه‌های من', data: result })
}

export async function getProject(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params)
  const project = await projectService.getProject(id, req.user!.id)
  res.json({ success: true, message: 'جزئیات پروژه', data: project })
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params)
  const input = updateProjectSchema.parse(req.body)
  const project = await projectService.updateProject(req.user!.id, id, input)
  res.json({ success: true, message: 'پروژه به‌روزرسانی شد', data: project })
}

export async function submitProject(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params)
  const project = await projectService.submitProject(req.user!.id, id)
  res.json({ success: true, message: 'پروژه برای بررسی ارسال شد', data: project })
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  const { id } = projectIdParamSchema.parse(req.params)
  await projectService.deleteProject(req.user!.id, id)
  res.json({ success: true, message: 'پروژه حذف شد' })
}
