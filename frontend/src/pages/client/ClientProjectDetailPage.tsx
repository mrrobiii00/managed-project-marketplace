// ─────────────────────────────────────────────────────────────
// /client/projects/:projectId — Workspace کارفرما (M14-F)
// چیدمان: هدر → اقدامات → اطلاعات پروژه | تیم (فقط‌خواندنی) →
//         کارها + پیشرفت نمایشی → ارزیابی پروژه (M15؛ COMPLETED/RATED)
// همه‌ی مجوزها از بک‌اند (M06/M08/M09/M10)؛ UI فقط آینه می‌کند.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/ErrorState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import TeamSummaryCard from '../../components/teams/TeamSummaryCard'
import ClientTasksSection from '../../components/tasks/ClientTasksSection'
import ProjectRatingsSection from '../../components/ratings/ProjectRatingsSection'
import { projectService } from '../../services/project.service'
import { teamService } from '../../services/team.service'
import type { ProjectDto } from '../../types/project'
import type { TeamDto } from '../../types/team'
import { ApiError } from '../../types/api'
import {
  canDeleteProject,
  canEditProject,
  canSubmitProject,
  formatFaBudget,
  formatFaDate,
  statusLabel,
  statusVariant,
} from '../../utils/status'

export default function ClientProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [project, setProject] = useState<ProjectDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'submit' | 'delete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [team, setTeam] = useState<TeamDto | null>(null)
  const [teamMissing, setTeamMissing] = useState(false)

  const load = useCallback(async () => {
    if (!projectId) return
    setProject(null)
    setError(null)
    try {
      setProject(await projectService.getProject(projectId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [projectId])

  const loadTeam = useCallback(async () => {
    if (!projectId) return
    setTeam(null)
    setTeamMissing(false)
    try {
      setTeam(await teamService.getProjectTeam(projectId))
    } catch {
      // 404 = تیم هنوز تشکیل نشده (یا دسترسی نیست) — state خالی
      setTeamMissing(true)
    }
  }, [projectId])

  useEffect(() => {
    void load()
    void loadTeam()
  }, [load, loadTeam])

  const doSubmit = async () => {
    if (!projectId) return
    setActionLoading(true)
    setActionError(null)
    try {
      await projectService.submitProject(projectId)
      setConfirming(null)
      await load() // رفرش → وضعیت جدید و اقدامات DRAFT غیرفعال
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      setConfirming(null)
    } finally {
      setActionLoading(false)
    }
  }

  const doDelete = async () => {
    if (!projectId) return
    setActionLoading(true)
    setActionError(null)
    try {
      await projectService.deleteProject(projectId)
      navigate('/client/projects', { replace: true })
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      setConfirming(null)
    } finally {
      setActionLoading(false)
    }
  }

  if (project === null && !error) {
    return (
      <Card>
        <Loading label="در حال دریافت پروژه…" />
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <ErrorState
          title="دریافت پروژه ناموفق بود"
          message={error}
          onRetry={() => void load()}
          action={
            <Link to="/client/projects">
              <Button variant="ghost" size="sm">
                بازگشت به لیست پروژه‌ها
              </Button>
            </Link>
          }
        />
      </Card>
    )
  }
  if (!project) return null

  const inProgress = project.status === 'IN_PROGRESS'

  return (
    <div className="space-y-4">
      {/* ── هدر پروژه ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800">{project.title}</h2>
          <p className="mt-1 text-xs text-slate-400">
            ایجاد: {formatFaDate(project.createdAt)} · به‌روزرسانی: {formatFaDate(project.updatedAt)}
          </p>
          <Link
            to="/client/projects"
            className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-700"
          >
            → بازگشت به پروژه‌های من
          </Link>
        </div>
        <Badge variant={statusVariant(project.status)}>{statusLabel(project.status)}</Badge>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {/* ── اقدامات چرخه (طبق قواعد M06؛ بک‌اند مجوز نهایی است) ── */}
      <Card title="اقدامات">
        <div className="flex flex-wrap items-center gap-2">
          {canEditProject(project.status) && (
            <Link to={`/client/projects/${project.id}/edit`}>
              <Button variant="outline" size="sm">
                ویرایش
              </Button>
            </Link>
          )}
          {canSubmitProject(project.status) && (
            <Button size="sm" onClick={() => setConfirming('submit')}>
              ارسال برای بررسی و Matching
            </Button>
          )}
          {canDeleteProject(project.status) && (
            <Button variant="danger" size="sm" onClick={() => setConfirming('delete')}>
              حذف پروژه
            </Button>
          )}
          {!canEditProject(project.status) && (
            <p className="text-xs text-slate-400">
              پروژه در وضعیت «{statusLabel(project.status)}» فقط قابل مشاهده است — actions مربوط به این مرحله با کارفرما نیست.
            </p>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── اطلاعات پروژه ── */}
        <Card title="اطلاعات پروژه">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs text-slate-500">شرح پروژه</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {project.description}
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
            <div>
              <dt className="text-xs text-slate-500">
                مهارت‌های موردنیاز ({project.skills.length.toLocaleString('fa-IR')})
              </dt>
              <dd className="mt-1.5">
                <ul className="flex flex-wrap gap-1.5">
                  {project.skills.map((s) => (
                    <li key={s.skillId}>
                      <Badge variant={s.isRequired ? 'primary' : 'neutral'}>
                        {s.name}
                        {!s.isRequired && ' (اختیاری)'}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">
                نقش‌های تیم ({project.roles.length.toLocaleString('fa-IR')})
              </dt>
              <dd className="mt-1.5">
                <ul className="flex flex-wrap gap-1.5">
                  {project.roles.map((r) => (
                    <li key={r.id}>
                      <Badge variant="info">
                        {r.roleName} × {r.quantity.toLocaleString('fa-IR')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Card>

        {/* ── تیم (فقط‌خواندنی) ── */}
        {team !== null && <TeamSummaryCard team={team} />}
        {teamMissing && (
          <Card title="تیم پروژه">
            <EmptyTeam />
          </Card>
        )}
        {team === null && !teamMissing && (
          <Card title="تیم پروژه">
            <Loading label="در حال دریافت تیم…" />
          </Card>
        )}
      </div>

      {/* ── کارها + پیشرفت ── */}
      <ClientTasksSection projectId={project.id} projectInProgress={inProgress} team={team} />

      {/* ── ارزیابی پروژه — فقط پس از تکمیل (M15/M10) ── */}
      {(project.status === 'COMPLETED' || project.status === 'RATED') && user && (
        <ProjectRatingsSection
          project={project}
          team={team}
          currentUserId={user.id}
          currentRole={user.role}
        />
      )}

      <ConfirmDialog
        open={confirming === 'submit'}
        title="ارسال پروژه برای بررسی و Matching"
        message={`پروژه «${project.title}» پس از ارسال از وضعیت پیش‌نویس خارج می‌شود و وارد فرآیند بررسی و یافتن تیم می‌گردد. مطمئن هستید؟`}
        confirmLabel="بله، ارسال کن"
        loading={actionLoading}
        onConfirm={() => void doSubmit()}
        onCancel={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === 'delete'}
        title="حذف پروژه"
        message={`آیا از حذف پروژه «${project.title}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="بله، حذف کن"
        danger
        loading={actionLoading}
        onConfirm={() => void doDelete()}
        onCancel={() => setConfirming(null)}
      />
    </div>
  )
}

function EmptyTeam() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="text-slate-300" aria-hidden="true">
        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        </svg>
      </span>
      <p className="text-sm font-semibold text-slate-700">هنوز تیمی برای این پروژه تشکیل نشده است.</p>
      <p className="max-w-xs text-xs leading-6 text-slate-500">
        پس از ارسال پروژه و انجام فرآیند تطبیق و بازبینی، تیم پیشنهادی اینجا نمایش داده می‌شود.
      </p>
    </div>
  )
}
