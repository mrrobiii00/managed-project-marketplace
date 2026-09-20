// ─────────────────────────────────────────────────────────────
// RatingCard — نمایش یک ارزیابی ثبت‌شده (M15)
// فقط فیلدهای RatingDto واقعی بک‌اند: نام عمومی ارزیاب/هدف،
// امتیاز، دیدگاه، تاریخ — بدون هیچ داده‌ی حساس.
// ─────────────────────────────────────────────────────────────

import StarRating from './StarRating'
import type { RatingDto } from '../../types/rating'
import { formatFaDate } from '../../utils/status'

interface RatingCardProps {
  rating: RatingDto
  /** نمایش نام ارزیابی‌شونده (در بخش لیست عمومی) */
  showTarget?: boolean
  /** برچسبی مثل «ارزیابی شما» روی کارت */
  badgeLabel?: string
}

export default function RatingCard({ rating, showTarget = false, badgeLabel }: RatingCardProps) {
  return (
    <article className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {rating.fromUser.fullName ?? 'کاربر پلتفرم'}
          </span>
          {showTarget && (
            <>
              {' در نقش ارزیاب ← '}
              <span className="font-semibold text-slate-700">
                {rating.toUser.fullName ?? 'کاربر پلتفرم'}
              </span>
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {badgeLabel && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
              {badgeLabel}
            </span>
          )}
          <span className="text-[11px] text-slate-400">{formatFaDate(rating.createdAt)}</span>
        </div>
      </div>

      <div className="mt-2">
        <StarRating score={rating.score} />
      </div>

      {rating.review !== null && rating.review !== '' && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{rating.review}</p>
      )}
    </article>
  )
}
