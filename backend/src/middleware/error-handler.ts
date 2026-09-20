import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { HttpError } from '../utils/http-error'
import { isDev } from '../utils/env'

/**
 * Error Handler سراسری — همیشه پاسخ JSON استاندارد:
 *   { success: false, message: string, errors?: [...], stack?: string }
 *
 * ترتیب بررسی:
 *   ۱) ZodError        → 422 (اعتبارسنجی ورودی — از Milestoneهای بعدی)
 *   ۲) HttpError       → کد وضعیت دلخواه
 *   ۳) خطای Express    → status بین 400 تا 499 (مثل JSON خراب بدنه‌ی درخواست)
 *   ۴) ناشناخته        → 500 — در production جزئیات و stack پنهان می‌ماند
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ۱) خطاهای اعتبارسنجی Zod (آینده)
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'خطای اعتبارسنجی داده‌ها',
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    })
    return
  }

  // ۲) خطاهای HTTP صریح (code اختیاری ماشین‌خوان را هم برمی‌گرداند)
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ success: false, message: err.message, ...(err.code && { code: err.code }) })
    return
  }

  // ۳) خطاهای ساختار درخواست که خود Express تولید می‌کند (مثل بدنه‌ی JSON نامعتبر)
  const expressStatus = (err as { status?: unknown })?.status
  if (typeof expressStatus === 'number' && expressStatus >= 400 && expressStatus < 500) {
    res.status(expressStatus).json({
      success: false,
      message: (err as Error)?.message ?? 'درخواست نامعتبر است',
    })
    return
  }

  // ۴) خطاهای ناشناخته → 500 (stack فقط در development به client می‌رسد)
  console.error('❌ خطای پردازش‌نشده:', err)
  const fallbackMessage = err instanceof Error ? err.message : 'خطای داخلی سرور'
  res.status(500).json({
    success: false,
    message: isDev ? fallbackMessage : 'خطای داخلی سرور',
    ...(isDev && err instanceof Error && { stack: err.stack }),
  })
}
