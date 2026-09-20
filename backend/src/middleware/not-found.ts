import type { Request, Response } from 'express'

/**
 * هندلر 404 — هر مسیر ناشناخته پاسخ JSON استاندارد می‌گیرد.
 * باید بعد از همه‌ی routeها (و قبل از errorHandler) ثبت شود.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `مسیر «${req.method} ${req.originalUrl}» یافت نشد`,
  })
}
