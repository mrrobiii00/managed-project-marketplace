import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { Pagination } from '../../utils/pagination'
import { toSkipTake } from '../../utils/pagination'

// ─────────────────────────────────────────────────────────────
// دایرکتوری متخصصان — فقط کاربرانِ فعال با نقش SPECIALIST.
// خروجی: اطلاعات عمومی حرفه‌ای + مهارت‌ها (بدون email/passwordHash —
// جلوگیری از Disintermediation و افشای اطلاعات احراز هویت)
// ─────────────────────────────────────────────────────────────

const specialistSelect = {
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
} satisfies Prisma.UserSelect

type SpecialistRow = Prisma.UserGetPayload<{ select: typeof specialistSelect }>

function toSpecialistDto(u: SpecialistRow) {
  return {
    id: u.id,
    createdAt: u.createdAt,
    fullName: u.profile?.fullName ?? null,
    jobTitle: u.profile?.jobTitle ?? null,
    bio: u.profile?.bio ?? null,
    yearsOfExperience: u.profile?.yearsOfExperience ?? null,
    availability: u.profile?.availability ?? null,
    hourlyRate: u.profile?.hourlyRate ?? null,
    skills: u.userSkills.map((us) => ({
      skillId: us.skillId,
      name: us.skill.name,
      category: us.skill.category,
      level: us.level,
      yearsOfExperience: us.yearsOfExperience,
    })),
  }
}

export async function listSpecialists(query: Pagination) {
  const where: Prisma.UserWhereInput = { role: 'SPECIALIST', isActive: true }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: specialistSelect,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(query),
    }),
    prisma.user.count({ where }),
  ])

  return {
    items: rows.map(toSpecialistDto),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

export async function getSpecialistById(id: string) {
  // اگر کاربر وجود نداشت یا SPECIALIST نبود → 404 (بدون افشای دلیل)
  const user = await prisma.user.findFirst({
    where: { id, role: 'SPECIALIST', isActive: true },
    select: specialistSelect,
  })
  if (!user) {
    throw new HttpError(404, 'متخصص موردنظر یافت نشد')
  }
  return toSpecialistDto(user)
}
