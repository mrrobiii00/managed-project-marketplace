// ─────────────────────────────────────────────────────────────
// /specialist/projects/:projectId — Workspace متخصص (M14-E)
// ساختار: Project Header → Project Info | Team (read-only) →
//          Task Summary (فیلتر + ایجاد) → Task List
// همه‌ی مجوزها از بک‌اند؛ UI فقط آینه می‌کند.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import TaskCard from '../../components/tasks/TaskCard'
import ProjectRatingsSection from '../../components/ratings/ProjectRatingsSection'
import { projectService } from '../../services/project.service'
import { teamService } from '../../services/team.service'
import { taskService } from '../../services/task.service'
import { useAuth } from '../../context/AuthContext'
import type { ProjectDto } from '../../types/project'
import type { TeamDto } from '../../types/team'
import type { TaskDto, TaskPagination, TaskStatus } from '../../types/task'
import { ApiError } from '../../types/api'
import {
  formatFaBudget,
  formatFaDate,
  formatFaScore,
  statusLabel,
  statusVariant,
  taskStatusLabel,
  teamStatusLabel,
  teamStatusVariant,
} from '../../utils/status'

const PAGE_SIZE = 20

// label وضعیت‌ها از mapping مرکزی (utils/status.ts) — §8
const STATUS_FILTER_OPTIONS: { value: '' | TaskStatus; label: string }[] = [
  { value: '', label: 'همه‌ی وضعیت‌ها' },
  { value: 'TODO', label: taskStatusLabel('TODO') },
  { value: 'IN_PROGRESS', label: taskStatusLabel('IN_PROGRESS') },
  { value: 'DONE', label: taskStatusLabel('DONE') },
]

