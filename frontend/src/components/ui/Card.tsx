// ─────────────────────────────────────────────────────────────
// Card — کارت پایه با عنوان/توضیح اختیاری و بدنه‌ی استاندارد
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface CardProps {
  title?: ReactNode
  description?: ReactNode
  /** اقدام هدر (مثلاً دکمه) */
  action?: ReactNode
  /** حذف padding بدنه برای محتوای تمام‌عرض */
  padded?: boolean
  className?: string
  children?: ReactNode
}

export function Card({
  title,
  description,
  action,
  padded = true,
  className,
  children,
}: CardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-card',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn(padded && 'px-5 py-4')}>{children}</div>
    </section>
  )
}
