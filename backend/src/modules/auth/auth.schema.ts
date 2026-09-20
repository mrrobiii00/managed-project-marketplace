import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی Authentication با Zod
// ─────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// نرمال‌سازی ایمیل: trim + lowercase قبل از بررسی فرمت
const emailField = z
  .string({ message: 'ایمیل الزامی است' })
  .trim()
  .toLowerCase()
  .regex(EMAIL_RE, 'ایمیل معتبر نیست')

export const registerSchema = z.object({
  email: emailField,
  password: z
    .string({ message: 'رمز عبور الزامی است' })
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
  // ADMIN از نظر شکل معتبر است تا به Service برسد و آنجا با 403 رد شود
  // (تفاوت پیام «نقش نامعتبر» با «ساخت ADMIN مجاز نیست» حفظ می‌شود)
  role: z.enum(['CLIENT', 'SPECIALIST', 'ADMIN'], { message: 'نقش نامعتبر است' }),
})

export const loginSchema = z.object({
  email: emailField,
  // حداقل ۱ کاراکتر کافی است؛ رمزِ کوتاه هم به verify می‌رسد و پیام عمومی 401 می‌گیرد
  // (تا از روی کد خطا نتوان وجود حساب را تشخیص داد)
  password: z.string({ message: 'رمز عبور الزامی است' }).min(1, 'رمز عبور الزامی است'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
