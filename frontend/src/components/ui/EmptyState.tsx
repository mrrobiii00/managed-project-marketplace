// ─────────────────────────────────────────────────────────────
// EmptyState — حالت «داده‌ای وجود ندارد» با اقدام اختیاری
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

export interface EmptyStateProps {
  title: string
  description?: string
  /** اقدام اختیاری (مثلاً دکمه‌ی «ایجاد») */
  action?: ReactNode
  /** آیکون اختیاری — پیش‌فرض: جعبه‌ی خالی */
  icon?: ReactNode
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="text-slate-300" aria-hidden="true">
        {icon ?? (
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-2-3H6L4 7v12h16V7z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 11h6" />
          </svg>
        )}
      </span>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="max-w-sm text-xs leading-6 text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
