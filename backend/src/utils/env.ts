import { z } from 'zod'

// ─────────────────────────────────────────────────────────────
// اعتبارسنجی پایه‌ی متغیرهای محیط با Zod — در شروع Backend اجرا می‌شود.
// اگر متغیر الزامی نامعتبر باشد، برنامه با پیام واضح متوقف می‌شود.
// ─────────────────────────────────────────────────────────────

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL تنظیم نشده است')
    .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
      message: 'DATABASE_URL باید یک connection string معتبر PostgreSQL باشد',
    }),
  // ── Authentication (Milestone 04) ──
  // Secret فقط از environment خوانده می‌شود — هیچ مقدار پیش‌فرض/هاردکد وجود ندارد.
  JWT_SECRET: z.string().min(16, 'JWT_SECRET حداقل باید ۱۶ کاراکتر باشد'),
  JWT_EXPIRES_IN: z.string().default('1h'), // مثل: 1h · 7d · 30m
  // اختیاری — originهای مجاز CORS، جدا شده با کاما
  CORS_ORIGINS: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ متغیرهای محیط نامعتبر هستند:')
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data

export const isDev = env.NODE_ENV === 'development'
export const isProd = env.NODE_ENV === 'production'

// اگر CORS_ORIGINS تنظیم شده باشد فقط همان originها مجازند؛ در غیر این صورت null
export const corsOrigins: string[] | null =
  env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean) ?? null
