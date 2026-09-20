import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../database/prisma'
import { verifyAuthToken } from '../utils/jwt'
import { HttpError } from '../utils/http-error'

/**
 * Middleware احراز هویت با Bearer JWT.
 *
 * رفتار مستند و یکدست:
 *   • Header/tوکن وجود ندارد            → 401 «احراز هویت لازم است»
 *   • توکن نامعتبر یا منقضی              → 401 «توکن نامعتبر یا منقضی شده است»
 *   • توکن معتبر ولی حساب حذف شده        → 401 «احراز هویت لازم است»
 *   • توکن معتبر ولی isActive=false      → 403 «حساب کاربری شما غیرفعال است»
 *     (هویت احراز شده ولی حساب مسدود است؛ لذا 403 نه 401)
 *
 * نکته: هویت و نقش همیشه از دیتابیس خوانده می‌شوند؛
 * هیچ role یا userId ارسالی از client هرگز ملاک نیست.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'احراز هویت لازم است')
    }

    const token = header.slice('Bearer '.length).trim()
    const payload = verifyAuthToken(token) // خطاها اینجا 401 با پیام بالا برمی‌گردند

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true, createdAt: true },
    })
    if (!user) {
      throw new HttpError(401, 'احراز هویت لازم است')
    }
    if (!user.isActive) {
      throw new HttpError(403, 'حساب کاربری شما غیرفعال است')
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}
