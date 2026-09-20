import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی Projects با Zod
// فقط فیلدهای مجاز — clientId/status/id/timestamps هرگز از body
// پذیرفته نمی‌شوند (Zod کلیدهای ناشناخته را دور می‌ریزد → ضد Mass Assignment)
// ─────────────────────────────────────────────────────────────

const titleField = z
  .string({ message: 'عنوان باید رشته باشد' })
  .trim()
  .min(3, 'عنوان باید حداقل ۳ کاراکتر باشد')
  .max(200, 'عنوان حداکثر ۲۰۰ کاراکتر است')

const descriptionField = z
  .string({ message: 'شرح پروژه باید رشته باشد' })
  .min(20, 'شرح پروژه باید حداقل ۲۰ کاراکتر باشد')
  .max(10000, 'شرح پروژه حداکثر ۱۰۰۰۰ کاراکتر است')

// مبالغ: عدد ≥ 0 با حداکثر دو رقم اعشار (Budget Safety — بدون محاسبه‌ی float)
const budgetField = z
  .number({ message: 'بودجه باید عدد باشد' })
  .min(0, 'بودجه نمی‌تواند منفی باشد')
  .max(1_000_000_000_000, 'بودجه واردشده غیرمنطقی است')
  .refine((v) => Math.round(v * 100) === v * 100, 'بودجه حداکثر دو رقم اعشار می‌تواند داشته باشد')

// تاریخ فقط با فرمت YYYY-MM-DD (هماهنگ با @db.Date در Schema)
const deadlineField = z
  .string({ message: 'مهلت انجام باید رشته باشد' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'فرمت مهلت انجام باید YYYY-MM-DD باشد')
  .refine((v) => {
    // بررسی سخت‌گیرانه: تاریخ باید round-trip برابر باشد (JS تاریخ‌های ناموجود مثل 02-30 را roll می‌کند)
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, 'تاریخ مهلت انجام معتبر نیست')

const skillItemSchema = z.object({
  skillId: z.uuid('شناسه مهارت نامعتبر است'),
  isRequired: z.boolean({ message: 'isRequired باید boolean باشد' }).default(true),
})

const roleItemSchema = z.object({
  roleName: z
    .string({ message: 'نام نقش باید رشته باشد' })
    .trim()
    .min(2, 'نام نقش باید حداقل ۲ کاراکتر باشد')
    .max(100, 'نام نقش حداکثر ۱۰۰ کاراکتر است'),
  quantity: z
    .number({ message: 'تعداد باید عدد باشد' })
    .int('تعداد باید عدد صحیح باشد')
    .min(1, 'تعداد هر نقش حداقل ۱ است')
    .max(20, 'تعداد هر نقش حداکثر ۲۰ است'),
})

// تصمیم مستند: مهارت/نقش تکراری «در همان درخواست» reject می‌شود (بدون merge)
const skillsField = z
  .array(skillItemSchema)
  .max(20, 'حداکثر ۲۰ مهارت برای پروژه مجاز است')
  .optional()
  .refine((v) => !v || new Set(v.map((s) => s.skillId)).size === v.length, {
    message: 'مهارت تکراری در لیست ارسال شده است',
  })

const rolesField = z
  .array(roleItemSchema)
  .max(20, 'حداکثر ۲۰ نقش برای پروژه مجاز است')
  .optional()
  .refine((v) => !v || new Set(v.map((r) => r.roleName)).size === v.length, {
    message: 'نقش تکراری در لیست ارسال شده است — نام نقش‌ها باید یکتا باشند',
  })

const budgetPairRefine: { message: string; path: PropertyKey[] } = {
  message: 'حداقل بودجه نمی‌تواند از حداکثر بودجه بیشتر باشد',
  path: ['minBudget'],
}

export const createProjectSchema = z
  .object({
    title: titleField,
    description: descriptionField,
    minBudget: budgetField.optional(),
    maxBudget: budgetField.optional(),
    deadline: deadlineField.optional(),
    // مهارت/نقش در Create اختیاری‌اند (چرخه‌ی wizard) — حداقل‌ها در Submit اعمال می‌شوند
    skills: skillsField,
    roles: rolesField,
  })
  .refine(
    (v) => v.minBudget === undefined || v.maxBudget === undefined || v.minBudget <= v.maxBudget,
    budgetPairRefine,
  )

export const updateProjectSchema = z
  .object({
    title: titleField.optional(),
    description: descriptionField.optional(),
    minBudget: budgetField.optional(),
    maxBudget: budgetField.optional(),
    deadline: deadlineField.optional(),
    skills: skillsField,
    roles: rolesField,
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.minBudget !== undefined ||
      v.maxBudget !== undefined ||
      v.deadline !== undefined ||
      v.skills !== undefined ||
      v.roles !== undefined,
    { message: 'حداقل یک فیلد برای به‌روزرسانی لازم است' },
  )
  .refine(
    (v) => v.minBudget === undefined || v.maxBudget === undefined || v.minBudget <= v.maxBudget,
    budgetPairRefine,
  )

export const projectIdParamSchema = z.object({
  id: z.uuid('شناسه پروژه نامعتبر است'),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
