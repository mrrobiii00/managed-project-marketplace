// ─────────────────────────────────────────────────────────────
// Input — فیلد متنی با label، پیام خطا و hint (دسترس‌پذیر)
// ─────────────────────────────────────────────────────────────

import { forwardRef, useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** متن کمکی اختیاری زیر فیلد */
  hint?: string
  /** پیام خطای فارسی — aria-invalid و aria-describedby خودکار تنظیم می‌شود */
  error?: string
  /** ورودی‌های لاتین (ایمیل/رمز) — direction:ltr */
  ltr?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, ltr = false, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={cn(
          'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400',
          'transition-colors focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50',
          error ? 'border-rose-400' : 'border-slate-300',
          ltr && 'ltr-input',
          className,
        )}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
})
