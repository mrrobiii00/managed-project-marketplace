// ─────────────────────────────────────────────────────────────
// سرویس تسک‌ها — دقیقاً endpointهای موجود M09:
//   GET    /api/v1/projects/:projectId/tasks          (فیلتر + pagination)
//   GET    /api/v1/projects/:projectId/tasks/:taskId
//   POST   /api/v1/projects/:projectId/tasks          (SPECIALIST: خودتخصیصی)
//   PUT    /api/v1/projects/:projectId/tasks/:taskId  (SPECIALIST: فقط status)
//   DELETE /api/v1/projects/:projectId/tasks/:taskId  (SPECIALIST → 403 بک‌اند)
//
// ⚠️ deleteTask فقط در UI کارفرما (M14-F) استفاده می‌شود — بک‌اند
// حذف را به ADMIN و CLIENT مالک محدود کرده (SPECIALIST → 403).
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type {
  CreateTaskPayload,
  TaskDto,
  TaskListQuery,
  TaskPagination,
  UpdateTaskPayload,
} from '../types/task'

function toQueryString(query: TaskListQuery): string {
  const params = new URLSearchParams()
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize))
  if (query.status !== undefined) params.set('status', query.status)
  if (query.priority !== undefined) params.set('priority', query.priority)
  if (query.assignedTo !== undefined) params.set('assignedTo', query.assignedTo)
  const qs = params.toString()
  return qs === '' ? '' : `?${qs}`
}

export const taskService = {
  listProjectTasks(projectId: string, query: TaskListQuery = {}): Promise<TaskPagination> {
    return apiRequest<TaskPagination>(
      `/projects/${encodeURIComponent(projectId)}/tasks${toQueryString(query)}`,
    )
  },

  getTask(projectId: string, taskId: string): Promise<TaskDto> {
    return apiRequest<TaskDto>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
    )
  },

  createTask(projectId: string, payload: CreateTaskPayload): Promise<TaskDto> {
    return apiRequest<TaskDto>(`/projects/${encodeURIComponent(projectId)}/tasks`, {
      method: 'POST',
      body: payload,
    })
  },

  /** SPECIALIST فقط { status } — بقیه‌ی فیلدها توسط بک‌اند 403 می‌شوند */
  updateTask(projectId: string, taskId: string, payload: UpdateTaskPayload): Promise<TaskDto> {
    return apiRequest<TaskDto>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'PUT', body: payload },
    )
  },

  /**
   * حذف تسک — بک‌اند فقط ADMIN و CLIENT مالک را مجاز می‌کند
   * (SPECIALIST → 403؛ فقط وضعیت TODO و پروژه‌ی IN_PROGRESS).
   * UI متخصص هرگز این متد را صدا نمی‌زند.
   */
  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await apiRequest<unknown>(
      `/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
      { method: 'DELETE' },
    )
  },
}
