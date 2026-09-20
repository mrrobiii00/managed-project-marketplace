// ─────────────────────────────────────────────────────────────
// انواع Recommendation — دقیقاً منطبق با قرارداد واقعی M11
// اعداد score همیشه number هستند (بک‌اند Number(decimal) می‌فرستد)
// و هرگز در فرانت بازمحاسبه نمی‌شوند.
// ─────────────────────────────────────────────────────────────

import type { ProjectStatus } from './project'

/** وضعیت پیشنهاد — REJECTED هرگز به فرانت نمی‌رسد (فیلتر DB در M11) */
export type RecommendationStatus = 'RECOMMENDED' | 'NEEDS_REVIEW'

/** بلوک project در پاسخ M11 (بدون داده‌ی حساس) */
export interface RecommendedProjectInfo {
  id: string
  title: string
  /** فقط در detail موجود است */
  description?: string
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  status: ProjectStatus
}

/** شش مؤلفه‌ی توضیح‌پذیری تطبیق — مقادیر خام بک‌اند */
export interface MatchComponents {
  skillScore: number
  experienceScore: number
  projectScore: number
  ratingScore: number
  availabilityScore: number
  budgetScore: number
}

export interface MatchInfo extends MatchComponents {
  status: RecommendationStatus
  totalScore: number
  trustScore: number
}

/** آیتم لیست GET /specialists/me/recommended-projects */
export interface RecommendationListItem {
  project: RecommendedProjectInfo
  match: MatchInfo
}

/** پاسخ detail — project.description هم دارد */
export interface RecommendationDetail {
  project: RecommendedProjectInfo
  match: MatchInfo
}

export interface PaginationMetadata {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface RecommendationListResult extends PaginationMetadata {
  items: RecommendationListItem[]
}
