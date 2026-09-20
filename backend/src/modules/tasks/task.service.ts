import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { Pagination } from '../../utils/pagination'
import type { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from './task.schema'
import {
  canTransitionTaskStatus,
  canDeleteTask,
  canEditTaskField,
  isDateInPast,
} from './task.rules'
import type { TaskDto } from './task.types'

// ─────────────────────────────────────────────────────────────
// منطق Tasks — ماتریس دسترسی:
//   ADMIN → همه‌چیز | CLIENT مالک → create/read/update(فیلدها)/delete |
//   SPECIALIST عضو تیم → create(فقط برای خودش)/read + status فقط روی task خودش |
//   غیرمرتبط → 404 (عدم افشای وجود پروژه)
// تغییرات فقط روی پروژه‌ی IN_PROGRESS (خواندن در هر وضعیت مجاز است)
// ─────────────────────────────────────────────────────────────

const TASK_SELECT = {
  id: true,
  projectId: true,
  teamId: true,
  assignedTo: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  assignee: { select: { id: true, profile: { select: { fullName: true } } } },
} satisfies Prisma.TaskSelect

type TaskRow = Prisma.TaskGetPayload<{ select: typeof TASK_SELECT }>

function toDto(t: TaskRow): TaskDto {
  return {
    id: t.id,
    projectId: t.projectId,
    teamId: t.teamId,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate === null ? null : t.dueDate.toISOString().slice(0, 10),
    assignedTo: t.assignee
      ? { id: t.assignee.id, fullName: t.assignee.profile?.fullName ?? null }
      : null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

interface TaskContext {
  project: { id: string; status: string; clientId: string }
  team: { id: string }
  memberIds: Set<string>
  isOwner: boolean
  isMember: boolean
}

/** بافتار مشترک: پروژه + تیم + عضویت — غیرمرتبط‌ها 404 می‌گیرند */
async function getTaskContext(
  viewer: { id: string; role: string },
  projectId: string,
): Promise<TaskContext> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      clientId: true,
      team: { select: { id: true, members: { select: { userId: true } } } },
    },
  })
  if (!project) throw new HttpError(404, 'پروژه موردنظر یافت نشد', 'PROJECT_NOT_FOUND')

  const isOwner = project.clientId === viewer.id
  const memberIds = new Set(project.team?.members.map((m) => m.userId) ?? [])
  const isMember = memberIds.has(viewer.id)

  if (viewer.role !== 'ADMIN' && !isOwner && !isMember) {
    // 404 عمدی — وجود پروژه/تسک برای غیرمرتبط افشا نشود (ضد IDOR)
    throw new HttpError(404, 'پروژه موردنظر یافت نشد', 'PROJECT_NOT_FOUND')
  }
  return {
    project: { id: project.id, status: project.status, clientId: project.clientId },
    team: { id: project.team?.id ?? '' },
    memberIds,
    isOwner,
    isMember,
  }
}

function assertProjectInProgress(status: string): void {
  if (status !== 'IN_PROGRESS') {
    throw new HttpError(
      409,
      `مدیریت تسک‌ها فقط روی پروژه‌ی در حال اجرا مجاز است (وضعیت فعلی: ${status})`,
      'PROJECT_NOT_IN_PROGRESS',
    )
  }
}

/** تخصیص‌گیرنده باید SPECIALIST فعالِ عضو همین تیم باشد (422 deterministic) */
async function assertAssigneeIsValid(memberIds: Set<string>, assignedTo: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: assignedTo },
    select: { role: true, isActive: true },
  })
  if (!user) {
    throw new HttpError(422, 'کاربر انتخاب‌شده یافت نشد', 'ASSIGNEE_NOT_TEAM_MEMBER')
  }
  if (user.role !== 'SPECIALIST') {
    throw new HttpError(422, 'تخصیص تسک فقط به متخصص مجاز است', 'ASSIGNEE_NOT_TEAM_MEMBER')
  }
  if (!user.isActive) {
    throw new HttpError(422, 'کاربر انتخاب‌شده غیرفعال است', 'ASSIGNEE_NOT_TEAM_MEMBER')
  }
  if (!memberIds.has(assignedTo)) {
    throw new HttpError(422, 'کاربر انتخاب‌شده عضو تیم این پروژه نیست', 'ASSIGNEE_NOT_TEAM_MEMBER')
  }
}

