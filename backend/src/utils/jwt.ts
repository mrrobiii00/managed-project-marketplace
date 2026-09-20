import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'
import { env } from './env'
import { HttpError } from './http-error'

// ─────────────────────────────────────────────────────────────
// ابزار JWT — امضا/بررسی توکن با HS256.
// Secret و مدت انقضا فقط از environment خوانده می‌شوند.
// ─────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  sub: string // user id
  role: UserRole
  email: string
}

const SIGN_OPTIONS: SignOptions = {
  algorithm: 'HS256',
  // cast لازم چون نوع jsonwebtoken برای رشته‌ی ms تنگ‌تر از string است
  expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, SIGN_OPTIONS)
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  let decoded: string | JwtPayload
  try {
    decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
  } catch {
    // نامعتبر یا منقضی — بدون افشای دلیل دقیق
    throw new HttpError(401, 'توکن نامعتبر یا منقضی شده است')
  }

  if (typeof decoded === 'string' || !decoded.sub || !decoded.role || !decoded.email) {
    throw new HttpError(401, 'توکن نامعتبر است')
  }

  return { sub: String(decoded.sub), role: decoded.role as UserRole, email: String(decoded.email) }
}
