// ─────────────────────────────────────────────────────────────
// سرویس احراز هویت — دقیقاً منطبق با endpointهای موجود بک‌اند:
//   POST /api/v1/auth/register  (email, password, role)
//   POST /api/v1/auth/login     (email, password)
//   GET  /api/v1/auth/me        (Bearer)
// هیچ endpoint ساختگی ساخته نشده است.
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type { AuthUser, LoginInput, RegisterInput, UserRole } from '../types/auth'

/** پاسخ login/register بک‌اند: { id, email, role, token, ... } */
interface AuthResponse {
  id: string
  email: string
  role: UserRole
  token: string
}

/** GET /auth/me آبجکت کامل کاربر را برمی‌گرداند؛ فقط فیلدهای مجاز را نگه می‌داریم */
interface MeResponse {
  id: string
  email: string
  role: UserRole
}

export const authService = {
  async login(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    })
    return { user: { id: data.id, email: data.email, role: data.role }, token: data.token }
  },

  async register(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    const data = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    })
    return { user: { id: data.id, email: data.email, role: data.role }, token: data.token }
  },

  async getMe(): Promise<AuthUser> {
    const data = await apiRequest<MeResponse>('/auth/me')
    return { id: data.id, email: data.email, role: data.role }
  },
}
