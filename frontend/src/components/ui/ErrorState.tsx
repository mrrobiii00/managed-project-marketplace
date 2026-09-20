// ─────────────────────────────────────────────────────────────
// ErrorState — حالت خطا با پیام فارسی و دکمه‌ی تلاش مجدد
// (بدون نمایش stack trace یا جزئیات فنی)
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  /** پیام فارسی خطا — معمولاً ApiError.message */
  message?: string
  onRetry?: () => void
  action?: ReactNode
}

export function ErrorState({
  title = 'خطایی رخ داد',
  message,
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
    >
      <span className="text-rose-400" aria-hidden="true">
        <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </svg>
      </span>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {message && <p className="max-w-sm text-xs leading-6 text-slate-500">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          تلاش مجدد
        </Button>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
