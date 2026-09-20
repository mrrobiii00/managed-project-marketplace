import type { Request, Response } from 'express'
import * as authService from './auth.service'
import { registerSchema, loginSchema } from './auth.schema'

// ─────────────────────────────────────────────────────────────
// Controller نازک: فقط اعتبارسنجی ورودی، فراخوانی Service و پاسخ استاندارد
// ─────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body)
  const { user, token } = await authService.register(input)
  res.status(201).json({
    success: true,
    message: 'ثبت‌نام با موفقیت انجام شد',
    data: { id: user.id, email: user.email, role: user.role, token },
  })
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body)
  const { user, token } = await authService.login(input)
  res.json({
    success: true,
    message: 'ورود موفق',
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      token,
    },
  })
}

export async function me(req: Request, res: Response): Promise<void> {
  // req.user توسط require-auth از دیتابیس پر شده است — هیچ اطلاعاتی از body پذیرفته نمی‌شود
  res.json({ success: true, message: 'اطلاعات کاربر جاری', data: req.user })
}

export async function adminTest(req: Request, res: Response): Promise<void> {
  res.json({
    success: true,
    message: 'دسترسی ADMIN تأیید شد (endpoint آزمایشی RBAC)',
    data: { viewer: req.user },
  })
}
