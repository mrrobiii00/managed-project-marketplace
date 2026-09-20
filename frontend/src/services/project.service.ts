// ─────────────────────────────────────────────────────────────
// سرویس پروژه‌ها — دقیقاً endpointهای موجود M06:
//   POST   /api/v1/projects          (CLIENT)
//   GET    /api/v1/projects/me       (CLIENT)
//   GET    /api/v1/projects/:id      (احراز هویت؛ DRAFT فقط مالک)
//   PUT    /api/v1/projects/:id      (CLIENT، فقط DRAFT|SUBMITTED)
//   POST   /api/v1/projects/:id/submit (CLIENT، فقط DRAFT)
//   DELETE /api/v1/projects/:id      (CLIENT، فقط DRAFT)
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type {
  CreateProjectInput,
  ProjectDto,
  ProjectListResult,
  UpdateProjectInput,
} from '../types/project'

export const projectService = {
  getMyProjects(page = 1, pageSize = 20): Promise<ProjectListResult> {
    return apiRequest<ProjectListResult>(
      `/projects/me?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    )
  },

  getProject(id: string): Promise<ProjectDto> {
    return apiRequest<ProjectDto>(`/projects/${encodeURIComponent(id)}`)
  },

  createProject(data: CreateProjectInput): Promise<ProjectDto> {
    return apiRequest<ProjectDto>('/projects', { method: 'POST', body: data })
  },

  updateProject(id: string, data: UpdateProjectInput): Promise<ProjectDto> {
    return apiRequest<ProjectDto>(`/projects/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: data,
    })
  },

  submitProject(id: string): Promise<ProjectDto> {
    return apiRequest<ProjectDto>(`/projects/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    })
  },

  /** موفق → resolve؛ خطا → ApiError با پیام فارسی (409/...) */
  async deleteProject(id: string): Promise<void> {
    await apiRequest<unknown>(`/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
}
