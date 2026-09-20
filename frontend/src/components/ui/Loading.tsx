// ─────────────────────────────────────────────────────────────
// Loading — اسپینر + پیام اختیاری (تمام‌صفحه یا درجا)
// ─────────────────────────────────────────────────────────────

import { cn } from '../../utils/cn'

export interface LoadingProps {
  label?: string
  /** حالت تمام‌صفحه برای قبل از آماده‌شدن layout */
  fullScreen?: boolean
  className?: string
}

export function Loading({ label = 'در حال بارگذاری…', fullScreen = false, className }: LoadingProps) {
  const spinner = (
    <svg className="h-8 w-8 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  )

  if (fullScreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn('flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-100', className)}
      >
        {spinner}
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className={cn('flex items-center justify-center gap-2 py-8', className)}>
      {spinner}
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  )
}
