// ─────────────────────────────────────────────────────────────
// StarRating — نمایش فقط‌خواندنی امتیاز (۱ تا ۵)
// دسترس‌پذیری: ستاره‌ها aria-hidden (تزئینی)؛ مقدار همیشه به‌صورت
// متن عددی فارسی ارائه می‌شود — رنگ تنها وسیله‌ی تشخیص نیست.
// ─────────────────────────────────────────────────────────────

import { formatFaNumber } from '../../utils/status'

export default function StarRating({ score, label }: { score: number; label?: string }) {
  const rounded = Math.round(score)
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex gap-0.5" dir="ltr" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <svg
            key={n}
            className={n <= rounded ? 'h-4 w-4 text-amber-400' : 'h-4 w-4 text-slate-200'}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />
          </svg>
        ))}
      </span>
      <span className="text-xs font-medium text-slate-700">
        {label ?? `${formatFaNumber(score)} از ۵`}
      </span>
    </span>
  )
}
