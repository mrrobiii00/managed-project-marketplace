// ─────────────────────────────────────────────────────────────
// /client/projects — لیست پروژه‌های کارفرما (GET /projects/me)
// Stateها: Loading / Empty(+ایجاد) / Error(+Retry) — بدون داده‌ی جعلی
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { projectService } from '../../services/project.service'
import type { ProjectSummaryDto } from '../../types/project'
import { statusLabel, statusVariant, formatFaDate, formatFaBudget } from '../../utils/status'
import { ApiError } from '../../types/api'

const PAGE_SIZE = 20

export default function ClientProjectsPage() {
  const [items, setItems] = useState<ProjectSummaryDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(
    async (targetPage: number) => {
      setItems(null)
      setError(null)
      try {
        const res = await projectService.getMyProjects(targetPage, PAGE_SIZE)
        setItems(res.items)
        setPage(res.page)
        setTotalPages(res.totalPages)
        setTotal(res.total)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      }
    },
    [],
  )

  useEffect(() => {
    void load(1)
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">پروژه‌های من</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {items !== null && `مجموع: ${total.toLocaleString('fa-IR')} پروژه`}
          </p>
        </div>
        <Link to="/client/projects/new">
          <Button size="sm">+ ایجاد پروژه</Button>
        </Link>
      </div>

      {items === null && !error && <Card><Loading label="در حال دریافت پروژه‌ها…" /></Card>}
      {error && (
        <Card>
          <ErrorState message={error} onRetry={() => void load(page)} />
        </Card>
      )}

      {items !== null && items.length === 0 && (
        <Card>
          <EmptyState
            title="هنوز پروژه‌ای ثبت نکرده‌اید"
            description="اولین پروژه‌ی خود را بسازید تا وارد چرخه‌ی تطبیق و اجرا شود."
            action={
              <Link to="/client/projects/new">
                <Button size="sm">ایجاد پروژه</Button>
              </Link>
            }
          />
        </Card>
      )}

      {items !== null && items.length > 0 && (
        <>
          {/* موبایل: کارت‌های روی‌هم */}
          <div className="space-y-3 md:hidden">
            {items.map((p) => (
              <Card key={p.id} padded={false} className="overflow-hidden">
                <Link to={`/client/projects/${p.id}`} className="block px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate text-sm font-semibold text-slate-800">{p.title}</h3>
                    <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500">
                    <div>
                      <dt className="inline">بودجه: </dt>
                      <dd className="inline text-slate-700">
                        {p.minBudget === null && p.maxBudget === null
                          ? '—'
                          : `${formatFaBudget(p.minBudget)} تا ${formatFaBudget(p.maxBudget)}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">مهلت: </dt>
                      <dd className="inline text-slate-700">{p.deadline ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="inline">مهارت‌ها: </dt>
                      <dd className="inline text-slate-700">{p.skillsCount.toLocaleString('fa-IR')}</dd>
                    </div>
                    <div>
                      <dt className="inline">نقش‌ها: </dt>
                      <dd className="inline text-slate-700">{p.rolesCount.toLocaleString('fa-IR')}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-[11px] text-slate-400">ایجاد: {formatFaDate(p.createdAt)}</p>
                </Link>
              </Card>
            ))}
          </div>

          {/* تبلت/دسکتاپ: جدول */}
          <Card padded={false} className="hidden overflow-x-auto md:block">
            <table className="w-full text-right text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th scope="col" className="px-4 py-3 font-medium">عنوان</th>
                  <th scope="col" className="px-4 py-3 font-medium">وضعیت</th>
                  <th scope="col" className="px-4 py-3 font-medium">حداقل بودجه</th>
                  <th scope="col" className="px-4 py-3 font-medium">حداکثر بودجه</th>
                  <th scope="col" className="px-4 py-3 font-medium">مهلت</th>
                  <th scope="col" className="px-4 py-3 font-medium">تاریخ ایجاد</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/client/projects/${p.id}`}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(p.status)}>{statusLabel(p.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{formatFaBudget(p.minBudget)}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{formatFaBudget(p.maxBudget)}</td>
                    <td className="px-4 py-3 text-slate-600" dir="ltr">{p.deadline ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatFaDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="صفحه‌بندی پروژه‌ها">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void load(page - 1)}>
                صفحه‌ی قبل
              </Button>
              <span className="text-xs text-slate-500">
                صفحه‌ی {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void load(page + 1)}>
                صفحه‌ی بعد
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
