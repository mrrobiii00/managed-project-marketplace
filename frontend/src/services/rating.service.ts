// ─────────────────────────────────────────────────────────────
// سرویس Rating/Reputation — دقیقاً endpointهای واقعی M10:
//   POST /api/v1/projects/:projectId/ratings        (طرف پروژه؛ از COMPLETED)
//   GET  /api/v1/projects/:projectId/ratings        (طرف پروژه/ADMIN)
//   GET  /api/v1/users/:userId/reputation           (احراز هویت‌شده)
// fromUserId همیشه از توکن بک‌اند گرفته می‌شود — فرانت
// فقط toUserId/score/review می‌فرستد؛ identity جعل نمی‌شود.
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type {
  CreateRatingPayload,
  RatingDto,
  RatingListResult,
  ReputationDto,
} from '../types/rating'

export const ratingService = {
  /** ارزیابی‌های ثبت‌شده‌ی یک پروژه (مرتب‌شده توسط سرور) */
  getProjectRatings(projectId: string): Promise<RatingListResult> {
    return apiRequest<RatingListResult>(`/projects/${encodeURIComponent(projectId)}/ratings`)
  },

  /** ثبت ارزیابی — فقط برای پروژه‌ی COMPLETED؛ خطاها فارسی از بک‌اند */
  createProjectRating(projectId: string, payload: CreateRatingPayload): Promise<RatingDto> {
    return apiRequest<RatingDto>(`/projects/${encodeURIComponent(projectId)}/ratings`, {
      method: 'POST',
      body: payload,
    })
  },

  /** اعتبار کاربر — همه‌ی مقادیر از بک‌اند (بدون هیچ بازمحاسبه‌ای) */
  getUserReputation(userId: string): Promise<ReputationDto> {
    return apiRequest<ReputationDto>(`/users/${encodeURIComponent(userId)}/reputation`)
  },
}
