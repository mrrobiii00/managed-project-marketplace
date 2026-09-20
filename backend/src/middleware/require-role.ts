import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '@prisma/client'
import { HttpError } from '../utils/http-error'

/**
 * Middleware مجوز نقش (RBAC).
 *
 * استفاده:
 *   requireRole('ADMIN')
 *   requireRole('CLIENT', 'ADMIN')
 *
 * باید بعد از requireAuth بیاید. نقش از req.user (خوانده‌شده از دیتابیس در require-auth)
 * بررسی می‌شود — هرگز از ادعای client.
 *
 * رفتار:
 *   • احراز هویت نشده (requireAuth جا افتاده یا توکن نبوده) → 401
 *   • احراز هویت شده ولی نقش مجاز نیست                    → 403
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new HttpError(401, 'احراز هویت لازم است'))
      return
    }
    if (!roles.includes(req.user.role)) {
      next(new HttpError(403, 'برای دسترسی به این بخش، نقش لازم را ندارید'))
      return
    }
    next()
  }
}
