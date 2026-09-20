// ─────────────────────────────────────────────────────────────
// انواع پاسخ API — مطابق قرارداد { success, message, data }
// ─────────────────────────────────────────────────────────────

/** پاکت استاندارد پاسخ بک‌اند */
export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

/** بدنه‌ی خطای احتمالی (Zod error یا پیام متنی) */
export interface ApiErrorBody {
  success?: false
  message?: string
  code?: string
  errors?: Array<{ path: string; message: string }>
}

/** خطای نرمال‌شده‌ی سمت کلاینت با پیام فارسی */
export class ApiError extends Error {
  /** HTTP status؛ 0 یعنی خطای شبکه */
  readonly status: number
  /** کد/شناسه‌ی اختیاری خطای بک‌اند */
  readonly code?: string
  /** خطاهای فیلدبه‌فیلد (422) در صورت وجود */
  readonly fieldErrors?: Array<{ path: string; message: string }>

  constructor(
    status: number,
    message: string,
    code?: string,
    fieldErrors?: Array<{ path: string; message: string }>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }
}
