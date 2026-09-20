import argon2 from 'argon2'
import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import { signAuthToken } from '../../utils/jwt'
import type { RegisterInput, LoginInput } from './auth.schema'
import type { SafeUser } from './auth.types'

// ─────────────────────────────────────────────────────────────
// منطق اصلی Authentication (منطق در Service، نه Controller)
// ─────────────────────────────────────────────────────────────

const GENERIC_AUTH_ERROR = 'ایمیل یا رمز عبور نادرست است'

// هش ثابتِ بی‌خطر برای هم‌زمان‌سازی زمان پاسخ در حالت «کاربر ناموجود»
// (کاهش User Enumeration مبتنی بر timing — مقدارش راز نیست)
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$9Gofsrf/ykODQI2yWQGzNw$+kpg11W1sOuoS6kf7qCfve/blxwKXRZ4jjAl2hlud3c'

// فیلدهای امن — passwordHash هرگز select نمی‌شود
const SAFE_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect

async function hashPassword(password: string): Promise<string> {
  // Argon2id — پارامترهای پیش‌فرض کتابخانه (m=65536, p=4, t=3)
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
  // در production واقعی، ADMIN فقط از مسیر داخلی (seed/اسکریپت ops) ساخته می‌شود —
  // هرگز از public register. جزئیات در مستندات Milestone 04.
  if (input.role === 'ADMIN') {
    throw new HttpError(403, 'ثبت‌نام با نقش ADMIN از مسیر عمومی مجاز نیست')
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (existing) {
    throw new HttpError(409, 'این ایمیل قبلاً ثبت شده است')
  }

  let created: SafeUser
  try {
    created = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      },
      select: SAFE_SELECT,
    })
  } catch (err) {
    // مسابقه‌ی هم‌زمانی روی unique email (دو register هم‌زمان)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'این ایمیل قبلاً ثبت شده است')
    }
    throw err
  }

  const token = signAuthToken({ sub: created.id, role: created.role, email: created.email })
  return { user: created, token }
}

export async function login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } })

  if (!user) {
    // یک verify بی‌اثثر برای هم‌زمان‌سازی زمان پاسخ با حالت «رمز اشتباه»
    await argon2.verify(DUMMY_HASH, input.password).catch(() => false)
    throw new HttpError(401, GENERIC_AUTH_ERROR)
  }

  const passwordOk = await argon2.verify(user.passwordHash, input.password)
  if (!passwordOk) {
    // همان پیام عمومی — بدون افشای وجود حساب
    throw new HttpError(401, GENERIC_AUTH_ERROR)
  }

  // بررسی isActive بعد از تأیید رمز تا فقط با اعتبارنامه‌ی درست معلوم شود
  if (!user.isActive) {
    throw new HttpError(403, 'حساب کاربری شما غیرفعال است')
  }

  const token = signAuthToken({ sub: user.id, role: user.role, email: user.email })
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    token,
  }
}

export async function getSafeUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id }, select: SAFE_SELECT })
  if (!user) {
    // توکن امضاشده معتبر است ولی حساب حذف شده — هویت دیگر معتبر نیست
    throw new HttpError(401, 'احراز هویت لازم است')
  }
  return user
}
