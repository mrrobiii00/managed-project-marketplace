// ─────────────────────────────────────────────────────────────
// قوانین خالص Rating — بدون DB، deterministic و unit-testable
// ─────────────────────────────────────────────────────────────

/** score باید عدد صحیح 1..5 باشد */
export function isValidRatingScore(score: unknown): boolean {
  return typeof score === 'number' && Number.isInteger(score) && score >= 1 && score <= 5
}

/** خودارزیابی ممنوع */
export function isSelfRating(fromUserId: string, toUserId: string): boolean {
  return fromUserId === toUserId
}

export type RaterType = 'CLIENT_OWNER' | 'TEAM_MEMBER'

/**
 * نوع ارزیاب را از هویت نسبت به پروژه محاسبه کن:
 *   CLIENT مالک → CLIENT_OWNER | SPECIALIST عضو تیم → TEAM_MEMBER | بقیه → null
 * ADMIN عمداً طرف پروژه نیست (null) — ارزیابی با نقش ادمین ممنوع است.
 */
export function resolveRaterType(role: string, isProjectOwner: boolean, isTeamMember: boolean): RaterType | null {
  if (role === 'CLIENT' && isProjectOwner) return 'CLIENT_OWNER'
  if (role === 'SPECIALIST' && isTeamMember) return 'TEAM_MEMBER'
  return null
}
