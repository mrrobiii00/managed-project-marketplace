// ─────────────────────────────────────────────────────────────
// /specialist/dashboard — داشبورد متخصص (M14-G: داده‌ی واقعی)
// منبع: GET /specialists/me/recommended-projects[/count] (M11) —
// ترتیب سرور (totalScore DESC)؛ فرکت دوباره sort نمی‌کند.
// مسیرهای بعدی: جزئیات پیشنهاد → Workspace پروژه → وظایف.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { recommendationService } from '../../services/recommendation.service'
import type { RecommendationListItem } from '../../types/recommendation'
import { formatFaScore, statusLabel, statusVariant } from '../../utils/status'
import { ApiError } from '../../types/api'

const TOP_COUNT = 3

export default function SpecialistDashboardPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<RecommendationListItem[] | null>(null)
  const [count, setCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setItems(null)
    setCount(null)
    setError(null)
    try {
      // هر دو endpoint واقعی M11؛ شکست یکی کل صفحه را نمی‌شکند
      const [list, countResult] = await Promise.allSettled([
        recommendationService.getRecommendedProjects(1, TOP_COUNT),
        recommendationService.getRecommendationCount(),
      ])
      if (list.status === 'rejected') {
        throw list.reason
      }
      setItems(list.value.items)
      if (countResult.status === 'fulfilled') setCount(countResult.value)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const top = items ?? []

  return (
    <div className="space-y-6">
      <Card
        title={`سلام${user ? ' 👋' : ''}`}
        description="داشبورد متخصص — پیشنهادهای پروژه و وظایف شما از اینجا دنبال می‌شود."
        action={
          <Link to="/specialist/profile">
            <Button variant="outline" size="sm">
              پروفایل من
            </Button>
          </Link>
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">کاربر</dt>
            <dd
              className="mt-1 truncate text-sm font-medium text-slate-800"
              title={user?.email ?? undefined}
            >
              {user?.email ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">نقش</dt>
            <dd className="mt-1">
              <Badge variant="info">متخصص</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {items === null && !error && (
        <Card>
          <Loading label="در حال دریافت پیشنهادهای شما…" />
        </Card>
      )}
      {error && (
        <Card>
          <ErrorState message={error} onRetry={() => void load()} />
        </Card>
      )}

      {items !== null && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700">
                پروژه‌های پیشنهادی
              </h3>
              <p className="mt-3 text-3xl font-bold text-slate-800">
                {(count ?? top.length).toLocaleString('fa-IR')}
              </p>
              <Link
                to="/specialist/recommended-projects"
                className="mt-2 inline-block text-xs text-indigo-600 hover:text-indigo-700"
              >
                مشاهده‌ی همه‌ی پیشنهادها ←
              </Link>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-slate-700">بهترین تطبیق</h3>
              {top.length > 0 ? (
                <>
                  <p className="mt-3 truncate text-lg font-bold text-slate-800">
                    {top[0].project.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    امتیاز تطبیق:{' '}
                    <span dir="ltr" className="font-medium text-slate-700">
                      {formatFaScore(top[0].match.totalScore)}
                    </span>{' '}
                    از ۱۰۰
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-400">—</p>
              )}
            </Card>
          </div>

          <Card
            title="برترین پیشنهادها"
            description="مرتب‌شده بر اساس بهترین تطبیق (M11)"
            action={
              <Link
                to="/specialist/recommended-projects"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                همه‌ی پیشنهادها
              </Link>
            }
          >
            {top.length === 0 ? (
              <EmptyState
                title="در حال حاضر پروژه پیشنهادی برای شما وجود ندارد."
                description="وقتی پروژه‌ای با مهارت‌ها و تجربه‌ی شما تطبیق داشته باشد، اینجا نمایش داده می‌شود. پروفایل و مهارت‌های خود را کامل نگه دارید."
                action={
                  <Link to="/specialist/profile">
                    <Button variant="outline" size="sm">
                      تکمیل پروفایل و مهارت‌ها
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-50">
                {top.map((item) => (
                  <li key={item.project.id}>
                    <Link
                      to={`/specialist/recommended-projects/${item.project.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {item.project.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-slate-500" dir="ltr">
                          {formatFaScore(item.match.totalScore)}
                        </span>
                        <Badge variant={statusVariant(item.project.status)}>
                          {statusLabel(item.project.status)}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
