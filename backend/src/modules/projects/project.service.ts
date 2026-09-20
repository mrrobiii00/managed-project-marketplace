import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { Pagination } from '../../utils/pagination'
import { toSkipTake } from '../../utils/pagination'
import type { CreateProjectInput, UpdateProjectInput } from './project.schema'
import type { ProjectDto, ProjectSummaryDto } from './project.types'

// ─────────────────────────────────────────────────────────────
// منطق Projects — مالکیت همیشه و فقط از req.user.id (توکن)
// قواعد:
//  • PUT/DELETE/submit غیرمالک → 404 (پنهان‌سازی وجود پروژه — ضد IDOR)
//  • ویرایش فقط در DRAFT و SUBMITTED (بعد از شروع فرآیند، پروژه قفل می‌شود)
//  • حذف فقط در DRAFT (سایر وضعیت‌ها حتی CANCELLED → 409 برای حفظ سوابق)
// ─────────────────────────────────────────────────────────────

const PROJECT_INCLUDE = {
  client: { select: { id: true, profile: { select: { fullName: true } } } },
  projectSkills: {
    select: {
      skillId: true,
      isRequired: true,
      skill: { select: { name: true, category: true } },
    },
    orderBy: { skill: { name: 'asc' } },
  },
  roles: { select: { id: true, roleName: true, quantity: true }, orderBy: { roleName: 'asc' } },
} satisfies Prisma.ProjectInclude

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>

function toDto(p: ProjectRow): ProjectDto {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    minBudget: p.minBudget === null ? null : p.minBudget.toString(),
    maxBudget: p.maxBudget === null ? null : p.maxBudget.toString(),
    deadline: p.deadline === null ? null : p.deadline.toISOString().slice(0, 10),
    status: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    client: { id: p.client.id, fullName: p.client.profile?.fullName ?? null },
    skills: p.projectSkills.map((ps) => ({
      skillId: ps.skillId,
      name: ps.skill.name,
      category: ps.skill.category,
      isRequired: ps.isRequired,
    })),
    roles: p.roles.map((r) => ({ id: r.id, roleName: r.roleName, quantity: r.quantity })),
  }
}

/** skillIdهای ارسالی باید همگی در DB موجود باشند — وگرنه 404 */
async function assertSkillsExist(skillIds: string[]): Promise<void> {
  if (skillIds.length === 0) return
  const found = await prisma.skill.findMany({
    where: { id: { in: skillIds } },
    select: { id: true },
  })
  if (found.length !== new Set(skillIds).size) {
    throw new HttpError(404, 'یک یا چند مهارت موردنظر یافت نشد')
  }
}

/** مالکیت + وضعیت — خطای 404 عمداً برای غیرمالک هم استفاده می‌شود (عدم افشای وجود پروژه) */
async function getOwnedProjectOr404(
  userId: string,
  projectId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const project = await tx.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true, status: true, minBudget: true, maxBudget: true },
  })
  if (!project || project.clientId !== userId) {
    throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  }
  return project
}

// ───────────────────────────── Create ─────────────────────────────

export async function createProject(
  userId: string,
  input: CreateProjectInput,
): Promise<ProjectDto> {
  await assertSkillsExist(input.skills?.map((s) => s.skillId) ?? [])

  // Transaction: project + skills + roles با هم یا هیچ‌کدام
  const created = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        clientId: userId, // فقط از توکن — هرگز از body
        title: input.title,
        description: input.description,
        minBudget: input.minBudget,
        maxBudget: input.maxBudget,
        deadline: input.deadline ? new Date(`${input.deadline}T00:00:00Z`) : undefined,
      },
      select: { id: true },
    })

    if (input.skills && input.skills.length > 0) {
      await tx.projectSkill.createMany({
        data: input.skills.map((s) => ({
          projectId: project.id,
          skillId: s.skillId,
          isRequired: s.isRequired,
        })),
      })
    }
    if (input.roles && input.roles.length > 0) {
      await tx.projectRole.createMany({
        data: input.roles.map((r) => ({
          projectId: project.id,
          roleName: r.roleName,
          quantity: r.quantity,
        })),
      })
    }
    return project
  })

  const full = await prisma.project.findUniqueOrThrow({
    where: { id: created.id },
    include: PROJECT_INCLUDE,
  })
  return toDto(full)
}

