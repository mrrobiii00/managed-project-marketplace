import type { AvailabilityStatus, MatchStatus, SkillLevel } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// موتور تطبیق — توابع خالص (Pure) و Deterministic
// هیچ وابستگی به DB/زمان/تصادف ندارد و بدون DB قابل unit-test است.
// همه‌ی خروجی‌ها 0..100 با حداکثر دو رقم اعشار (round2) هستند.
// ─────────────────────────────────────────────────────────────

/** امتیاز سطح تسلط مهارت */
export const SKILL_LEVEL_POINTS: Record<SkillLevel, number> = {
  BEGINNER: 25,
  INTERMEDIATE: 50,
  ADVANCED: 75,
  EXPERT: 100,
}

/** وزن مهارت الزامی در برابر اختیاری در میانگین وزنی */
export const REQUIRED_SKILL_WEIGHT = 3
export const OPTIONAL_SKILL_WEIGHT = 1

/** وزن‌های نهایی (جمع = 1.00) */
export const MATCHING_WEIGHTS = {
  skill: 0.4,
  experience: 0.2,
  project: 0.15,
  rating: 0.1,
  availability: 0.1,
  budget: 0.05,
} as const

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface ProjectSkillRequirement {
  skillId: string
  isRequired: boolean
}

export interface SkillScoreResult {
  score: number
  matchedRequired: number
  matchedOptional: number
}

/**
 * امتیاز مهارت (وزن ۴۰٪):
 * میانگینِ وزنیِ سطح تسلط روی «همه‌ی مهارت‌های پروژه» —
 * مهارت الزادی که کاربر ندارد سهم ۰ می‌دهد ولی وزنش در مخرج می‌ماند
 * (عدم داشتن مهارت اختیاری هم امتیاز را کمی پایین می‌آورد).
 * وزن: الزامی = ۳ ، اختیاری = ۱.
 * اگر پروژه هیچ مهارتی نداشت → ۵۰ (خنثی — مستند).
 */
export function calculateSkillScore(
  projectSkills: ProjectSkillRequirement[],
  userSkills: Map<string, SkillLevel>,
): SkillScoreResult {
  if (projectSkills.length === 0) {
    return { score: 50, matchedRequired: 0, matchedOptional: 0 }
  }
  let sum = 0
  let totalWeight = 0
  let matchedRequired = 0
  let matchedOptional = 0
  for (const ps of projectSkills) {
    const weight = ps.isRequired ? REQUIRED_SKILL_WEIGHT : OPTIONAL_SKILL_WEIGHT
    totalWeight += weight
    const level = userSkills.get(ps.skillId)
    if (!level) continue // سهم صفر — وزن در مخرج می‌ماند
    sum += weight * SKILL_LEVEL_POINTS[level]
    if (ps.isRequired) matchedRequired++
    else matchedOptional++
  }
  return { score: round2(sum / totalWeight), matchedRequired, matchedOptional }
}

/**
 * امتیاز تجربه (وزن ۲۰٪) — mapping قطعی:
 * 0–1 → 20 · 2–3 → 40 · 4–5 → 60 · 6–8 → 80 · 9+ → 100
 * بدون پروفایل (null) مثل ۰ سال رفتار می‌شود.
 */
export function calculateExperienceScore(years: number | null | undefined): number {
  const y = years ?? 0
  if (y >= 9) return 100
  if (y >= 6) return 80
  if (y >= 4) return 60
  if (y >= 2) return 40
  return 20
}

/**
 * امتیاز پروژه‌های قبلی (وزن ۱۵٪) — mapping قطعی:
 * 0 → 0 · 1 → 40 · 2 → 70 · 3 → 90 · 4+ → 100
 * منبع: تعداد عضویت در تیم‌هایی که status=COMPLETED دارند (داده‌ی واقعی پلتفرم).
 */
export function calculateProjectScore(completedProjects: number): number {
  if (completedProjects >= 4) return 100
  return [0, 40, 70, 90][completedProjects] ?? 0
}

