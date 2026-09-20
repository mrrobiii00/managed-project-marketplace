import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { Pagination } from '../../utils/pagination'
import { toSkipTake } from '../../utils/pagination'
import {
  calculateSkillScore,
  calculateExperienceScore,
  calculateProjectScore,
  calculateRatingScore,
  calculateAvailabilityScore,
  calculateBudgetScore,
  calculateTotalScore,
  calculateTrustScore,
  determineRecommendationStatus,
} from './matching.engine'
import { buildExplanation, type MatchDto } from './matching.types'

// ─────────────────────────────────────────────────────────────
// Orchestration تطبیق: بارگذاری، Hard Filter، امتیازدهی، ذخیره
// (منطق ریاضی در matching.engine.ts — توابع خالص)
//
// قواعد:
//  • اجرای تطبیق فقط توسط CLIENT مالک و فقط از وضعیت SUBMITTED
//  • transition اتمیک SUBMITTED → MATCHING با updateMany شرطی
//  • Hard Filter قبل از scoring: نقش/فعال بودن در DB،
//    UNAVAILABLE و نداشتنِ همه‌ی مهارت‌های الزامی در حافظه
//  • aggregateها (رتبه/پروژه‌های کامل) batch و بدون N+1
//  • تطبیق فقط recommendation می‌سازد — هرگز تیم/عضویت تشکیل نمی‌شود
// ─────────────────────────────────────────────────────────────

/** آیا بیننده مجاز به دیدن matchهای این پروژه است؟ (مالک یا ادمین — بقیه 404) */
async function assertCanViewMatches(viewer: { id: string; role: string }, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true },
  })
  if (!project) throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  if (viewer.role !== 'ADMIN' && project.clientId !== viewer.id) {
    // 404 عمدی — وجود پروژه برای غیرمالک افشا نشود (ضد IDOR)
    throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  }
  return project
}

function rowToDto(
  row: Prisma.MatchGetPayload<{ include: { specialist: { select: { profile: { select: { fullName: true; jobTitle: true } } } } } }>,
): MatchDto {
  const breakdown = {
    skillScore: Number(row.skillScore),
    experienceScore: Number(row.experienceScore),
    projectScore: Number(row.projectScore),
    ratingScore: Number(row.ratingScore),
    availabilityScore: Number(row.availabilityScore),
    budgetScore: Number(row.budgetScore),
    totalScore: Number(row.totalScore),
    trustScore: Number(row.trustScore),
  }
  return {
    projectId: row.projectId,
    specialistId: row.specialistId,
    fullName: row.specialist.profile?.fullName ?? null,
    jobTitle: row.specialist.profile?.jobTitle ?? null,
    status: row.status,
    ...breakdown,
    explanation: buildExplanation(breakdown, row.status),
  }
}