// ───────────────────────────── Read ─────────────────────────────

export async function listMyProjects(
  userId: string,
  pagination: Pagination,
): Promise<{ items: ProjectSummaryDto[]; page: number; pageSize: number; total: number; totalPages: number }> {
  const where: Prisma.ProjectWhereInput = { clientId: userId }
  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      select: {
        id: true, title: true, status: true, minBudget: true, maxBudget: true,
        deadline: true, createdAt: true, updatedAt: true,
        _count: { select: { projectSkills: true, roles: true } },
      },
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination),
    }),
    prisma.project.count({ where }),
  ])

  return {
    items: rows.map((p) => ({
      id: p.id, title: p.title, status: p.status,
      minBudget: p.minBudget === null ? null : p.minBudget.toString(),
      maxBudget: p.maxBudget === null ? null : p.maxBudget.toString(),
      deadline: p.deadline === null ? null : p.deadline.toISOString().slice(0, 10),
      createdAt: p.createdAt, updatedAt: p.updatedAt,
      skillsCount: p._count.projectSkills,
      rolesCount: p._count.roles,
    })),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}

/**
 * سیاست مشاهده (تصمیم معماری MVP):
 *  • DRAFT → فقط مالک (غیرمالک 404 می‌گیرد تا وجود پروژه افشا نشود)
 *  • غیر DRAFT (SUBMITTED و بعد از آن) → برای هر کاربرِ احراز هویت‌شده قابل مشاهده
 */
export async function getProject(projectId: string, viewerId: string): Promise<ProjectDto> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: PROJECT_INCLUDE,
  })
  if (!project) {
    throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  }
  if (project.status === 'DRAFT' && project.clientId !== viewerId) {
    throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  }
  return toDto(project)
}

// ───────────────────────────── Update ─────────────────────────────

const EDITABLE_STATUSES = ['DRAFT', 'SUBMITTED'] as const

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectDto> {
  const owned = await getOwnedProjectOr404(userId, projectId)

  if (!EDITABLE_STATUSES.includes(owned.status as (typeof EDITABLE_STATUSES)[number])) {
    throw new HttpError(409, `پروژه در وضعیت ${owned.status} قابل ویرایش نیست`)
  }

  // بررسی بودجه پس از ادغام با مقادیر موجود (مقادیر ≤۲ رقم اعشار — مقایسه امن)
  const min = input.minBudget ?? (owned.minBudget !== null ? Number(owned.minBudget) : undefined)
  const max = input.maxBudget ?? (owned.maxBudget !== null ? Number(owned.maxBudget) : undefined)
  if (min !== undefined && max !== undefined && min > max) {
    throw new HttpError(422, 'حداقل بودجه نمی‌تواند از حداکثر بودجه بیشتر باشد')
  }

  if (input.skills) {
    await assertSkillsExist(input.skills.map((s) => s.skillId))
  }

  // Transaction: ویرایش اتمیِ فیلدها + جایگزینی کامل skills/roles (بدون وضعیت ناقص)
  await prisma.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.minBudget !== undefined && { minBudget: input.minBudget }),
        ...(input.maxBudget !== undefined && { maxBudget: input.maxBudget }),
        ...(input.deadline !== undefined && { deadline: new Date(`${input.deadline}T00:00:00Z`) }),
      },
    })

    // ارسال آرایه = جایگزینی کامل (آرایه‌ی خالی = حذف همه) — رفتار مستند
    if (input.skills !== undefined) {
      await tx.projectSkill.deleteMany({ where: { projectId } })
      if (input.skills.length > 0) {
        await tx.projectSkill.createMany({
          data: input.skills.map((s) => ({
            projectId, skillId: s.skillId, isRequired: s.isRequired,
          })),
        })
      }
    }
    if (input.roles !== undefined) {
      await tx.projectRole.deleteMany({ where: { projectId } })
      if (input.roles.length > 0) {
        await tx.projectRole.createMany({
          data: input.roles.map((r) => ({
            projectId, roleName: r.roleName, quantity: r.quantity,
          })),
        })
      }
    }
  })

  const full = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: PROJECT_INCLUDE,
  })
  return toDto(full)
}