/**
 * امتیاز اعتبار (وزن ۱۰٪): میانگین ستاره‌های دریافتی × ۲۰
 * بدون رتبه (cold-start) → ۵۰ (خنثی — مستند).
 */
export function calculateRatingScore(avgRating: number | null): number {
  if (avgRating === null) return 50
  const clamped = Math.min(5, Math.max(1, avgRating))
  return round2(clamped * 20)
}

/**
 * امتیاز دسترس‌بودن (وزن ۱۰٪):
 * AVAILABLE → 100 · BUSY → 50 · نامشخص/بدون پروفایل → 50
 * (UNAVAILABLE قبل از scoring حذف می‌شود — Hard Filter در Service)
 */
export function calculateAvailabilityScore(
  availability: AvailabilityStatus | null | undefined,
): number {
  if (availability === 'AVAILABLE') return 100
  if (availability === 'BUSY') return 50
  return 50
}

/**
 * امتیاز بودجه (وزن ۵٪):
 * بودجه‌ی پروژه «کل» است و نرخ متخصص «ساعتی» — بدون دانستن ساعت‌های برآوردی،
 * هر مقایسه‌ای فرض پنهانی خواهد بود. لذا مقدار خنثی و deterministic:
 * همیشه ۵۰ (محدودیت مستند — بدون داده‌ی جعلی و بدون تبدیل ساختگی به ساعت).
 */
export function calculateBudgetScore(): number {
  return 50
}

export interface ScoreComponents {
  skillScore: number
  experienceScore: number
  projectScore: number
  ratingScore: number
  availabilityScore: number
  budgetScore: number
}

/** امتیاز نهایی = مجموع وزنی اجزا (0..100) */
export function calculateTotalScore(c: ScoreComponents): number {
  const total =
    c.skillScore * MATCHING_WEIGHTS.skill +
    c.experienceScore * MATCHING_WEIGHTS.experience +
    c.projectScore * MATCHING_WEIGHTS.project +
    c.ratingScore * MATCHING_WEIGHTS.rating +
    c.availabilityScore * MATCHING_WEIGHTS.availability +
    c.budgetScore * MATCHING_WEIGHTS.budget
  return round2(Math.min(100, Math.max(0, total)))
}

/**
 * امتیاز اعتماد (جدا از Match Score) — ساده‌شده‌ی MVP:
 *   Trust = 70% Rating + 30% CompletedProjects
 * Cold-start (بدون رتبه و بدون پروژه‌ی کامل) → ۵۰
 * بخش‌های Verification/OnTimeRate چون data source ندارند اعمال نمی‌شوند
 * (داده جعل نمی‌شود — محدودیت مستند).
 */
export function calculateTrustScore(
  avgRating: number | null,
  completedProjects: number,
): number {
  if (avgRating === null && completedProjects === 0) return 50
  const ratingPart = avgRating === null ? 50 : Math.min(5, Math.max(1, avgRating)) * 20
  const projectPart = calculateProjectScore(completedProjects)
  return round2(0.7 * ratingPart + 0.3 * projectPart)
}

/**
 * وضعیت پیشنهاد — ترتیب قطعی ارزیابی:
 *   totalScore < 70                               → REJECTED
 *   totalScore >= 85 && trustScore >= 80          → RECOMMENDED
 *   بقیه‌ی موارد (70..84 یا trust ناکافی برای auto) → NEEDS_REVIEW
 * حالت hard-filter-fail نیز REJECTED است (در Service اصلاً وارد استخر نمی‌شود).
 */
export function determineRecommendationStatus(
  totalScore: number,
  trustScore: number,
  hardFilterPassed = true,
): MatchStatus {
  if (!hardFilterPassed) return 'REJECTED'
  if (totalScore < 70) return 'REJECTED'
  if (totalScore >= 85 && trustScore >= 80) return 'RECOMMENDED'
  return 'NEEDS_REVIEW'
}
