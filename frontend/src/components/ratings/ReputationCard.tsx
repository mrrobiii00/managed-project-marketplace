// ─────────────────────────────────────────────────────────────
// ReputationCard — اعتبار کاربر (M15)
// منبع: GET /users/:userId/reputation (M10) — همه‌ی مقادیر
// (میانگین، تعداد، پروژه‌های تکمیل‌شده، Trust) خام از بک‌اند
// هستند؛ فرانت هیچ بازمحاسبه‌ای انجام نمی‌دهد (§16).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { Loading } from '../ui/Loading'
import { ErrorState } from '../ui/ErrorState'
import StarRating from './StarRating'
import { ratingService } from '../../services/rating.service'
import type { ReputationDto } from '../../types/rating'
import { ApiError } from '../../types/api'
import { formatFaNumber } from '../../utils/status'

interface ReputationCardProps {
  userId: string
  /** عنوان بخش — پیش‌فرض «اعتبار» */
  title?: string
}

export default function ReputationCard({ userId, title = 'اعتبار' }: ReputationCardProps) {
  const [reputation, setReputation] = useState<ReputationDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setReputation(null)
    setError(null)
    try {
      setReputation(await ratingService.getUserReputation(userId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card
      title={title}
      description="داده‌ی واقعی از موتور اعتبار پلتفرم — بدون بازمحاسبه"
    >
      {reputation === null && !error && <Loading label="در حال دریافت اعتبار…" />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {reputation !== null && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <dt className="text-xs text-slate-500">میانگین امتیاز</dt>
            <dd className="mt-1.5">
              {reputation.averageRating === null ? (
                <span className="text-xs text-slate-400">هنوز امتیازی ثبت نشده است.</span>
              ) : (
                <StarRating score={reputation.averageRating} />
              )}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <dt className="text-xs text-slate-500">تعداد ارزیابی‌ها</dt>
            <dd className="mt-1 text-lg font-bold text-slate-800">
              {formatFaNumber(reputation.ratingCount)}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <dt className="text-xs text-slate-500">پروژه‌های تکمیل‌شده</dt>
            <dd className="mt-1 text-lg font-bold text-slate-800">
              {formatFaNumber(reputation.completedProjects)}
            </dd>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <dt className="text-xs text-slate-500">امتیاز اعتماد</dt>
            <dd className="mt-1 text-lg font-bold text-slate-800">
              {formatFaNumber(reputation.trustScore)}
              <span className="text-xs font-normal text-slate-400"> از ۱۰۰</span>
            </dd>
          </div>
        </dl>
      )}
    </Card>
  )
}
