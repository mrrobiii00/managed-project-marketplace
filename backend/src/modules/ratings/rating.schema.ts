import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی Rating — فقط toUserId/score/review از body
// می‌آیند؛ fromUserId همیشه از توکن و projectId از مسیر است
// (کلیدهای ناشناخته strip می‌شوند → ضد Mass Assignment).
// ─────────────────────────────────────────────────────────────

export const createRatingSchema = z.object({
  toUserId: z.uuid('شناسه کاربر هدف نامعتبر است'),
  score: z
    .number({ message: 'امتیاز باید عدد باشد' })
    .int('امتیاز باید عدد صحیح بین ۱ تا ۵ باشد')
    .min(1, 'امتیاز حداقل ۱ است')
    .max(5, 'امتیاز حداکثر ۵ است'),
  review: z
    .string({ message: 'دیدگاه باید رشته باشد' })
    .trim()
    .min(1, 'دیدگاه نمی‌تواند خالی باشد')
    .max(2000, 'دیدگاه حداکثر ۲۰۰۰ کاراکتر است')
    .optional(),
})

export const projectIdParamSchema = z.object({
  projectId: z.uuid('شناسه پروژه نامعتبر است'),
})

export const userIdParamSchema = z.object({
  userId: z.uuid('شناسه کاربر نامعتبر است'),
})

export type CreateRatingInput = z.infer<typeof createRatingSchema>
