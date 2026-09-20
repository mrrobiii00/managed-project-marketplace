import type { UserRole } from '@prisma/client'

/**
 * اطلاعات امن User — هرگز شامل passwordHash نیست.
 * همین شکل در تمام responseهای آینده برای کاربر استفاده می‌شود.
 */
export interface SafeUser {
  id: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: Date
}

// افزودن req.user به نوع Express Request (Type Augmentation)
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser
    }
  }
}
