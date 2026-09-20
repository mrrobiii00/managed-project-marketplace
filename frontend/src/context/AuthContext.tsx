// ─────────────────────────────────────────────────────────────
// AuthContext — وضعیت احراز هویت کل برنامه (Context API، بدون کتابخانه)
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '../services/auth.service'
import { tokenStore, setUnauthorizedHandler } from '../services/api'
import type { AuthUser, LoginInput, RegisterInput } from '../types/auth'

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  /** true تا پایان بررسی اولیه‌ی توکن ذخیره‌شده */
  isLoading: boolean
}

export interface AuthContextValue extends AuthState {
  /** در صورت موفقیت، کاربر وارد‌شده را برمی‌گرداند (برای redirect نقش‌محور) */
  login: (input: LoginInput) => Promise<AuthUser>
  register: (input: RegisterInput) => Promise<AuthUser>
  logout: () => void
  /** بارگذاری مجدد وضعیت از توکن ذخیره‌شده */
  refresh: () => Promise<void>
}

const USER_STORAGE_KEY = 'mp.user'

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenStore.get())
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [isLoading, setIsLoading] = useState<boolean>(() => tokenStore.get() !== null)

  const applySession = useCallback((nextUser: AuthUser, nextToken: string) => {
    tokenStore.set(nextToken)
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const clearSession = useCallback(() => {
    tokenStore.clear()
    localStorage.removeItem(USER_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }, [])

  const login = useCallback(
    async (input: LoginInput): Promise<AuthUser> => {
      const { user: u, token: t } = await authService.login(input)
      applySession(u, t)
      return u
    },
    [applySession],
  )

  /** ثبت‌نام و سپس ورود خودکار با توکنی که بک‌اند برگردانده است */
  const register = useCallback(
    async (input: RegisterInput): Promise<AuthUser> => {
      const { user: u, token: t } = await authService.register(input)
      applySession(u, t)
      return u
    },
    [applySession],
  )

  const logout = useCallback(() => {
    clearSession()
  }, [clearSession])

  /** بررسی اولیه/بازخوانی: اگر توکن معتبر نیست، state پاک می‌شود */
  const refresh = useCallback(async () => {
    const stored = tokenStore.get()
    if (!stored) {
      clearSession()
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const me = await authService.getMe()
      applySession(me, stored)
    } catch {
      clearSession()
    } finally {
      setIsLoading(false)
    }
  }, [applySession, clearSession])

  // بارگذاری اولیه در mount — توکن ذخیره‌شده با GET /auth/me اعتبارسنجی می‌شود
  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // رویداد 401 از API client: باطل‌سازی نشست + هدایت یک‌باره به /login
  // (api.ts خودش از loop و مسیر /login محافظت می‌کند)
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: token !== null && user !== null,
      isLoading,
      login,
      register,
      logout,
      refresh,
    }),
    [user, token, isLoading, login, register, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود')
  return ctx
}
