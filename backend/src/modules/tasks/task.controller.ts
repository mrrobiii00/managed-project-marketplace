import type { Request, Response } from 'express'
import * as taskService from './task.service'
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  taskParamsSchema,
  projectIdParamSchema,
} from './task.schema'

// ─────────────────────────────────────────────────────────────
// Controller نازک — احراز هویت در router، مجوزها در Service
// ─────────────────────────────────────────────────────────────

export async function createTask(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const input = createTaskSchema.parse(req.body)
  const task = await taskService.createTask(req.user!, projectId, input)
  res.status(201).json({ success: true, message: 'تسک ایجاد شد', data: task })
}

export async function listTasks(req: Request, res: Response): Promise<void> {
  const { projectId } = projectIdParamSchema.parse(req.params)
  const query = listTasksQuerySchema.parse(req.query)
  const result = await taskService.listTasks(req.user!, projectId, query)
  res.json({ success: true, message: 'فهرست تسک‌های پروژه', data: result })
}

export async function getTask(req: Request, res: Response): Promise<void> {
  const { projectId, taskId } = taskParamsSchema.parse(req.params)
  const task = await taskService.getTask(req.user!, projectId, taskId)
  res.json({ success: true, message: 'جزئیات تسک', data: task })
}

export async function updateTask(req: Request, res: Response): Promise<void> {
  const { projectId, taskId } = taskParamsSchema.parse(req.params)
  const input = updateTaskSchema.parse(req.body)
  const task = await taskService.updateTask(req.user!, projectId, taskId, input)
  res.json({ success: true, message: 'تسک به‌روزرسانی شد', data: task })
}

export async function deleteTask(req: Request, res: Response): Promise<void> {
  const { projectId, taskId } = taskParamsSchema.parse(req.params)
  await taskService.deleteTask(req.user!, projectId, taskId)
  res.json({ success: true, message: 'تسک حذف شد' })
}
