import type { TaskStatus, UserRole } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// قوانین خالص Task — بدون DB، کاملاً deterministic و unit-testable
// ─────────────────────────────────────────────────────────────

/**
 * چرخه‌ی وضعیت Task (DONE پایانی است):
 *   TODO → IN_PROGRESS ✓
 *   IN_PROGRESS → DONE ✓
 *   IN_PROGRESS → TODO ✓ (بازگشت)
 *   DONE → هرچیز ✗
 */
const ALLOWED_TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE', 'TODO'],
  DONE: [],
}

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TASK_TRANSITIONS[from]?.includes(to) ?? false
}

/** حذف Task فقط در TODO مجاز است */
export function canDeleteTask(status: TaskStatus): boolean {
  return status === 'TODO'
}

/** شروع اجرای پروژه فقط از TEAM_PROPOSED */
export function canStartProject(status: string): boolean {
  return status === 'TEAM_PROPOSED'
}

/** فیلدهای قابل ویرایش Task بر اساس نقش (تعریف واحد حقیقت) */
export const TASK_EDITABLE_FIELDS: Record<UserRole, string[]> = {
  ADMIN: ['title', 'description', 'priority', 'dueDate', 'assignedTo', 'status'],
  CLIENT: ['title', 'description', 'priority', 'dueDate', 'assignedTo'],
  SPECIALIST: ['status'],
}

export function canEditTaskField(role: UserRole, field: string): boolean {
  return TASK_EDITABLE_FIELDS[role].includes(field)
}

/** اعتبارسنجی سخت‌گیرانه‌ی تاریخ YYYY-MM-DD (بدون roll شدن تاریخ جعلی مثل 02-30) */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

/** آیا تاریخ قبل از امروز (UTC) است؟ */
export function isDateInPast(value: string): boolean {
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z')
  return new Date(`${value}T00:00:00Z`).getTime() < today.getTime()
}

export interface TaskPermissionInput {
  role: UserRole
  isProjectOwner: boolean
  isTeamMember: boolean
  isAssignee: boolean
}

export interface TaskPermissions {
  canView: boolean
  canCreate: boolean
  canDelete: boolean
  /** آیا اجازه‌ی تغییر status را دارد */
  canChangeStatus: boolean
  /** آیا فقط به فیلدهای محدود (status) دسترسی دارد */
  restrictedToStatusOnly: boolean
}

/**
 * محاسبه‌ی خالص مجوزهای Task — ماتریس:
 *   ADMIN            → همه‌چیز (اگر task/پروژه معتبر باشد)
 *   CLIENT مالک      → view/create/delete + ویرایش فیلدها (بدون status)
 *   SPECIALIST عضو   → view/create(فقط برای خودش) + status فقط روی task خودش
 *   بقیه (غیرمرتبط)  → هیچ (در Service با 404 رد می‌شوند)
 */
export function computeTaskPermissions(p: TaskPermissionInput): TaskPermissions {
  if (p.role === 'ADMIN') {
    return { canView: true, canCreate: true, canDelete: true, canChangeStatus: true, restrictedToStatusOnly: false }
  }
  if (p.role === 'CLIENT' && p.isProjectOwner) {
    return { canView: true, canCreate: true, canDelete: true, canChangeStatus: false, restrictedToStatusOnly: false }
  }
  if (p.role === 'SPECIALIST' && p.isTeamMember) {
    return {
      canView: true,
      canCreate: true, // فقط با assignedTo=خودش — در Service اعمال می‌شود
      canDelete: false,
      canChangeStatus: p.isAssignee, // فقط task خودش
      restrictedToStatusOnly: true,
    }
  }
  return { canView: false, canCreate: false, canDelete: false, canChangeStatus: false, restrictedToStatusOnly: false }
}
