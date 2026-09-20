// ─────────────────────────────────────────────────────────────
// /client/dashboard — داشبورد کارفرما (M14-G: داده‌ی واقعی)
// منبع: GET /projects/me (M06) — مرتب‌شده بر اساس createdAt (سرور).
// شمارش وضعیت‌ها صرفاً presentation از همان داده است؛
// هیچ محاسبه‌ی کسب‌وکاری یا ارسالی انجام نمی‌شود.
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
import { projectService } from '../../services/project.service'
import type { ProjectSummaryDto } from '../../types/project'
import { statusLabel, statusVariant, formatFaDate } from '../../utils/status'
import { ApiError } from '../../types/api'

/** سقف صفحه‌بندی بک‌اند = ۱۰۰؛ شمارش وضعیت‌ها از همین یک fetch */
const FETCH_PAGE_SIZE = 100
const RECENT_COUNT = 5

export default function ClientDashboardPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<ProjectSummaryDto[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setItems(null)
    setError(null)
    try {
      const res = await projectService.getMyProjects(1, FETCH_PAGE_SIZE)
      setItems(res.items)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // شمارش presentation-only از داده‌ی واقعی دریافتی
  const inProgressCount =
    items?.filter((p) => p.status === 'IN_PROGRESS').length ?? 0
  const activePipelineCount =
    items?.filter((p) =>
      ['SUBMITTED', 'MATCHING', 'REVIEW', 'TEAM_PROPOSED'].includes(p.status),
    ).length ?? 0
  const recent = items?.slice(0, RECENT_COUNT) ?? []

  return (
    <div className="space-y-6">
      <Card
        title={`سلام${user ? ' 👋' : ''}`}
        description="داشبورد کارفرما — مدیریت پروژه‌ها از اینجا شروع می‌شود."
        action={
          <Link to="/client/projects/new">
            <Button size="sm">+ ایجاد پروژه</Button>
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
              <Badge variant="primary">کارفرما</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {items === null && !error && (
        <Card>
          <Loading label="در حال دریافت پروژه‌های شما…" />
        </Card>
      )}
      {error && (
        <Card>
          <ErrorState message={error} onRetry={() => void load()} />
        </Card>
      )}

      {items !== null && (
        <>
          {/* آمار واقعی از GET /projects/me — شمارش presentation-only */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <h3 className="text-sm font-semibold text-slate-700">همه‌ی پروژه‌ها</h3>
              <p className="mt-3 text-3xl font-bold text-slate-800">
                {total.toLocaleString('fa-IR')}
              </p>
              <Link
                to="/client/projects"
                className="mt-2 inline-block text-xs text-indigo-600 hover:text-indigo-700"
              >
                مشاهده‌ی پروژه‌های من ←
              </Link>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-slate-700">در حال اجرا</h3>
              <p className="mt-3 text-3xl font-bold text-slate-800">
                {inProgressCount.toLocaleString('fa-IR')}
              </p>
              <p className="mt-2 text-xs text-slate-400">پروژه‌هایی که تیمشان فعال است</p>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-slate-700">در چرخه‌ی بررسی</h3>
              <p className="mt-3 text-3xl font-bold text-slate-800">
                {activePipelineCount.toLocaleString('fa-IR')}
              </p>
              <p className="mt-2 text-xs text-slate-400">ارسال‌شده تا پیشنهاد تیم</p>
            </Card>
          </div>

          {/* پروژه‌های اخیر — ترتیب سرور (createdAt نزولی) */}
          <Card
            title="پروژه‌های اخیر"
            description={
              total > items.length
                ? `نمایش ${items.length.toLocaleString('fa-IR')} پروژه‌ی اخیر از ${total.toLocaleString('fa-IR')}`
                : 'مرتب‌شده بر اساس تاریخ ایجاد'
            }
            action={
              <Link
                to="/client/projects"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                همه‌ی پروژه‌ها
              </Link>
            }
          >
            {recent.length === 0 ? (
              <EmptyState
                title="هنوز پروژه‌ای ثبت نکرده‌اید"
                description="اولین پروژه‌ی خود را بسازید تا وارد چرخه‌ی تطبیق و اجرا شود."
                action={
                  <Link to="/client/projects/new">
                    <Button size="sm">ایجاد پروژه</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-slate-50">
                {recent.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/client/projects/${p.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                        {p.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-[11px] text-slate-400">
                          {formatFaDate(p.createdAt)}
                        </span>
                        <Badge variant={statusVariant(p.status)}>
                          {statusLabel(p.status)}
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
