// ─────────────────────────────────────────────────────────────
// انواع Profile/UserSkill — دقیقاً منطبق با قرارداد واقعی M05
// توجه: hourlyRate در «پاسخ» رشته و در «درخواست» عدد است.
// ─────────────────────────────────────────────────────────────

/** وضعیت دسترس‌بودگی — enum واقعی بک‌اند */
export type Availability = 'AVAILABLE' | 'BUSY' | 'UNAVAILABLE'

/** سطح مهارت — enum واقعی بک‌اند */
export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'

/** پاسخ GET /profile/me (و PUT) — همه‌ی فیلدهای متنی nullable */
export interface ProfileDto {
  userId: string
  fullName: string | null
  bio: string | null
  jobTitle: string | null
  yearsOfExperience: number | null
  availability: Availability | null
  avatarUrl: string | null
  /** Decimal بک‌اند → رشته */
  hourlyRate: string | null
  createdAt: string
  updatedAt: string
}

/** بدنه‌ی PUT /profile/me — همه اختیاری (فیلد ارسال‌نشده تغییر نمی‌کند) */
export interface ProfileUpdatePayload {
  fullName?: string
  bio?: string
  jobTitle?: string
  yearsOfExperience?: number
  availability?: Availability
  avatarUrl?: string
  /** عدد در درخواست (برخلاف پاسخ) */
  hourlyRate?: number
}

/** مهارت مرجع (کاتالوگ عمومی) */
export interface Skill {
  id: string
  name: string
  category: string
  createdAt?: string
}

/** پاسخ GET /profile/me/skills و POST/PUT skill */
export interface UserSkillDto {
  skillId: string
  level: SkillLevel
  yearsOfExperience: number
  skill: { id: string; name: string; category: string }
}

/** بدنه‌ی POST /profile/me/skills */
export interface AddSkillPayload {
  skillId: string
  level: SkillLevel
  yearsOfExperience: number
}

/** بدنه‌ی PUT /profile/me/skills/:skillId — حداقل یکی لازم */
export interface UpdateSkillPayload {
  level?: SkillLevel
  yearsOfExperience?: number
}