export default function SpecialistProjectWorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { user } = useAuth()

  const [project, setProject] = useState<ProjectDto | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)

  const [team, setTeam] = useState<TeamDto | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)

  const [tasks, setTasks] = useState<TaskPagination | null>(null)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('')
  const [transitionBusy, setTransitionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    setProject(null)
    setProjectError(null)
    try {
      setProject(await projectService.getProject(projectId))
    } catch (err) {
      setProjectError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [projectId])

  const loadTeam = useCallback(async () => {
    if (!projectId) return
    setTeam(null)
    setTeamError(null)
    try {
      setTeam(await teamService.getProjectTeam(projectId))
    } catch (err) {
      // 404 = تیمی نیست یا شما مرتبط نیستید — پیام عمومی بک‌اند
      setTeamError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [projectId])

  const loadTasks = useCallback(
    async (page = 1, status: '' | TaskStatus = '') => {
      if (!projectId) return
      setTasks(null)
      setTasksError(null)
      try {
        setTasks(
          await taskService.listProjectTasks(projectId, {
            page,
            pageSize: PAGE_SIZE,
            ...(status !== '' && { status }),
          }),
        )
      } catch (err) {
        setTasksError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      }
    },
    [projectId],
  )

  useEffect(() => {
    void loadProject()
    void loadTeam()
    void loadTasks(1, '')
  }, [loadProject, loadTeam, loadTasks])

  /** تغییر وضعیت — فقط { status } ارسال می‌شود (قرارداد SPECIALIST در M09) */
  const handleTransition = async (task: TaskDto, to: TaskStatus) => {
    if (!projectId) return
    setTransitionBusy(true)
    setActionError(null)
    try {
      await taskService.updateTask(projectId, task.id, { status: to })
      await loadTasks(tasks?.page ?? 1, statusFilter)
    } catch (err) {
      // 403/409/422 با پیام فارسی سرور
      setActionError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setTransitionBusy(false)
    }
  }

  const inProgress = project?.status === 'IN_PROGRESS'

  return (
    <div className="space-y-4">
      {/* ── Project Header ── */}
      {project === null && !projectError && (
        <Card>
          <Loading label="در حال دریافت پروژه…" />
        </Card>
      )}
      {projectError && (
        <Card>
          <ErrorState
            title="دسترسی به این پروژه ممکن نیست"
            message={projectError}
            onRetry={() => void loadProject()}
          />
        </Card>
      )}

      {project && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-800">{project.title}</h2>
              <p className="mt-1 text-xs text-slate-400">
                Workspace متخصص — شروع: {formatFaDate(project.createdAt)}
              </p>
              <Link
                to="/specialist/dashboard"
                className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-700"
              >
                → بازگشت به داشبورد
              </Link>
            </div>
            <Badge variant={statusVariant(project.status)}>{statusLabel(project.status)}</Badge>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* ── Project Info ── */}
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
                  <dt className="text-xs text-slate-500">مهارت‌های موردنیاز</dt>
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
                  <dt className="text-xs text-slate-500">نقش‌های تیم</dt>
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

            {/* ── Team Summary (read-only) ── */}
            <Card title="تیم پروژه (فقط مشاهده)" description="مدیریت تیم با کارفرما/مدیر سیستم است.">
              {team === null && !teamError && <Loading label="در حال دریافت تیم…" />}
              {teamError && (
                <ErrorState
                  title="تیم در دسترس نیست"
                  message={teamError}
                  onRetry={() => void loadTeam()}
                />
              )}
              {team && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-800">{team.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={teamStatusVariant(team.status)}>
                        {teamStatusLabel(team.status)}
                      </Badge>
                      <Badge variant="primary">امتیاز تیم: {formatFaScore(team.teamScore)}</Badge>
                    </div>
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {team.members.map((m) => (
                      <li
                        key={m.userId}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-slate-800">
                            {m.fullName ?? 'بدون نام'}
                            {m.userId === user?.id && (
                              <span className="mr-1 text-[11px] font-medium text-indigo-600">(شما)</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400">{m.role}</p>
                        </div>
                        <Badge variant="info">تطبیق: {formatFaScore(m.matchScore)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          {/* ── Task Summary + List ── */}
          <Card
            title={`کارهای پروژه${tasks ? ` (${tasks.total.toLocaleString('fa-IR')})` : ''}`}
            description={
              inProgress
                ? 'شما می‌توانید کار برای خودتان ثبت کنید و وضعیت کارهای خودتان را پیش ببرید.'
                : 'ثابت/تغییر کارها فقط در پروژه‌ی «در حال اجرا» فعال است — فعلاً فقط مشاهده.'
            }
          >
            {actionError && (
              <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div className="w-48">
                <Select
                  label="فیلتر وضعیت"
                  options={STATUS_FILTER_OPTIONS}
                  value={statusFilter}
                  onChange={(e) => {
                    const v = e.target.value as '' | TaskStatus
                    setStatusFilter(v)
                    void loadTasks(1, v)
                  }}
                />
              </div>
              {inProgress && <CreateTaskInline projectId={project.id} onCreated={() => void loadTasks(1, statusFilter)} />}
            </div>

            {tasks === null && !tasksError && <Loading label="در حال دریافت کارها…" />}
            {tasksError && <ErrorState message={tasksError} onRetry={() => void loadTasks(1, statusFilter)} />}

            {tasks !== null && tasks.items.length === 0 && (
              <EmptyState
                title="هنوز کاری برای این پروژه ثبت نشده است."
                description={
                  inProgress
                    ? 'اولین کار را برای خودتان ثبت کنید.'
                    : 'کارهای این پروژه پس از شروع اجرا تعریف می‌شوند.'
                }
              />
            )}

            {tasks !== null && tasks.items.length > 0 && (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  {tasks.items.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projectId={project.id}
                      projectInProgress={inProgress}
                      currentUserId={user?.id ?? ''}
                      onTransition={(task, to) => void handleTransition(task, to)}
                      busy={transitionBusy}
                    />
                  ))}
                </div>

                {tasks.totalPages > 1 && (
                  <nav className="mt-4 flex items-center justify-center gap-3" aria-label="صفحه‌بندی کارها">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={tasks.page <= 1}
                      onClick={() => void loadTasks(tasks.page - 1, statusFilter)}
                    >
                      صفحه‌ی قبل
                    </Button>
                    <span className="text-xs text-slate-500">
                      صفحه‌ی {tasks.page.toLocaleString('fa-IR')} از {tasks.totalPages.toLocaleString('fa-IR')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={tasks.page >= tasks.totalPages}
                      onClick={() => void loadTasks(tasks.page + 1, statusFilter)}
                    >
                      صفحه‌ی بعد
                    </Button>
                  </nav>
                )}
              </>
            )}
          </Card>

          {/* ── ارزیابی پروژه — فقط پس از تکمیل (M15/M10) ── */}
          {(project.status === 'COMPLETED' || project.status === 'RATED') && user && (
            <ProjectRatingsSection
              project={project}
              team={team}
              currentUserId={user.id}
              currentRole={user.role}
            />
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════ ایجاد کار (SPECIALIST: خودتخصیصی) ═══════════════

function CreateTaskInline({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (title.trim().length < 2 || title.trim().length > 150) {
      next.title = 'عنوان باید بین ۲ تا ۱۵۰ کاراکتر باشد'
    }
    if (dueDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      next.dueDate = 'فرمت مهلت انجام باید YYYY-MM-DD باشد'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    setServerError(null)
    try {
      // assignedTo ارسال نمی‌شود — بک‌اند تسک را به خودِ متخصص تخصیص می‌دهد (M09)
      await taskService.createTask(projectId, {
        title: title.trim(),
        description: description.trim() === '' ? undefined : description.trim(),
        priority,
        dueDate: dueDate === '' ? undefined : dueDate,
      })
      setOpen(false)
      setTitle('')
      setDescription('')
      setPriority('MEDIUM')
      setDueDate('')
      onCreated()
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + ثبت کار برای خودم
      </Button>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">کار جدید (برای خودتان)</h4>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
          بستن
        </Button>
      </div>

      {serverError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {serverError}
        </div>
      )}

      <Input
        label="عنوان کار"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        placeholder="مثلاً: پیاده‌سازی صفحه‌ی پرداخت"
      />

      <div>
        <label htmlFor="new-task-desc" className="mb-1.5 block text-sm font-medium text-slate-700">
          شرح (اختیاری)
        </label>
        <textarea
          id="new-task-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-800 focus:border-indigo-500"
          placeholder="توضیح کوتاه درباره‌ی محدوده‌ی کار (حداکثر ۳۰۰۰ کاراکتر)"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="اولویت"
          options={[
            { value: 'LOW', label: 'کم' },
            { value: 'MEDIUM', label: 'متوسط' },
            { value: 'HIGH', label: 'زیاد' },
          ]}
          value={priority}
          onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
        />
        <Input
          label="مهلت انجام (اختیاری)"
          type="date"
          ltr
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={errors.dueDate}
          hint="نمی‌تواند در گذشته باشد"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>
          ثبت کار
        </Button>
      </div>
    </form>
  )
}
