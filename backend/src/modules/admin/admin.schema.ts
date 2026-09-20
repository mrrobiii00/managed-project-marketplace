import { z } from 'zod'
import { paginationSchema } from '../../utils/pagination'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی ماژول Admin (Review / Match Decision / Team / Dashboard)
// ─────────────────────────────────────────────────────────────

export const decisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT'], { message: 'تصمیم باید APPROVE یا REJECT باشد' }),
})

const teamMemberSchema = z.object({
  specialistId: z.uuid('شناسه متخصص نامعتبر است'),
  role: z
    .string({ message: 'نام نقش باید رشته باشد' })
    .trim()
    .min(2, 'نام نقش باید حداقل ۲ کاراکتر باشد')
    .max(100, 'نام نقش حداکثر ۱۰۰ کاراکتر است'),
})

const membersField = z
  .array(teamMemberSchema)
  .min(1, 'حداقل یک عضو برای تیم لازم است')
  .max(50, 'حداکثر ۵۰ عضو برای تیم مجاز است')
  .refine((v) => new Set(v.map((m) => m.specialistId)).size === v.length, {
    message: 'یک متخصص نمی‌تواند دو بار در تیم ثبت شود',
  })

export const createTeamSchema = z.object({
  name: z
    .string({ message: 'نام تیم باید رشته باشد' })
    .trim()
    .min(3, 'نام تیم باید حداقل ۳ کاراکتر باشد')
    .max(150, 'نام تیم حداکثر ۱۵۰ کاراکتر است'),
  members: membersField,
})

export const updateTeamSchema = z
  .object({
    name: z
      .string({ message: 'نام تیم باید رشته باشد' })
      .trim()
      .min(3, 'نام تیم باید حداقل ۳ کاراکتر باشد')
      .max(150, 'نام تیم حداکثر ۱۵۰ کاراکتر است')
      .optional(),
    members: membersField,
  })
  .refine((v) => v.name !== undefined || v.members !== undefined, {
    message: 'حداقل یکی از فیلدهای name یا members لازم است',
  })

export const projectMatchParamsSchema = z.object({
  projectId: z.uuid('شناسه پروژه نامعتبر است'),
  specialistId: z.uuid('شناسه متخصص نامعتبر است'),
})

export const projectIdParamSchema = z.object({
  projectId: z.uuid('شناسه پروژه نامعتبر است'),
})

// ─────────────────────────────────────────────────────────────
// M12 — Admin Dashboard
// صفحه‌بندی Dashboard: همان utility مشترک، فقط پیش‌فرض pageSize=10 طبق قرارداد M12
// (سقف ۱۰۰ و بقیه‌ی قواعد دقیقاً از paginationSchema موجود ارث می‌برد)
// ─────────────────────────────────────────────────────────────
export const dashboardPaginationSchema = paginationSchema.extend({
  pageSize: z.coerce
    .number()
    .int('اندازه‌ی صفحه باید عدد صحیح باشد')
    .min(1, 'اندازه‌ی صفحه باید حداقل ۱ باشد')
    .max(100, 'اندازه‌ی صفحه حداکثر ۱۰۰ است')
    .default(10),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
