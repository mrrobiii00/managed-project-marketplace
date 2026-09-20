// ─────────────────────────────────────────────────────────────
// /specialist/projects/:projectId/tasks/:taskId — جزئیات کار
// taskId فقط از route؛ مجوزها و گذارها از بک‌اند (M09).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/ErrorState'
import { taskService } from '../../services/task.service'
import { useAuth } from '../../context/AuthContext'
import type { TaskDto, TaskStatus } from '../../types/task'
import { ApiError } from '../../types/api'
import {
  formatFaDate,
  taskPriorityLabel,
  taskPriorityVariant,
  taskStatusLabel,
  taskStatusVariant,
} from '../../utils/status'

/** گذارهای مجاز — آینه‌ی task.rules.ts بک‌اند */
const NEXT_STATUSES: Record<TaskStatus, TaskStatus[]> = {
  TODO: ['IN_PROGRESS'],
  IN_PROGRESS: ['DONE', 'TODO'],
  DONE: [],
}

const TRANSITION_LABEL: Record<string, string> = {
  'TODO>IN_PROGRESS': 'شروع کار',
  'IN_PROGRESS>DONE': 'تکمیل کار',
  'IN_PROGRESS>TODO': 'بازگشت به انجام‌نشده',
}

export default function SpecialistTaskDetailPage() {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>()
  const { user } = useAuth()

  const [task, setTask] = useState<TaskDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!projectId || !taskId) return
    setTask(null)
    setError(null)
    try {
      setTask(await taskService.getTask(projectId, taskId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [projectId, taskId])

  useEffect(() => {
    void load()
  }, [load])

  const handleTransition = async (to: TaskStatus) => {
    if (!projectId || !task) return
    setBusy(true)
    setActionError(null)
    try {
      await taskService.updateTask(projectId, task.id, { status: to })
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setBusy(false)
    }
  }

  if (task === null && !error) {
    return (
      <Card>
        <Loading label="در حال دریافت کار…" />
      </Card>
    )
  }
  if (error) {
    return (
      <Card>
        <ErrorState
          title="کار موردنظر در دسترس نیست"
          message={error}
          onRetry={() => void load()}
          action={
            projectId && (
              <Link to={`/specialist/projects/${projectId}`}>
                <Button variant="outline" size="sm">
                  بازگشت به Workspace
                </Button>
              </Link>
            )
          }
        />
      </Card>
    )
  }
  if (!task) return null

  const isMine = task.assignedTo?.id === user?.id
  const nexts = NEXT_STATUSES[task.status] ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-800">{task.title}</h2>
          <Link
            to={`/specialist/projects/${projectId}`}
            className="mt-1 inline-block text-xs text-indigo-600 hover:text-indigo-700"
          >
            → بازگشت به Workspace
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={taskPriorityVariant(task.priority)}>
            اولویت: {taskPriorityLabel(task.priority)}
          </Badge>
          <Badge variant={taskStatusVariant(task.status)}>{taskStatusLabel(task.status)}</Badge>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      <Card title="جزئیات کار">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs text-slate-500">شرح</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {task.description ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">مسئول</dt>
            <dd className="mt-1 text-sm text-slate-700">
              {task.assignedTo?.fullName ?? 'تخصیص‌نیافته'}
              {isMine && <span className="mr-1 text-[11px] font-medium text-indigo-600">(شما)</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">مهلت انجام</dt>
            <dd className="mt-1 text-sm text-slate-700" dir="ltr">
              {task.dueDate ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">ایجاد</dt>
            <dd className="mt-1 text-sm text-slate-700">{formatFaDate(task.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">آخرین به‌روزرسانی</dt>
            <dd className="mt-1 text-sm text-slate-700">{formatFaDate(task.updatedAt)}</dd>
          </div>
        </dl>

        {/* گذار وضعیت — فقط کار خودِ متخصص (بک‌اند مجوز نهایی را می‌دهد) */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          {isMine ? (
            nexts.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">تغییر وضعیت:</span>
                {nexts.map((to) => (
                  <Button
                    key={to}
                    size="sm"
                    variant={to === 'DONE' ? 'primary' : to === 'TODO' ? 'ghost' : 'outline'}
                    disabled={busy}
                    onClick={() => void handleTransition(to)}
                  >
                    {TRANSITION_LABEL[`${task.status}>${to}`] ?? to}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">این کار تکمیل شده و وضعیت پایانی دارد.</p>
            )
          ) : (
            <p className="text-xs text-slate-400">
              فقط مسئول این کار می‌تواند وضعیت آن را تغییر دهد.
            </p>
          )}
        </div>
      </Card>
    </div>
  )
}
