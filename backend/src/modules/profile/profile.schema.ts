import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی Profile و UserSkill با Zod
// فقط فیلدهای مجاز اینجا تعریف می‌شوند — هر کلید ناشناخته
// (مثل role یا userId) به‌صورت پیش‌فرض توسط Zod دور ریخته می‌شود
// (ضد Mass Assignment).
// ─────────────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  fullName: z
    .string({ message: 'نام کامل باید رشته باشد' })
    .trim()
    .min(2, 'نام کامل باید حداقل ۲ کاراکتر باشد')
    .max(100, 'نام کامل حداکثر ۱۰۰ کاراکتر است')
    .optional(),
  bio: z.string().trim().max(2000, 'بیوگرافی حداکثر ۲۰۰۰ کاراکتر است').optional(),
  jobTitle: z.string().trim().max(100, 'عنوان شغلی حداکثر ۱۰۰ کاراکتر است').optional(),
  yearsOfExperience: z
    .number({ message: 'سال تجربه باید عدد باشد' })
    .int('سال تجربه باید عدد صحیح باشد')
    .min(0, 'سال تجربه نمی‌تواند منفی باشد')
    .max(60, 'سال تجربه واردشده غیرمنطقی است')
    .optional(),
  availability: z
    .enum(['AVAILABLE', 'BUSY', 'UNAVAILABLE'], { message: 'وضعیت دسترس‌بودگی نامعتبر است' })
    .optional(),
  avatarUrl: z
    .string()
    .trim()
    .regex(/^https?:\/\/\S+$/i, 'آدرس تصویر باید یک URL معتبر http/https باشد')
    .max(500, 'آدرس تصویر حداکثر ۵۰۰ کاراکتر است')
    .optional(),
  hourlyRate: z
    .number({ message: 'نرخ ساعتی باید عدد باشد' })
    .min(0, 'نرخ ساعتی نمی‌تواند منفی باشد')
    .max(1_000_000_000, 'نرخ ساعتی واردشده غیرمنطقی است')
    .refine((v) => Math.round(v * 100) === v * 100, 'نرخ ساعتی حداکثر دو رقم اعشار می‌تواند داشته باشد')
    .optional(),
})

export const addUserSkillSchema = z.object({
  skillId: z.uuid('شناسه مهارت نامعتبر است'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], {
    message: 'سطح مهارت نامعتبر است',
  }),
  yearsOfExperience: z
    .number({ message: 'سال تجربه باید عدد باشد' })
    .int('سال تجربه باید عدد صحیح باشد')
    .min(0, 'سال تجربه نمی‌تواند منفی باشد')
    .max(60, 'سال تجربه واردشده غیرمنطقی است'),
})

export const updateUserSkillSchema = z
  .object({
    level: z
      .enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'], { message: 'سطح مهارت نامعتبر است' })
      .optional(),
    yearsOfExperience: z
      .number({ message: 'سال تجربه باید عدد باشد' })
      .int('سال تجربه باید عدد صحیح باشد')
      .min(0, 'سال تجربه نمی‌تواند منفی باشد')
      .max(60, 'سال تجربه واردشده غیرمنطقی است')
      .optional(),
  })
  .refine((v) => v.level !== undefined || v.yearsOfExperience !== undefined, {
    message: 'حداقل یکی از فیلدهای level یا yearsOfExperience لازم است',
  })

export const skillIdParamSchema = z.object({
  skillId: z.uuid('شناسه مهارت نامعتبر است'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AddUserSkillInput = z.infer<typeof addUserSkillSchema>
export type UpdateUserSkillInput = z.infer<typeof updateUserSkillSchema>
