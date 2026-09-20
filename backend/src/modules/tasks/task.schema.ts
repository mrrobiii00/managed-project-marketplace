import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی Task — Zod
// کلیدهای ناشناخته (id/projectId/teamId/createdAt/updatedAt) توسط
// Zod strip می‌شوند → ضد Mass Assignment. قوانین نقش‌محور در Service
// با تسک‌های خالص task.rules.ts اعمال می‌شوند.
// ─────────────────────────────────────────────────────────────

const titleField = z
  .string({ message: 'عنوان باید رشته باشد' })
  .trim()
  .min(2, 'عنوان باید حداقل ۲ کاراکتر باشد')
  .max(150, 'عنوان حداکثر ۱۵۰ کاراکتر است')

const descriptionField = z
  .string({ message: 'شرح باید رشته باشد' })
  .max(3000, 'شرح حداکثر ۳۰۰۰ کاراکتر است')
  .optional()

const priorityField = z.enum(['LOW', 'MEDIUM', 'HIGH'], {
  message: 'اولویت فقط LOW، MEDIUM یا HIGH می‌تواند باشد',
})

const statusField = z.enum(['TODO', 'IN_PROGRESS', 'DONE'], {
  message: 'وضعیت فقط TODO، IN_PROGRESS یا DONE می‌تواند باشد',
})

// تاریخ سخت‌گیرانه (round-trip مثل M06 — 2026-02-30 رد می‌شود)
const dueDateField = z
  .string({ message: 'مهلت انجام باید رشته باشد' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'فرمت مهلت انجام باید YYYY-MM-DD باشد')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'تاریخ مهلت انجام معتبر نیست')

export const createTaskSchema = z.object({
  title: titleField,
  description: descriptionField,
  priority: priorityField.default('MEDIUM'),
  dueDate: dueDateField.optional(),
  assignedTo: z.uuid('شناسه متخصص نامعتبر است').optional(),
})

export const updateTaskSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField,
    priority: priorityField.optional(),
    dueDate: dueDateField.optional(),
    // null = حذف تخصیص (فقط ADMIN/CLIENT — برای SPECIALIST در Service رد می‌شود)
    assignedTo: z.uuid('شناسه متخصص نامعتبر است').nullable().optional(),
    status: statusField.optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.priority !== undefined ||
      v.dueDate !== undefined ||
      v.assignedTo !== undefined ||
      v.status !== undefined,
    { message: 'حداقل یک فیلد برای به‌روزرسانی لازم است' },
  )

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: statusField.optional(),
  priority: priorityField.optional(),
  assignedTo: z.uuid('شناسه متخصص نامعتبر است').optional(),
})

export const taskParamsSchema = z.object({
  projectId: z.uuid('شناسه پروژه نامعتبر است'),
  taskId: z.uuid('شناسه تسک نامعتبر است'),
})

export const projectIdParamSchema = z.object({
  projectId: z.uuid('شناسه پروژه نامعتبر است'),
})

export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>