// ───────────────────────────── Submit ─────────────────────────────

export async function submitProject(userId: string, projectId: string): Promise<ProjectDto> {
  const owned = await getOwnedProjectOr404(userId, projectId)

  if (owned.status !== 'DRAFT') {
    // شامل submit دوباره (SUBMITTED) و سایر وضعیت‌ها
    throw new HttpError(409, `پروژه در وضعیت ${owned.status} قابل ارسال نیست`)
  }

  // اعتبارسنجی کامل بودن بر اساس داده‌ی واقعی DB (نه فقط ورودی)
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      projectSkills: { select: { skillId: true } },
      roles: { select: { quantity: true } },
    },
  })

  const errors: { path: string; message: string }[] = []
  if (!project.title || project.title.trim().length < 3) {
    errors.push({ path: 'title', message: 'عنوان پروژه نامعتبر است' })
  }
  if (!project.description || project.description.length < 20) {
    errors.push({ path: 'description', message: 'شرح پروژه باید حداقل ۲۰ کاراکتر باشد' })
  }
  if (project.minBudget === null || project.maxBudget === null) {
    errors.push({ path: 'budget', message: 'حداقل و حداکثر بودجه هر دو باید ثبت شوند' })
  } else if (Number(project.minBudget) > Number(project.maxBudget)) {
    errors.push({ path: 'budget', message: 'حداقل بودجه نمی‌تواند از حداکثر بودجه بیشتر باشد' })
  }
  if (project.deadline === null) {
    errors.push({ path: 'deadline', message: 'مهلت انجام باید ثبت شود' })
  } else if (project.deadline.getTime() <= Date.now()) {
    errors.push({ path: 'deadline', message: 'مهلت انجام باید در آینده باشد' })
  }
  if (project.projectSkills.length === 0) {
    errors.push({ path: 'skills', message: 'حداقل یک مهارت برای پروژه لازم است' })
  }
  if (project.roles.length === 0) {
    errors.push({ path: 'roles', message: 'حداقل یک نقش برای پروژه لازم است' })
  } else if (project.roles.some((r) => r.quantity < 1)) {
    errors.push({ path: 'roles', message: 'تعداد هر نقش باید حداقل ۱ باشد' })
  }

  if (errors.length > 0) {
    // جزئیات نقص‌ها در خود پیام می‌آید تا قرارداد خطای استاندارد حفظ شود
    const detail = errors.map((e) => e.message).join(' · ')
    throw new HttpError(422, `پروژه برای ارسال کامل نیست — ${detail}`)
  }

  // انتقال اتمیک DRAFT → SUBMITTED (مقاوم در برابر race)
  const result = await prisma.project.updateMany({
    where: { id: projectId, clientId: userId, status: 'DRAFT' },
    data: { status: 'SUBMITTED' },
  })
  if (result.count === 0) {
    throw new HttpError(409, 'پروژه در وضعیت قابل ارسال نیست')
  }

  const full = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: PROJECT_INCLUDE,
  })
  return toDto(full)
}

// ───────────────────────────── Delete ─────────────────────────────

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const owned = await getOwnedProjectOr404(userId, projectId)

  // فقط DRAFT قابل حذف است — CANCELLED هم حذف نمی‌شود (حفظ سوابق؛ رفتار مستند)
  if (owned.status !== 'DRAFT') {
    throw new HttpError(409, `حذف پروژه فقط در وضعیت DRAFT مجاز است (وضعیت فعلی: ${owned.status})`)
  }

  // حذف با cascadeهای تعریف‌شده در Schema (project_skills / project_roles)
  await prisma.project.delete({ where: { id: projectId } })
}
