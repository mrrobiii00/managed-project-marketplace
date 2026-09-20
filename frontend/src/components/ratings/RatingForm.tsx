// ─────────────────────────────────────────────────────────────
// RatingForm — ثبت ارزیابی ۱ تا ۵ + دیدگاه (M15)
// قرارداد: POST /projects/:projectId/ratings با {toUserId, score,
// review?} — fromUserId از توکن بک‌اند است و هرگز ارسال نمی‌شود.
// دسترس‌پذیری: radio group بومی (فلش‌ها + Space)، aria-checked
// خودکار، متن عددی «امتیاز: ۴ از ۵» با aria-live، خطا با role=alert.
// ─────────────────────────────────────────────────────────────

import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { ratingService } from '../../services/rating.service'
import type { RatingDto } from '../../types/rating'
import { ApiError } from '../../types/api'
import { formatFaNumber } from '../../utils/status'

const REVIEW_MAX = 2000 // دقیقاً مطابق createRatingSchema بک‌اند

interface RatingFormProps {
  projectId: string
  toUserId: string
  toUserName: string
  /** پس از ثبت موفق با RatingDto جدید صدا زده می‌شود */
  onCreated: (rating: RatingDto) => void
}

export default function RatingForm({ projectId, toUserId, toUserName, onCreated }: RatingFormProps) {
  const [score, setScore] = useState<number | null>(null)
  const [review, setReview] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reviewError =
    review.length > REVIEW_MAX ? `دیدگاه حداکثر ${formatFaNumber(REVIEW_MAX)} کاراکتر است` : null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting || score === null || reviewError) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const rating = await ratingService.createProjectRating(projectId, {
        toUserId,
        score,
        // مطابق schema بک‌اند: اختیاری؛ رشته‌ی خالی بعد از trim پذیرفته نمی‌شود → نمی‌فرستیم
        review: review.trim() === '' ? undefined : review.trim(),
      })
      onCreated(rating)
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  const radioName = `rating-score-${toUserId}`

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4"
      aria-label={`فرم ارزیابی ${toUserName}`}
    >
      <p className="text-sm font-medium text-slate-700">
        ارزیابی <span className="font-bold">{toUserName}</span>
      </p>

      {/* انتخاب امتیاز — radio group بومی (کیبورد: فلش‌ها/Space) */}
      <fieldset className="mt-3" disabled={submitting}>
        <legend className="text-xs text-slate-500">امتیاز شما</legend>
        <div role="radiogroup" aria-label={`انتخاب امتیاز از ۱ تا ۵ برای ${toUserName}`} className="mt-1.5 flex items-center gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => {
            const id = `${radioName}-${n}`
            return (
              <div key={n} className="relative">
                <input
                  id={id}
                  type="radio"
                  name={radioName}
                  value={n}
                  checked={score === n}
                  onChange={() => setScore(n)}
                  className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <label
                  htmlFor={id}
                  className={`
                    flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors
                    peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500
                    ${score !== null && n <= score ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}
                  `}
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.5l2.95 5.98 6.6.96-4.78 4.66 1.13 6.58L12 17.57l-5.9 3.1 1.13-6.57L2.45 9.44l6.6-.96L12 2.5z" />
                  </svg>
                  <span className="sr-only">{formatFaNumber(n)}</span>
                </label>
              </div>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs font-medium text-slate-600" aria-live="polite">
          {score === null ? 'امتیاز انتخاب نشده است' : `امتیاز: ${formatFaNumber(score)} از ۵`}
        </p>
      </fieldset>

      {/* دیدگاه — اختیاری، مطابق validation بک‌اند */}
      <div className="mt-3">
        <label htmlFor={`${radioName}-review`} className="text-xs text-slate-500">
          دیدگاه (اختیاری)
        </label>
        <textarea
          id={`${radioName}-review`}
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={3}
          maxLength={REVIEW_MAX + 100}
          disabled={submitting}
          placeholder="تجربه‌ی همکاری خود را بنویسید…"
          aria-describedby={reviewError ? `${radioName}-review-error` : undefined}
          aria-invalid={reviewError ? true : undefined}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {reviewError && (
          <p id={`${radioName}-review-error`} className="mt-1 text-xs text-rose-600" role="alert">
            {reviewError}
          </p>
        )}
      </div>

      {submitError && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">
          {submitError}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-slate-400">امتیاز از ۱ تا ۵ — دیدگاه حداکثر {formatFaNumber(REVIEW_MAX)} کاراکتر</p>
        <Button type="submit" size="sm" loading={submitting} disabled={score === null || reviewError !== null}>
          ثبت ارزیابی
        </Button>
      </div>
    </form>
  )
}
