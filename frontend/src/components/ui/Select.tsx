// ─────────────────────────────────────────────────────────────
// Select — دراپ‌داون پایه با label و خطا (دسترس‌پذیر)
// ─────────────────────────────────────────────────────────────

import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string
  label: string
  /** گزینه‌ی غیرفعال (مثلاً placeholder) */
  disabled?: boolean
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  error?: string
  hint?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, hint, id, className, ...rest },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId
  const errorId = `${selectId}-error`

  return (
    <div className="w-full">
      <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'h-10 w-full appearance-none rounded-lg border bg-white px-3 text-sm text-slate-800',
          'transition-colors focus:border-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-50',
          error ? 'border-rose-400' : 'border-slate-300',
          className,
        )}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  )
})
