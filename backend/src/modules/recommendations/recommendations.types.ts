import type { MatchStatus, ProjectStatus } from '@prisma/client'

/**
 * پیشنهاد پروژه برای متخصص — فقط خواندنی از داده‌ی M07.
 * هیچ امتیازی محاسبه نمی‌شود؛ اعداد مستقیماً از رکورد matches می‌آیند.
 */
export interface RecommendationDto {
  project: {
    id: string
    title: string
    description: string | null
    minBudget: string | null
    maxBudget: string | null
    deadline: string | null
    status: ProjectStatus
  }
  match: {
    status: MatchStatus
    skillScore: number
    experienceScore: number
    projectScore: number
    ratingScore: number
    availabilityScore: number
    budgetScore: number
    totalScore: number
    trustScore: number
  }
}

/** وضعیت‌های Match قابل نمایش (REJECTED هرگز نمایش داده نمی‌شود) */
export const VISIBLE_MATCH_STATUSES: MatchStatus[] = ['RECOMMENDED', 'NEEDS_REVIEW']

/** وضعیت‌های فعال پروژه — CANCELLED/COMPLETED/RATED پیشنهاد فعال نیستند */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'MATCHING',
  'REVIEW',
  'TEAM_PROPOSED',
  'IN_PROGRESS',
]