export async function startMatching(userId: string, projectId: string) {
  // ۱) مالکیت + وضعیت (غیرمالک → 404 برای پنهان‌سازی)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      clientId: true,
      status: true,
      projectSkills: { select: { skillId: true, isRequired: true } },
    },
  })
  if (!project || project.clientId !== userId) {
    throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  }
  if (project.status !== 'SUBMITTED') {
    throw new HttpError(
      409,
      `اجرای تطبیق فقط از وضعیت SUBMITTED مجاز است (وضعیت فعلی: ${project.status})`,
    )
  }

  // ۲) transition اتمیک SUBMITTED → MATCHING (مقاوم به race)
  const moved = await prisma.project.updateMany({
    where: { id: projectId, clientId: userId, status: 'SUBMITTED' },
    data: { status: 'MATCHING' },
  })
  if (moved.count === 0) {
    // هم‌زمانی: وضعیت همین حالا عوض شده
    throw new HttpError(409, 'پروژه در وضعیت قابل اجرای تطبیق نیست (تغییر هم‌زمان)')
  }

  const requiredSkills = project.projectSkills.filter((s) => s.isRequired)
  const allSkillIds = project.projectSkills.map((s) => s.skillId)

  // ۳) استخر نامزدها — پیش‌فیلتر DB: فقط SPECIALIST فعال (بدون N+1)
  const candidates = await prisma.user.findMany({
    where: { role: 'SPECIALIST', isActive: true },
    select: {
      id: true,
      profile: { select: { yearsOfExperience: true, availability: true, hourlyRate: true } },
      userSkills: {
        where: allSkillIds.length > 0 ? { skillId: { in: allSkillIds } } : undefined,
        select: { skillId: true, level: true },
      },
    },
  })

  // ۴) Hard Filter در حافظه (قبل از هر scoring):
  //    UNAVAILABLE + نداشتنِ حتی یک مهارت الزادی
  const pool = candidates.filter((c) => {
    if (c.profile?.availability === 'UNAVAILABLE') return false
    if (requiredSkills.length === 0) return true
    const owned = new Set(c.userSkills.map((us) => us.skillId))
    return requiredSkills.every((rs) => owned.has(rs.skillId))
  })

  // ۵) aggregateهای batch: میانگین رتبه + تعداد پروژه‌های کامل‌شده
  const poolIds = pool.map((c) => c.id)
  const [ratingAgg, completedAgg] = await Promise.all([
    prisma.rating.groupBy({
      by: ['toUserId'],
      where: { toUserId: { in: poolIds } },
      _avg: { score: true },
    }),
    prisma.teamMember.groupBy({
      by: ['userId'],
      where: { userId: { in: poolIds }, team: { status: 'COMPLETED' } },
      _count: { _all: true },
    }),
  ])
  const avgRatingMap = new Map(ratingAgg.map((r) => [r.toUserId, r._avg.score ?? null]))
  const completedMap = new Map(completedAgg.map((g) => [g.userId, g._count._all]))

  // ۶) امتیازدهی deterministic با توابع خالص
  const rows = pool
    .map((c) => {
      const avgRating = avgRatingMap.get(c.id) ?? null
      const completed = completedMap.get(c.id) ?? 0
      const skill = calculateSkillScore(
        project.projectSkills,
        new Map(c.userSkills.map((us) => [us.skillId, us.level])),
      )
      const components = {
        skillScore: skill.score,
        experienceScore: calculateExperienceScore(c.profile?.yearsOfExperience ?? null),
        projectScore: calculateProjectScore(completed),
        ratingScore: calculateRatingScore(avgRating),
        availabilityScore: calculateAvailabilityScore(c.profile?.availability ?? null),
        budgetScore: calculateBudgetScore(),
      }
      const totalScore = calculateTotalScore(components)
      const trustScore = calculateTrustScore(avgRating, completed)
      return {
        projectId,
        specialistId: c.id,
        ...components,
        totalScore,
        trustScore,
        status: determineRecommendationStatus(totalScore, trustScore),
      }
    })
    // مرتب‌سازی deterministic: totalScore desc → trustScore desc → specialistId asc
    .sort((a, b) =>
      b.totalScore - a.totalScore || b.trustScore - a.trustScore || (a.specialistId < b.specialistId ? -1 : 1),
    )

  // ۷) ذخیره (بدون تیم/عضویت — تطبیق فقط پیشنهاد است)
  if (rows.length > 0) {
    await prisma.match.createMany({ data: rows })
  }

  const saved = await prisma.match.findMany({
    where: { projectId },
    orderBy: [{ totalScore: 'desc' }, { trustScore: 'desc' }, { specialistId: 'asc' }],
    include: { specialist: { select: { profile: { select: { fullName: true, jobTitle: true } } } } },
  })

  return {
    projectStatus: 'MATCHING' as const,
    candidatesConsidered: candidates.length,
    hardFilteredOut: candidates.length - pool.length,
    matchesCount: saved.length,
    items: saved.map(rowToDto),
  }
}

export async function listMatches(
  viewer: { id: string; role: string },
  projectId: string,
  pagination: Pagination,
) {
  await assertCanViewMatches(viewer, projectId)

  const [rows, total] = await Promise.all([
    prisma.match.findMany({
      where: { projectId },
      orderBy: [{ totalScore: 'desc' }, { trustScore: 'desc' }, { specialistId: 'asc' }],
      include: {
        specialist: { select: { profile: { select: { fullName: true, jobTitle: true } } } },
      },
      ...toSkipTake(pagination),
    }),
    prisma.match.count({ where: { projectId } }),
  ])

  return {
    items: rows.map(rowToDto),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}

export async function getMatchDetails(
  viewer: { id: string; role: string },
  projectId: string,
  specialistId: string,
) {
  await assertCanViewMatches(viewer, projectId)

  const match = await prisma.match.findUnique({
    where: { projectId_specialistId: { projectId, specialistId } },
    include: {
      specialist: {
        select: {
          id: true,
          createdAt: true,
          profile: {
            select: {
              fullName: true,
              jobTitle: true,
              bio: true,
              yearsOfExperience: true,
              availability: true,
              hourlyRate: true,
            },
          },
          userSkills: {
            select: {
              skillId: true,
              level: true,
              yearsOfExperience: true,
              skill: { select: { name: true, category: true } },
            },
            orderBy: { skill: { name: 'asc' } },
          },
        },
      },
    },
  })
  if (!match) throw new HttpError(404, 'تطبیق موردنظر یافت نشد')

  const dto = rowToDto(match)
  // پروفایل عمومی متخصص (بدون email/passwordHash — هم‌راستا با /specialists)
  return {
    ...dto,
    specialist: {
      id: match.specialist.id,
      createdAt: match.specialist.createdAt,
      fullName: match.specialist.profile?.fullName ?? null,
      jobTitle: match.specialist.profile?.jobTitle ?? null,
      bio: match.specialist.profile?.bio ?? null,
      yearsOfExperience: match.specialist.profile?.yearsOfExperience ?? null,
      availability: match.specialist.profile?.availability ?? null,
      hourlyRate:
        match.specialist.profile?.hourlyRate === null || !match.specialist.profile
          ? null
          : match.specialist.profile.hourlyRate.toString(),
      skills: match.specialist.userSkills.map((us) => ({
        skillId: us.skillId,
        name: us.skill.name,
        category: us.skill.category,
        level: us.level,
        yearsOfExperience: us.yearsOfExperience,
      })),
    },
  }
}
