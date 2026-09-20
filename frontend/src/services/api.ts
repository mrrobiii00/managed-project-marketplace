// ─────────────────────────────────────────────────────────────
// API client ساده مبتنی بر fetch — بدون کتابخانه‌ی اضافه
//
// قرارداد بک‌اند: پاکت { success, message, data } و خطاهای
// 401/403/404/422/429/5xx با پیام فارسی.
// ─────────────────────────────────────────────────────────────

import { ApiError, type ApiEnvelope, type ApiErrorBody } from '../types/api'

/** آدرس پایه از environment — بدون hard-code؛ پیشوند /api/v1 داخل مقدار env لحاظ می‌شود */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

const TOKEN_STORAGE_KEY = 'mp.token'

// ── رویداد 401 غیرمجاز (باطل‌سازی نشست) ─────────────────────
// AuthContext یک handler ثبت می‌کند؛ requestهای 401 (با توکن)
// نشست را باطل و به /login هدایت می‌کنند. پرچم redirecting و
// بررسی مسیر جاری از loop جلوگیری می‌کنند.

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null
let handlingUnauthorized = false

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

function fireUnauthorized(): void {
  if (handlingUnauthorized) return // جلوگیری از هم‌زمانی/loop
  if (!tokenStore.get()) return // نشستی برای باطل‌کردن نیست
  if (typeof window !== 'undefined' && window.location.pathname === '/login') return
  handlingUnauthorized = true
  try {
    unauthorizedHandler?.()
  } finally {
    window.setTimeout(() => {
      handlingUnauthorized = false
    }, 500)
  }
}

export const tokenStore = {
  get(): string | null {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  },
  clear(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  },
}

/** پیام فارسی پیش‌فرض بر اساس وضعیت HTTP (وقتی سرور پیام نداده) */
function statusMessage(status: number): string {
  switch (status) {
    case 400:
      return 'درخواست نامعتبر است'
    case 401:
      return 'نشست شما منقضی شده یا وارد نشده‌اید؛ لطفاً وارد شوید'
    case 403:
      return 'شما اجازه‌ی انجام این عمل را ندارید'
    case 404:
      return 'موردی که به دنبال آن هستید یافت نشد'
    case 422:
      return 'اطلاعات ورودی معتبر نیست؛ لطفاً مقادیر را بررسی کنید'
    case 429:
      return 'تعداد درخواست‌ها بیش از حد مجاز است؛ لطفاً چند دقیقه بعد دوباره تلاش کنید'
    default:
      if (status >= 500) return 'خطایی در سرور رخ داده است؛ لطفاً بعداً تلاش کنید'
      return 'خطای غیرمنتظره‌ای رخ داد'
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** افزودن هدر Authorization به‌صورت خودکار (پیش‌فرض true) */
  auth?: boolean
  signal?: AbortSignal
}

/**
 * درخواست JSON به بک‌اند؛ در موفقیت `data` پاکت را برمی‌گرداند و
 * در خطا ApiError با پیام فارسی پرتاب می‌کند.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = tokenStore.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch {
    // خطای شبکه/قطع اتصال — بدون افشای جزئیات فنی
    throw new ApiError(0, 'ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید')
  }

  let payload: ApiEnvelope<T> | ApiErrorBody | null = null
  try {
    payload = (await response.json()) as ApiEnvelope<T> | ApiErrorBody
  } catch {
    payload = null
  }

  if (!response.ok || (payload && payload.success === false)) {
    const err = payload as ApiErrorBody | null
    // 401 روی درخواست‌های احراز‌شده → باطل‌سازی نشست (بدون loop)
    if (response.status === 401 && options.auth !== false) fireUnauthorized()
    throw new ApiError(
      response.status,
      // پیام فارسی سرور مقدم است؛ وگرنه نگاشت وضعیتی
      err?.message?.trim() || statusMessage(response.status),
      err?.code,
      err?.errors,
    )
  }

  return (payload as ApiEnvelope<T>).data
}
