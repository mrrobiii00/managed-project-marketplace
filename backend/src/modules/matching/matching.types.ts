import type { MatchStatus } from '@prisma/client'

/** شکست کامل امتیازها (همه 0..100 با دو رقم اعشار) */
export interface MatchBreakdown {
  skillScore: number
  experienceScore: number
  projectScore: number
  ratingScore: number
  availabilityScore: number
  budgetScore: number
  totalScore: number
  trustScore: number
}

/** خروجی استاندارد یک Match برای API */
export interface MatchDto extends MatchBreakdown {
  projectId: string
  specialistId: string
  fullName: string | null
  jobTitle: string | null
  status: MatchStatus
  explanation: string
}

/** توضیح فارسیِ قابل‌فهم برای کاربر — چرا این امتیاز؟ */
export function buildExplanation(b: MatchBreakdown, status: MatchStatus): string {
  return (
    `مهارت‌ها: ${b.skillScore} | تجربه: ${b.experienceScore} | ` +
    `پروژه‌های قبلی: ${b.projectScore} | امتیاز: ${b.ratingScore} | ` +
    `دسترس‌بودن: ${b.availabilityScore} | بودجه: ${b.budgetScore} » ` +
    `امتیاز نهایی: ${b.totalScore} | اعتماد: ${b.trustScore} | وضعیت: ${status}`
  )
}
