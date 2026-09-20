// ─────────────────────────────────────────────────────────────
// انواع مشترک احراز هویت — فقط فیلدهای مورد نیاز Foundation
// ─────────────────────────────────────────────────────────────

/** نقش‌های سیستم — ADMIN فقط از مسیر مدیریتی، نه ثبت‌نام عمومی */
export type UserRole = 'CLIENT' | 'SPECIALIST' | 'ADMIN'

/** کاربر احراز‌شده — عمداً مینیمال (id, email, role) */
export interface AuthUser {
  id: string
  email: string
  role: UserRole
}

export interface LoginInput {
  email: string
  password: string
}

/** ثبت‌نام عمومی فقط CLIENT/SPECIALIST — هرگز ADMIN */
export type PublicRegisterRole = Exclude<UserRole, 'ADMIN'>

export interface RegisterInput {
  email: string
  password: string
  role: PublicRegisterRole
}
