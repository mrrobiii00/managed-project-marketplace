// ─────────────────────────────────────────────────────────────
// سرویس پیشنهادها — دقیقاً endpointهای موجود M11:
//   GET /api/v1/specialists/me/recommended-projects         (لیست + pagination)
//   GET /api/v1/specialists/me/recommended-projects/count   (شمارش)
//   GET /api/v1/specialists/me/recommended-projects/:projectId (جزئیات)
// همگی فقط SPECIALIST؛ هویت از توکن (specialistId هرگز ارسال نمی‌شود).
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type {
  RecommendationDetail,
  RecommendationListResult,
} from '../types/recommendation'

export const recommendationService = {
  getRecommendedProjects(page = 1, pageSize = 20): Promise<RecommendationListResult> {
    return apiRequest<RecommendationListResult>(
      `/specialists/me/recommended-projects?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`,
    )
  },

  getRecommendedProject(projectId: string): Promise<RecommendationDetail> {
    return apiRequest<RecommendationDetail>(
      `/specialists/me/recommended-projects/${encodeURIComponent(projectId)}`,
    )
  },

  /** endpoint واقعی count در M11 وجود دارد و استفاده می‌شود */
  getRecommendationCount(): Promise<number> {
    return apiRequest<{ count: number }>('/specialists/me/recommended-projects/count').then(
      (d) => d.count,
    )
  },
}
