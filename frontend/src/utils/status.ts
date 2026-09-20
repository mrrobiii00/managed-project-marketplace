// ─────────────────────────────────────────────────────────────
// نگاشت مرکزی وضعیت پروژه → فارسی + رنگ Badge + قواعد UI
//
// ⚠️ قواعد action فقط «راهنمای UI» هستند؛ source of truth همیشه
// بک‌اند M06 است (ویرایش: DRAFT|SUBMITTED — حذف/ارسال: فقط DRAFT)
// و در هر submit دوباره enforce می‌شود (409/422).
// ─────────────────────────────────────────────────────────────

import type { BadgeVariant } from '../components/ui/Badge'
import type { ProjectStatus } from '../types/project'
import type { RecommendationStatus } from '../types/recommendation'
import type { Availability, SkillLevel } from '../types/profile'
import type { TaskPriority, TaskStatus } from '../types/task'
import type { TeamStatus } from '../types/team'

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  DRAFT: 'پیش‌نویس',
  SUBMITTED: 'ارسال‌شده',
  MATCHING: 'در حال یافتن تیم',
  REVIEW: 'در حال بررسی',
  TEAM_PROPOSED: 'تیم پیشنهادی',
  IN_PROGRESS: 'در حال اجرا',
  COMPLETED: 'تکمیل‌شده',
  RATED: 'ارزیابی‌شده',
  CANCELLED: 'لغوشده',
}

export const PROJECT_STATUS_VARIANT: Record<ProjectStatus, BadgeVariant> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  MATCHING: 'primary',
  REVIEW: 'warning',
  TEAM_PROPOSED: 'primary',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  RATED: 'success',
  CANCELLED: 'danger',
}

export function statusLabel(status: ProjectStatus): string {
  return PROJECT_STATUS_LABEL[status] ?? status
}

export function statusVariant(status: ProjectStatus): BadgeVariant {
  return PROJECT_STATUS_VARIANT[status] ?? 'neutral'
}

/** آینه‌ی دقیق EDITABLE_STATUSES بک‌اند (project.service.ts M06) */
const EDITABLE_STATUSES: readonly ProjectStatus[] = ['DRAFT', 'SUBMITTED']

export function canEditProject(status: ProjectStatus): boolean {
  return EDITABLE_STATUSES.includes(status)
}

/** حذف فقط در DRAFT — بک‌اند برای بقیه 409 می‌دهد (حفظ سوابق) */
export function canDeleteProject(status: ProjectStatus): boolean {
  return status === 'DRAFT'
}

/** ارسال فقط از DRAFT — بک‌اند برای بقیه 409 می‌دهد */
export function canSubmitProject(status: ProjectStatus): boolean {
  return status === 'DRAFT'
}

/** تاریخ ISO → نمایش فارسی */
export function formatFaDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

/** مبلغ رشته‌ای → نمایش فارسی با جداکننده‌ی هزارگان */
export function formatFaBudget(value: string | null): string {
  if (value === null) return '—'
  try {
    return Number(value).toLocaleString('fa-IR')
  } catch {
    return value
  }
}

/** امتیاز خام بک‌اند (number 0..100) → نمایش فارسی با ٪ — بدون هیچ بازمحاسبه */
export function formatFaScore(value: number): string {
  return `${Number(value).toLocaleString('fa-IR', { maximumFractionDigits: 2 })}٪`
}

/** عدد فارسی خالص بدون پسوند — برای «۴ از ۵» و «۸۸ از ۱۰۰» (M15) */
export function formatFaNumber(value: number): string {
  return Number(value).toLocaleString('fa-IR', { maximumFractionDigits: 2 })
}

// ── وضعیت پیشنهاد (M11) ──

export const RECO_STATUS_LABEL: Record<RecommendationStatus, string> = {
  RECOMMENDED: 'پیشنهاد مناسب',
  NEEDS_REVIEW: 'نیازمند بررسی',
}

export function recoStatusLabel(status: RecommendationStatus): string {
  return RECO_STATUS_LABEL[status] ?? status
}

export function recoStatusVariant(status: RecommendationStatus): BadgeVariant {
  return status === 'RECOMMENDED' ? 'success' : 'warning'
}

// ── وضعیت دسترس‌بودگی و سطح مهارت (M05) ──

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  AVAILABLE: 'آماده‌ی همکاری',
  BUSY: 'مشغول',
  UNAVAILABLE: 'در دسترس نیست',
}

export const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  BEGINNER: 'مقدماتی',
  INTERMEDIATE: 'متوسط',
  ADVANCED: 'پیشرفته',
  EXPERT: 'خبره',
}

export function availabilityLabel(a: Availability): string {
  return AVAILABILITY_LABEL[a] ?? a
}

export function skillLevelLabel(l: SkillLevel): string {
  return SKILL_LEVEL_LABEL[l] ?? l
}

// ── وضعیت Task / اولویت / وضعیت Team (M08/M09) ──

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'انجام نشده',
  IN_PROGRESS: 'در حال انجام',
  DONE: 'انجام شده',
}

export const TASK_STATUS_VARIANT: Record<TaskStatus, BadgeVariant> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'کم',
  MEDIUM: 'متوسط',
  HIGH: 'زیاد',
}

export const TASK_PRIORITY_VARIANT: Record<TaskPriority, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
}

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  PROPOSED: 'پیشنهادی',
  ACTIVE: 'فعال',
  COMPLETED: 'تکمیل‌شده',
}

export const TEAM_STATUS_VARIANT: Record<TeamStatus, BadgeVariant> = {
  PROPOSED: 'warning',
  ACTIVE: 'success',
  COMPLETED: 'neutral',
}

export function taskStatusLabel(s: TaskStatus): string {
  return TASK_STATUS_LABEL[s] ?? s
}

export function taskStatusVariant(s: TaskStatus): BadgeVariant {
  return TASK_STATUS_VARIANT[s] ?? 'neutral'
}

export function taskPriorityLabel(p: TaskPriority): string {
  return TASK_PRIORITY_LABEL[p] ?? p
}

export function taskPriorityVariant(p: TaskPriority): BadgeVariant {
  return TASK_PRIORITY_VARIANT[p] ?? 'neutral'
}

export function teamStatusLabel(s: TeamStatus): string {
  return TEAM_STATUS_LABEL[s] ?? s
}

export function teamStatusVariant(s: TeamStatus): BadgeVariant {
  return TEAM_STATUS_VARIANT[s] ?? 'neutral'
}
