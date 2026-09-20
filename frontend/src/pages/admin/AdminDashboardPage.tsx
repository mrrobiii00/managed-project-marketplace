// ─────────────────────────────────────────────────────────────
// /admin/dashboard — داشبورد مدیر (M14-G: ادغام کامل M12)
// چهار endpoint واقعی: summary / recent-projects / attention /
// match-summary — هر بخش load/error/retry مستقل دارد.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Loading } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/ErrorState'
import { EmptyState } from '../../components/ui/EmptyState'
import {
  adminService,
  type AdminSummaryDto,
  type AdminProjectItemDto,
  type AdminMatchSummaryDto,
} from '../../services/admin.service'
import { statusLabel, statusVariant, formatFaBudget, formatFaDate } from '../../utils/status'
import type { ProjectStatus } from '../../types/project'
import { ApiError } from '../../types/api'

const LIST_PAGE_SIZE = 5

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-800">{value.toLocaleString('fa-IR')}</p>
    </div>
  )
}

/** ردیف پروژه در فهرست‌های اخیر/نیازمند بررسی */
function ProjectRow({ p }: { p: AdminProjectItemDto }) {
  return (
    <li className="px-2 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{p.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            کارفرما: {p.client.fullName ?? '—'} · {formatFaDate(p.createdAt)}
          </p>
        </div>
        <Badge variant={statusVariant(p.status as ProjectStatus)}>
          {statusLabel(p.status as ProjectStatus)}
        </Badge>
      </div>
      {(p.minBudget !== null || p.maxBudget !== null) && (
        <p className="mt-1 text-[11px] text-slate-500" dir="ltr">
          {formatFaBudget(p.minBudget)} — {formatFaBudget(p.maxBudget)}
        </p>
      )}
    </li>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<AdminSummaryDto | null>(null)
  const [recent, setRecent] = useState<AdminProjectItemDto[] | null>(null)
  const [attention, setAttention] = useState<AdminProjectItemDto[] | null>(null)
  const [matchSummary, setMatchSummary] = useState<AdminMatchSummaryDto | null>(null)
  /** خطای هر بخش با کلید خودش — retry مستقل */
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const errMsg = (e: unknown) =>
    e instanceof ApiError ? e.message : 'خطای غیرمنتظره‌ای رخ داد'

  const loadSection = useCallback(async (key: 'summary' | 'recent' | 'attention' | 'match') => {
    setSectionErrors((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    try {
      if (key === 'summary') setSummary(await adminService.getSummary())
      if (key === 'recent') {
        const res = await adminService.getRecentProjects(1, LIST_PAGE_SIZE)
        setRecent(res.items)
      }
      if (key === 'attention') {
        const res = await adminService.getAttentionProjects(1, LIST_PAGE_SIZE)
        setAttention(res.items)
      }
      if (key === 'match') setMatchSummary(await adminService.getMatchSummary())
    } catch (err) {
      setSectionErrors((prev) => ({ ...prev, [key]: errMsg(err) }))
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      await Promise.allSettled([
        loadSection('summary'),
        loadSection('recent'),
        loadSection('attention'),
        loadSection('match'),
      ])
      setLoading(false)
    }
    void run()
  }, [loadSection])

  const sectionBody = (
    key: 'summary' | 'recent' | 'attention' | 'match',
    content: React.ReactNode,
  ) => {
    if (sectionErrors[key]) {
      return <ErrorState message={sectionErrors[key]} onRetry={() => void loadSection(key)} />
    }
    return content
  }

  return (
    <div className="space-y-6">
      <Card
        title={`سلام${user ? ' 👋' : ''}`}
        description="داشبورد مدیریت — نمای عملیاتی کل سیستم."
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">کاربر</dt>
            <dd className="mt-1 truncate text-sm font-medium text-slate-800" title={user?.email ?? undefined}>
              {user?.email ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">نقش</dt>
            <dd className="mt-1">
              <Badge variant="danger">مدیر سیستم</Badge>
            </dd>
          </div>
        </dl>
      </Card>

      {loading && (
        <Card>
          <Loading label="در حال دریافت داده‌های داشبورد…" />
        </Card>
      )}

      {!loading && (
        <>
          {/* ── خلاصه‌ی سیستم (M12 summary) ── */}
          <Card
            title="خلاصه‌ی سیستم"
            description="داده‌ی واقعی از GET /admin/dashboard/summary (M12)"
            action={
              <button
                type="button"
                onClick={() => void loadSection('summary')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                بازخوانی
              </button>
            }
          >
            {sectionBody(
              'summary',
              summary && (
                <div className="space-y-5">
                  <section aria-label="کاربران">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">کاربران</h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                      <CountTile label="کل" value={summary.users.total} />
                      <CountTile label="کارفرما" value={summary.users.clients} />
                      <CountTile label="متخصص" value={summary.users.specialists} />
                      <CountTile label="مدیر" value={summary.users.admins} />
                      <CountTile label="فعال" value={summary.users.active} />
                      <CountTile label="غیرفعال" value={summary.users.inactive} />
                    </div>
                  </section>

                  <section aria-label="پروژه‌ها">
                    <h4 className="mb-2 text-xs font-semibold text-slate-500">پروژه‌ها (بر اساس وضعیت)</h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      <CountTile label="کل" value={summary.projects.total} />
                      <CountTile label="ثبت‌شده" value={summary.projects.submitted} />
                      <CountTile label="در بازبینی" value={summary.projects.review} />
                      <CountTile label="تیم پیشنهادی" value={summary.projects.teamProposed} />
                      <CountTile label="در اجرا" value={summary.projects.inProgress} />
                      <CountTile label="تکمیل‌شده" value={summary.projects.completed} />
                      <CountTile label="امتیاز داده‌شده" value={summary.projects.rated} />
                      <CountTile label="لغوشده" value={summary.projects.cancelled} />
                      <CountTile label="پیش‌نویس" value={summary.projects.draft} />
                      <CountTile label="در تطبیق" value={summary.projects.matching} />
                    </div>
                  </section>

                  <div className="grid gap-4 md:grid-cols-3">
                    <section aria-label="تطبیق‌ها">
                      <h4 className="mb-2 text-xs font-semibold text-slate-500">تطبیق‌ها</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <CountTile label="توصیه‌شده" value={summary.matches.recommended} />
                        <CountTile label="نیازمند بازبینی" value={summary.matches.needsReview} />
                        <CountTile label="رد‌شده" value={summary.matches.rejected} />
                      </div>
                    </section>
                    <section aria-label="تیم‌ها">
                      <h4 className="mb-2 text-xs font-semibold text-slate-500">تیم‌ها</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <CountTile label="پیشنهادی" value={summary.teams.proposed} />
                        <CountTile label="فعال" value={summary.teams.active} />
                        <CountTile label="تکمیل‌شده" value={summary.teams.completed} />
                      </div>
                    </section>
                    <section aria-label="وظایف">
                      <h4 className="mb-2 text-xs font-semibold text-slate-500">وظایف</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <CountTile label="در انتظار" value={summary.tasks.todo} />
                        <CountTile label="در انجام" value={summary.tasks.inProgress} />
                        <CountTile label="انجام‌شده" value={summary.tasks.done} />
                      </div>
                    </section>
                  </div>
                </div>
              ),
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── پروژه‌های اخیر (M12) ── */}
            <Card
              title="پروژه‌های اخیر"
              description="آخرین پروژه‌های ثبت‌شده در سیستم"
              action={
                <button
                  type="button"
                  onClick={() => void loadSection('recent')}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  بازخوانی
                </button>
              }
            >
              {sectionBody(
                'recent',
                recent && recent.length === 0 ? (
                  <EmptyState
                    title="پروژه‌ای ثبت نشده است"
                    description="هنوز کارفرمایی پروژه‌ای نساخته است."
                  />
                ) : (
                  recent && (
                    <ul className="divide-y divide-slate-50">
                      {recent.map((p) => (
                        <ProjectRow key={p.id} p={p} />
                      ))}
                    </ul>
                  )
                ),
              )}
            </Card>

            {/* ── نیازمند بررسی (M12) ── */}
            <Card
              title="نیازمند بررسی مدیریت"
              description="پروژه‌های در انتظار تصمیم مدیر (ثبت‌شده / در بازبینی)"
              action={
                <button
                  type="button"
                  onClick={() => void loadSection('attention')}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  بازخوانی
                </button>
              }
            >
              {sectionBody(
                'attention',
                attention && attention.length === 0 ? (
                  <EmptyState
                    title="موردی نیازمند بررسی نیست"
                    description="همه‌ی پروژه‌ها پردازش شده‌اند."
                  />
                ) : (
                  attention && (
                    <ul className="divide-y divide-slate-50">
                      {attention.map((p) => (
                        <ProjectRow key={p.id} p={p} />
                      ))}
                    </ul>
                  )
                ),
              )}
            </Card>
          </div>

          {/* ── خلاصه‌ی تطبیق‌ها (M12) ── */}
          <Card
            title="خلاصه‌ی وضعیت تطبیق‌ها"
            description="داده‌ی واقعی از GET /admin/dashboard/match-summary"
            action={
              <button
                type="button"
                onClick={() => void loadSection('match')}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                بازخوانی
              </button>
            }
          >
            {sectionBody(
              'match',
              matchSummary && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <CountTile label="کل تطبیق‌ها" value={matchSummary.total} />
                  <CountTile label="توصیه‌شده" value={matchSummary.recommended} />
                  <CountTile label="نیازمند بازبینی" value={matchSummary.needsReview} />
                  <CountTile label="ردشده" value={matchSummary.rejected} />
                </div>
              ),
            )}
          </Card>
        </>
      )}
    </div>
  )
}
