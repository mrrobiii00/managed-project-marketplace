import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { Pagination } from '../../utils/pagination'
import { toSkipTake } from '../../utils/pagination'
import {
  VISIBLE_MATCH_STATUSES,
  ACTIVE_PROJECT_STATUSES,
  type RecommendationDto,
} from './recommendations.types'

// ─────────────────────────────────────────────────────────────
// لایه‌ی Read/Recommendation روی Matchهای موجود M07:
//  • مالکیت در خود کوئری با کلید (specialistId) اعمال می‌شود
//  • فیلتر Match status و Project status در DB انجام می‌شود
//  • هیچ scoring جدیدی محاسبه نمی‌شود — اعداد از رکورد matches
//  • هیچ داده‌ی حساسی (email/passwordHash) select نمی‌شود
// ─────────────────────────────────────────────────────────────

function baseWhere(specialistId: string): Prisma.MatchWhereInput {
  return {
    specialistId, // فقط Matchهای خود متخصص — ownership در کوئری
    status: { in: VISIBLE_MATCH_STATUSES }, // REJECTED حذف — در DB
    project: { status: { in: ACTIVE_PROJECT_STATUSES } }, // CANCELLED/COMPLETED/RATED حذف — در DB
  }
}

const INCLUDE = {
  project: {
    select: {
      id: true,
      title: true,
      description: true,
      minBudget: true,
      maxBudget: true,
      deadline: true,
      status: true,
    },
  },
} satisfies Prisma.MatchInclude

type Row = Prisma.MatchGetPayload<{ include: typeof INCLUDE }>

function toDto(row: Row): RecommendationDto {
  const p = row.project
  return {
    project: {
      id: p.id,
      title: p.title,
      description: p.description,
      minBudget: p.minBudget === null ? null : p.minBudget.toString(),
      maxBudget: p.maxBudget === null ? null : p.maxBudget.toString(),
      deadline: p.deadline === null ? null : p.deadline.toISOString().slice(0, 10),
      status: p.status,
    },
    match: {
      status: row.status,
      skillScore: Number(row.skillScore),
      experienceScore: Number(row.experienceScore),
      projectScore: Number(row.projectScore),
      ratingScore: Number(row.ratingScore),
      availabilityScore: Number(row.availabilityScore),
      budgetScore: Number(row.budgetScore),
      totalScore: Number(row.totalScore),
      trustScore: Number(row.trustScore),
    },
  }
}

export async function listMyRecommendations(
  specialistId: string,
  pagination: Pagination,
): Promise<{ items: RecommendationDto[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const where = baseWhere(specialistId)

  const [rows, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: INCLUDE,
      // ترتیب deterministic: امتیاز → اعتماد → جدیدترین پروژه → id
      orderBy: [
        { totalScore: 'desc' },
        { trustScore: 'desc' },
        { project: { createdAt: 'desc' } },
        { project: { id: 'asc' } },
      ],
      ...toSkipTake(pagination),
    }),
    prisma.match.count({ where }),
  ])

  return {
    items: rows.map(toDto),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}

export async function getMyRecommendation(
  specialistId: string,
  projectId: string,
): Promise<RecommendationDto> {
  // مالکیت در خود کوئری با کلید مرکب (projectId, specialistId) — نه در JavaScript
  const row = await prisma.match.findUnique({
    where: { projectId_specialistId: { projectId, specialistId } },
    include: INCLUDE,
  })

  // 404 برای: بدون Match / REJECTED / پروژه غیرفعال (عدم افشای وجود)
  if (!row || !VISIBLE_MATCH_STATUSES.includes(row.status) || !ACTIVE_PROJECT_STATUSES.includes(row.project.status)) {
    throw new HttpError(404, 'پیشنهادی برای این پروژه یافت نشد', 'RECOMMENDATION_NOT_FOUND')
  }
  return toDto(row)
}

export async function countMyRecommendations(specialistId: string): Promise<number> {
  return prisma.match.count({ where: baseWhere(specialistId) })
}
