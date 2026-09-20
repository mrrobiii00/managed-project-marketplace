// ─────────────────────────────────────────────────────────────
// ConfirmDialog — دیالوگ تأیید برای اقدامات مخرب/مهم (Submit/Delete)
// دسترس‌پذیر: role=alertdialog، بستن با Escape، فوکوس روی لغو
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import { Button } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  /** متن دکمه‌ی تأیید (مثلاً «حذف پروژه») */
  confirmLabel?: string
  cancelLabel?: string
  /** حالت تخریبی → دکمه‌ی قرمز */
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  cancelLabel = 'لغو',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="بستن پنجره"
        className="absolute inset-0 h-full w-full bg-slate-900/40"
        onClick={() => !loading && onCancel()}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 id="confirm-title" className="text-sm font-bold text-slate-800">
          {title}
        </h2>
        <p id="confirm-message" className="mt-2 text-xs leading-6 text-slate-600">
          {message}
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <Button ref={cancelRef} variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
