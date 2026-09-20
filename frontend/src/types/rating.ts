// ─────────────────────────────────────────────────────────────
// انواع Rating/Reputation — دقیقاً منطبق با DTOهای واقعی M10
// (rating.types.ts بک‌اند)؛ اعداد خام بک‌اند بدون بازمحاسبه.
// ─────────────────────────────────────────────────────────────

/** RatingDto بک‌اند — هویت عمومی فقط (id + fullName) */
export interface RatingDto {
  id: string
  projectId: string
  fromUser: { id: string; fullName: string | null }
  toUser: { id: string; fullName: string | null }
  score: number
  review: string | null
  createdAt: string
}

/** ReputationDto بک‌اند — همه‌ی مقادیر از DB/موتور M07 */
export interface ReputationDto {
  userId: string
  averageRating: number | null
  ratingCount: number
  completedProjects: number
  trustScore: number
}

/** body واقعی POST /projects/:projectId/ratings (createRatingSchema)
 *  — fromUserId از توکن و projectId از مسیر؛ هرگز ارسال نمی‌شوند */
export interface CreateRatingPayload {
  toUserId: string
  score: number
  review?: string
}

/** پاسخ GET /projects/:projectId/ratings */
export interface RatingListResult {
  items: RatingDto[]
}
