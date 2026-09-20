import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import { calculateTrustScore } from '../matching/matching.engine'
import type { ReputationDto } from './rating.types'

// ─────────────────────────────────────────────────────────────
// Reputation — کاملاً از داده‌ی واقعی DB، با همان فرمول M07
// (سرگذشت: منطق امتیاز در matching.engine.ts فقط یک‌جا تعریف
// شده است و اینجا و موتور تطبیق از همان توابع استفاده می‌کنند؛
// رفتار M07 تغییر نمی‌کند.)
//
//  Trust = 70% × RatingScore + 30% × CompletedProjectsScore
//  RatingScore = averageRating×20 (بدون رتبه → 50 — cold-start)
//  CompletedProjectsScore = mapping موتور M07 (0→0 · 1→40 · 2→70 · 3→90 · 4+→100)
// ─────────────────────────────────────────────────────────────

export async function getUserReputation(userId: string): Promise<ReputationDto> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) throw new HttpError(404, 'کاربر موردنظر یافت نشد', 'USER_NOT_FOUND')

  const [ratingAgg, completedAgg] = await Promise.all([
    prisma.rating.aggregate({
      where: { toUserId: userId },
      _avg: { score: true },
      _count: { _all: true },
    }),
    prisma.teamMember.count({
      where: { userId, team: { status: 'COMPLETED' } },
    }),
  ])

  const averageRating = ratingAgg._avg.score === null ? null : Math.round(ratingAgg._avg.score * 100) / 100
  const ratingCount = ratingAgg._count._all
  const completedProjects = completedAgg

  // همان توابع M07 — بدون تغییر رفتار
  const trustScore = calculateTrustScore(averageRating, completedProjects)

  return { userId, averageRating, ratingCount, completedProjects, trustScore }
}
