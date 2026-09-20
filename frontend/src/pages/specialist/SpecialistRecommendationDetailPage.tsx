// ─────────────────────────────────────────────────────────────
// /specialist/recommended-projects/:projectId — جزئیات پیشنهاد
// منبع اصلی: GET M11 (توضیح‌پذیری). skills/roles از endpoint موجود
// M06 (GET /projects/:id — مجاز برای کاربران احراز‌شده) به‌صورت
// ثانویه و با degrade آرام خوانده می‌شود؛ شکست آن صفحه را نمی‌شکند.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/ErrorState'
import MatchBreakdown from '../../components/recommendations/MatchBreakdown'
import { recommendationService } from '../../services/recommendation.service'
import { projectService } from '../../services/project.service'
import type { RecommendationDetail } from '../../types/recommendation'
import type { ProjectDto } from '../../types/project'
import { ApiError } from '../../types/api'
import {
  formatFaBudget,
  recoStatusLabel,
  recoStatusVariant,
  statusLabel,
  statusVariant,
} from '../../utils/status'

export default function SpecialistRecommendationDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()

  const [reco, setReco] = useState<RecommendationDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // اطلاعات تکمیلی skills/roles از M06 — اختیاری
  const [projectExtra, setProjectExtra] = useState<Pick<ProjectDto, 'skills' | 'roles'> | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setReco(null)
    setNotFound(false)
    setError(null)
    setProjectExtra(null)
    try {
      const detail = await recommendationService.getRecommendedProject(projectId)
      setReco(detail)
      // تکمیل skills/roles از endpoint موجود M06 (بدون شکست‌پذیری)
      try {
        const full = await projectService.getProject(projectId)
        setProjectExtra({ skills: full.skills, roles: full.roles })
      } catch {
        setProjectExtra(null) // مثلاً پروژه‌ی DRAFT برای غیرمالک — بخش نمایش داده نمی‌شود
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // بدون افشای دلیل (وجود/REJECTED/غیرفعال/مالکیت) — پیام واحد
        setNotFound(true)
      } else {
        setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      }
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  if (reco === null && !notFound && !error) {
    return (
      <Card>
        <Loading label="در حال دریافت جزئیات پیشنهاد…" />
      </Card>
    )
  }

  if (notFound) {
    return (
      <Card>
        <ErrorState
          title="پیشنهادی یافت نشد"
          message="این پیشنهاد وجود ندارد، در دسترس شما نیست یا دیگر فعال نیست."
          action={
            <Link to="/specialist/recommended-projects">
              <Button variant="outline" size="sm">
                بازگشت به پیشنهادها
              </Button>
            </Link>
          }
        />
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={() => void load()} />
      </Card>
    )
  }

  if (!reco) return null
  const { project, match } = reco

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800">{project.title}</h2>
          <Link
            to="/specialist/recommended-projects"
            className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-700"
          >
            → بازگشت به پیشنهادها
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusVariant(project.status)}>{statusLabel(project.status)}</Badge>
          <Badge variant={recoStatusVariant(match.status)}>{recoStatusLabel(match.status)}</Badge>
          {/* ورود به Workspace — دسترسی واقعی از بک‌اند (تیم/وظایف در صورت عضویت) */}
          <Link to={`/specialist/projects/${project.id}`}>
            <Button variant="outline" size="sm">
              ورود به Workspace پروژه
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* اطلاعات پروژه */}
        <Card title="اطلاعات پروژه">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-slate-500">شرح پروژه</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {project.description ?? '—'}
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs text-slate-500">بودجه (تومان)</dt>
                <dd className="mt-1 text-sm text-slate-700" dir="ltr">
                  {project.minBudget === null && project.maxBudget === null
                    ? '—'
                    : `${formatFaBudget(project.minBudget)} تا ${formatFaBudget(project.maxBudget)}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">مهلت انجام</dt>
                <dd className="mt-1 text-sm text-slate-700" dir="ltr">
                  {project.deadline ?? '—'}
                </dd>
              </div>
            </div>

            {/* skills/roles از endpoint موجود M06 */}
            {projectExtra && (
              <>
                <div>
                  <dt className="text-xs text-slate-500">
                    مهارت‌های موردنیاز ({projectExtra.skills.length.toLocaleString('fa-IR')})
                  </dt>
                  <dd className="mt-1.5">
                    {projectExtra.skills.length === 0 ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1.5">
                        {projectExtra.skills.map((s) => (
                          <li key={s.skillId}>
                            <Badge variant={s.isRequired ? 'primary' : 'neutral'}>
                              {s.name}
                              {!s.isRequired && ' (اختیاری)'}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    نقش‌های تیم ({projectExtra.roles.length.toLocaleString('fa-IR')})
                  </dt>
                  <dd className="mt-1.5">
                    {projectExtra.roles.length === 0 ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <ul className="flex flex-wrap gap-1.5">
                        {projectExtra.roles.map((r) => (
                          <li key={r.id}>
                            <Badge variant="info">
                              {r.roleName} × {r.quantity.toLocaleString('fa-IR')}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </Card>

        {/* توضیح‌پذیری تطبیق — قلب صفحه */}
        <Card
          title="چرا این پروژه به شما پیشنهاد شد؟"
          description="مؤلفه‌های واقعی موتور تطبیق — بدون هیچ بازمحاسبه‌ای"
        >
          <MatchBreakdown match={match} />
        </Card>
      </div>
    </div>
  )
}
