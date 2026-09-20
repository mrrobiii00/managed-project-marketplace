import type { ProjectStatus } from '@prisma/client'

/** خروجی استاندارد پروژه — مبالغ به‌صورت رشته‌ی Decimal (دقت کامل)، تاریخ YYYY-MM-DD */
export interface ProjectDto {
  id: string
  title: string
  description: string | null
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  status: ProjectStatus
  createdAt: Date
  updatedAt: Date
  client: { id: string; fullName: string | null }
  skills: { skillId: string; name: string; category: string | null; isRequired: boolean }[]
  roles: { id: string; roleName: string; quantity: number }[]
}

/** آیتم خلاصه‌ی پروژه برای لیست‌ها */
export interface ProjectSummaryDto {
  id: string
  title: string
  status: ProjectStatus
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  createdAt: Date
  updatedAt: Date
  skillsCount: number
  rolesCount: number
}