/** تسک باید دقیقاً متعلق به همان پروژه باشد — گارد اصلی IDOR */
async function getProjectTaskOr404(projectId: string, taskId: string): Promise<TaskRow> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: TASK_SELECT,
  })
  if (!task) {
    throw new HttpError(404, 'تسک موردنظر یافت نشد', 'TASK_NOT_FOUND')
  }
  return task
}

// ───────────────────────────── Create ─────────────────────────────

export async function createTask(
  viewer: { id: string; role: string },
  projectId: string,
  input: CreateTaskInput,
): Promise<TaskDto> {
  const ctx = await getTaskContext(viewer, projectId)
  assertProjectInProgress(ctx.project.status)

  if (!ctx.team.id) {
    throw new HttpError(409, 'تیم برای این پروژه ثبت نشده است', 'TEAM_NOT_FOUND')
  }

  let assignedTo: string | undefined = input.assignedTo

  // Specialist فقط برای خودش می‌تواند تسک بسازد
  if (viewer.role === 'SPECIALIST') {
    if (assignedTo && assignedTo !== viewer.id) {
      throw new HttpError(403, 'متخصص فقط می‌تواند تسک برای خودش ایجاد کند', 'SPECIALIST_TASK_FORBIDDEN')
    }
    assignedTo = assignedTo ?? viewer.id
  }

  // اعتبارسنجی تخصیص (CLIENT/ADMIN فقط به عضو تیم معتبر)
  if (assignedTo) {
    await assertAssigneeIsValid(ctx.memberIds, assignedTo)
  }

  // مهلت انجام نباید در گذشته باشد (فقط در Create — در Update طبق نیاز خاص مجاز است)
  if (input.dueDate && isDateInPast(input.dueDate)) {
    throw new HttpError(422, 'مهلت انجام نمی‌تواند در گذشته باشد', 'INVALID_DUE_DATE')
  }

  const created = await prisma.task.create({
    data: {
      projectId,
      teamId: ctx.team.id, // تیمِ همان پروژه — mismatch ناممکن
      assignedTo: assignedTo ?? null,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00Z`) : null,
      status: 'TODO',
    },
    select: TASK_SELECT,
  })
  return toDto(created)
}

// ───────────────────────────── Read ─────────────────────────────

export async function listTasks(
  viewer: { id: string; role: string },
  projectId: string,
  query: ListTasksQuery,
) {
  await getTaskContext(viewer, projectId)

  const where: Prisma.TaskWhereInput = {
    projectId,
    ...(query.status && { status: query.status }),
    ...(query.priority && { priority: query.priority }),
    ...(query.assignedTo && { assignedTo: query.assignedTo }),
  }

  const pagination: Pagination = { page: query.page, pageSize: query.pageSize }

  const [rows, total] = await Promise.all([
    prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], // deterministic
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.task.count({ where }),
  ])

  return {
    items: rows.map(toDto),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}

export async function getTask(
  viewer: { id: string; role: string },
  projectId: string,
  taskId: string,
): Promise<TaskDto> {
  await getTaskContext(viewer, projectId)
  const task = await getProjectTaskOr404(projectId, taskId)
  return toDto(task)
}

// ───────────────────────────── Update ─────────────────────────────

const SPECIALIST_FORBIDDEN_FIELDS = ['title', 'description', 'priority', 'dueDate', 'assignedTo'] as const

export async function updateTask(
  viewer: { id: string; role: string },
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskDto> {
  const ctx = await getTaskContext(viewer, projectId)

  const task = await getProjectTaskOr404(projectId, taskId)

  // سازگاری تسک با تیمِ پروژه (تسک همیشه باید متعلق به تیم همین پروژه باشد)
  if (task.teamId !== ctx.team.id) {
    throw new HttpError(404, 'تسک موردنظر یافت نشد', 'TASK_PROJECT_MISMATCH')
  }

  // تغییرات فقط روی پروژه‌ی در حال اجرا (بعد از 404 تا ترکیب ناهمخوان 404 بگیرد)
  assertProjectInProgress(ctx.project.status)

  // ── SPECIALIST: فقط status و فقط روی تسک خودش ──
  if (viewer.role === 'SPECIALIST') {
    for (const f of SPECIALIST_FORBIDDEN_FIELDS) {
      if (input[f] !== undefined) {
        throw new HttpError(403, `متخصص اجازه‌ی تغییر «${f}» را ندارد`, 'SPECIALIST_TASK_FORBIDDEN')
      }
    }
    if (task.assignedTo !== viewer.id) {
      throw new HttpError(403, 'متخصص فقط می‌تواند وضعیت تسک خودش را تغییر دهد', 'SPECIALIST_TASK_FORBIDDEN')
    }
    if (input.status !== undefined && !canTransitionTaskStatus(task.status, input.status)) {
      throw new HttpError(
        409,
        `گذار وضعیت ${task.status} → ${input.status} مجاز نیست`,
        'INVALID_TASK_STATUS_TRANSITION',
      )
    }
  }

  // ── ADMIN: کامل (شامل status با چک گذار) ──
  if (viewer.role === 'ADMIN' && input.status !== undefined) {
    if (!canTransitionTaskStatus(task.status, input.status)) {
      throw new HttpError(
        409,
        `گذار وضعیت ${task.status} → ${input.status} مجاز نیست`,
        'INVALID_TASK_STATUS_TRANSITION',
      )
    }
  }
  // CLIENT مالک: status در schema مجاز نیست (strip می‌شود) — فیلدهای دیگر آزاد

  // اعتبارسنجی تخصیص جدید (ADMIN/CLIENT)
  if (input.assignedTo !== undefined && input.assignedTo !== null) {
    await assertAssigneeIsValid(ctx.memberIds, input.assignedTo)
  }

  // DONE پایانی است — هیچ ویرایش فیلدی روی تسک DONE مجاز نیست
  if (task.status === 'DONE') {
    throw new HttpError(409, 'تسک تکمیل‌شده قابل ویرایش نیست', 'TASK_ALREADY_DONE')
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && canEditTaskField(viewer.role as 'ADMIN' | 'CLIENT' | 'SPECIALIST', 'title') && { title: input.title }),
      ...(input.description !== undefined && canEditTaskField(viewer.role as 'ADMIN' | 'CLIENT' | 'SPECIALIST', 'description') && { description: input.description }),
      ...(input.priority !== undefined && canEditTaskField(viewer.role as 'ADMIN' | 'CLIENT' | 'SPECIALIST', 'priority') && { priority: input.priority }),
      ...(input.dueDate !== undefined && canEditTaskField(viewer.role as 'ADMIN' | 'CLIENT' | 'SPECIALIST', 'dueDate') && { dueDate: new Date(`${input.dueDate}T00:00:00Z`) }),
      ...(input.assignedTo !== undefined &&
        canEditTaskField(viewer.role as 'ADMIN' | 'CLIENT' | 'SPECIALIST', 'assignedTo') && { assignedTo: input.assignedTo }),
      ...(input.status !== undefined && canEditTaskField(viewer.role as 'ADMIN' | 'CLIENT' | 'SPECIALIST', 'status') && { status: input.status }),
    },
    select: TASK_SELECT,
  })
  return toDto(updated)
}

// ───────────────────────────── Delete ─────────────────────────────

export async function deleteTask(
  viewer: { id: string; role: string },
  projectId: string,
  taskId: string,
): Promise<void> {
  const ctx = await getTaskContext(viewer, projectId)

  const task = await getProjectTaskOr404(projectId, taskId)
  if (task.teamId !== ctx.team.id) {
    throw new HttpError(404, 'تسک موردنظر یافت نشد', 'TASK_PROJECT_MISMATCH')
  }

  // تغییرات فقط روی پروژه‌ی در حال اجرا (بعد از 404 تا ترکیب ناهمخوان 404 بگیرد)
  assertProjectInProgress(ctx.project.status)

  // SPECIALIST مجاز به حذف نیست (حتی عضو تیم)
  if (viewer.role === 'SPECIALIST') {
    throw new HttpError(403, 'حذف تسک برای متخصص مجاز نیست', 'SPECIALIST_TASK_FORBIDDEN')
  }
  // (ADMIN و CLIENT مالک از بافتار عبور کرده‌اند؛ CLIENT غیرمالک 404 گرفته)

  if (!canDeleteTask(task.status)) {
    throw new HttpError(
      409,
      `حذف تسک فقط در وضعیت TODO مجاز است (وضعیت فعلی: ${task.status})`,
      'TASK_NOT_EDITABLE',
    )
  }

  await prisma.task.delete({ where: { id: taskId } })
}
