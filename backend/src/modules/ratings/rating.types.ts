/** خروجی استاندند Rating — هویت عمومی فقط (بدون email/passwordHash) */
export interface RatingDto {
  id: string
  projectId: string
  fromUser: { id: string; fullName: string | null }
  toUser: { id: string; fullName: string | null }
  score: number
  review: string | null
  createdAt: Date
}

/** خروجی Reputation — فقط از داده‌ی واقعی DB */
export interface ReputationDto {
  userId: string
  averageRating: number | null
  ratingCount: number
  completedProjects: number
  trustScore: number
}
