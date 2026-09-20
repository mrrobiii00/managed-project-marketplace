/**
 * الحاق شرطی کلاس‌ها — جایگزین سبک و بدون وابستگی برای clsx
 * مثال: cn('btn', isActive && 'btn--active', `btn--${size}`)
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
