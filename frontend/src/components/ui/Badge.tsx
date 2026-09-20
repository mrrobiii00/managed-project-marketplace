// ─────────────────────────────────────────────────────────────
// Badge — نشان وضعیت/برچسب با پالت معنایی
// ─────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type BadgeVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'primary'

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  primary: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
}

export interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** نقش کاربر → برچسب/رنگ فارسی */
export const roleBadge = (role: string): { label: string; variant: BadgeVariant } => {
  switch (role) {
    case 'ADMIN':
      return { label: 'مدیر سیستم', variant: 'danger' }
    case 'SPECIALIST':
      return { label: 'متخصص', variant: 'info' }
    case 'CLIENT':
      return { label: 'کارفرما', variant: 'primary' }
    default:
      return { label: role, variant: 'neutral' }
  }
}
