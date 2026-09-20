import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import type { ListSkillsQuery } from './skills.schema'
import { toSkipTake } from '../../utils/pagination'

// ─────────────────────────────────────────────────────────────
// دسترسی به کاتالوگ Skillها (فقط خواندنی — ایجاد/ویرایش Skill
// از API عمومی در MVP وجود ندارد؛ داده از seed/ادمین می‌آید)
// ─────────────────────────────────────────────────────────────

export async function listSkills(query: ListSkillsQuery) {
  const where: Prisma.SkillWhereInput = {
    ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
    ...(query.category && { category: { equals: query.category, mode: 'insensitive' } }),
  }

  const [items, total] = await Promise.all([
    prisma.skill.findMany({
      where,
      select: { id: true, name: true, category: true, createdAt: true },
      orderBy: { name: 'asc' },
      ...toSkipTake(query),
    }),
    prisma.skill.count({ where }),
  ])

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}
