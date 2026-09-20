// ─────────────────────────────────────────────────────────────
// سرویس داشبورد مدیریت — endpointهای واقعی M12:
//   GET /api/v1/admin/dashboard/summary        (خلاصه‌ی کل سیستم)
//   GET /api/v1/admin/dashboard/recent-projects (آخرین پروژه‌ها)
//   GET /api/v1/admin/dashboard/attention       (نیازمند بررسی)
//   GET /api/v1/admin/dashboard/match-summary   (خلاصه‌ی تطبیق‌ها)
// همه فقط ADMIN؛ هویت از توکن.
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'

/** مطابق قرارداد واقعی GET /admin/dashboard/summary (M12) */
export interface AdminSummaryDto {
  users: {
    total: number
    clients: number
    specialists: number
    admins: number
    active: number
    inactive: number
  }
  projects: {
    total: number
    draft: number
    submitted: number
    matching: number
    review: number
    teamProposed: number
    inProgress: number
    completed: number
    rated: number
    cancelled: number
  }
  matches: { recommended: number; needsReview: number; rejected: number }
  teams: { proposed: number; active: number; completed: number }
  tasks: { todo: number; inProgress: number; done: number }
}

/** آیتم recent-projects / attention — دقیقاً DashboardProjectItemDto بک‌اند (M12) */
export interface AdminProjectItemDto {
  id: string
  title: string
  status: string
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  createdAt: string
  client: { id: string; fullName: string | null }
}

export interface AdminProjectListResult {
  items: AdminProjectItemDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** دقیقاً MatchSummaryDto بک‌اند (M12) */
export interface AdminMatchSummaryDto {
  recommended: number
  needsReview: number
  rejected: number
  total: number
}

export const adminService = {
  getSummary(): Promise<AdminSummaryDto> {
    return apiRequest<AdminSummaryDto>('/admin/dashboard/summary')
  },

  getRecentProjects(page = 1, pageSize = 5): Promise<AdminProjectListResult> {
    return apiRequest<AdminProjectListResult>(
      `/admin/dashboard/recent-projects?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    )
  },

  getAttentionProjects(page = 1, pageSize = 5): Promise<AdminProjectListResult> {
    return apiRequest<AdminProjectListResult>(
      `/admin/dashboard/attention?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    )
  },

  getMatchSummary(): Promise<AdminMatchSummaryDto> {
    return apiRequest<AdminMatchSummaryDto>('/admin/dashboard/match-summary')
  },
}
