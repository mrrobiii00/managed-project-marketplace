// ─────────────────────────────────────────────────────────────
// ClientTasksSection — مدیریت کارها در Workspace کارفرما (M14-F)
//
// مجوزهای واقعی بک‌اند (task.rules.ts M09) برای CLIENT مالک:
//   view ✓ · create ✓ · edit: title/description/priority/dueDate/assignedTo
//   (بدون status — سرور فیلد status را برای CLIENT دور می‌ریزد)
//   delete ✓ فقط TODO · همه‌ی تغییرات فقط در پروژه‌ی IN_PROGRESS
// پیشرفت = صرفاً نمایش UI از داده‌ی واقعی (هیچ تصمیمی بر پایه‌ی آن نیست).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Loading } from '../ui/Loading'
import { EmptyState } from '../ui/EmptyState'
import { ErrorState } from '../ui/ErrorState'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { taskService } from '../../services/task.service'
import type {
  TaskDto,
  TaskPagination,
  TaskPriority,
  TaskStatus,
} from '../../types/task'
import type { TeamDto } from '../../types/team'
import { ApiError } from '../../types/api'
import {
  formatFaDate,
  taskPriorityLabel,
  taskPriorityVariant,
  taskStatusLabel,
  taskStatusVariant,
} from '../../utils/status'

const PAGE_SIZE = 10

// label وضعیت/اولویت از mapping مرکزی (utils/status.ts) — §8
const STATUS_FILTER_OPTIONS: { value: '' | TaskStatus; label: string }[] = [
  { value: '', label: 'همه‌ی وضعیت‌ها' },
  { value: 'TODO', label: taskStatusLabel('TODO') },
  { value: 'IN_PROGRESS', label: taskStatusLabel('IN_PROGRESS') },
  { value: 'DONE', label: taskStatusLabel('DONE') },
]

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: taskPriorityLabel('LOW') },
  { value: 'MEDIUM', label: taskPriorityLabel('MEDIUM') },
  { value: 'HIGH', label: taskPriorityLabel('HIGH') },
]

export interface ClientTasksSectionProps {
  projectId: string
  /** پروژه در حال اجراست؟ همه‌ی تغییرات فقط در IN_PROGRESS مجاز است */
  projectInProgress: boolean
  /** تیم پروژه برای انتخاب مسئول (assignedTo باید عضو تیم باشد — قاعده‌ی بک‌اند) */
  team: TeamDto | null
}

export default function ClientTasksSection({
  projectId,
  projectInProgress,
  team,
}: ClientTasksSectionProps) {
  const [tasks, setTasks] = useState<TaskPagination | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'' | TaskStatus>('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(
    async (page = 1, status: '' | TaskStatus = '') => {
      setTasks(null)
      setError(null)
      try {
        setTasks(
          await taskService.listProjectTasks(projectId, {
            page,
            pageSize: PAGE_SIZE,
            ...(status !== '' && { status }),
          }),
        )
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      }
    },
    [projectId],
  )

  useEffect(() => {
    void load(1, '')
  }, [load])

  const refresh = () => void load(tasks?.page ?? 1, statusFilter)

  // ── فرم ایجاد/ویرایش مشترک ──
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TaskDto | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [formErrors, setFormErrors] = useState<{ title?: string; dueDate?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const openCreate = () => {
    setEditing(null)
    setTitle('')
    setDescription('')
    setPriority('MEDIUM')
    setDueDate('')
    setAssignedTo('')
    setFormErrors({})
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (t: TaskDto) => {
    setEditing(t)
    setTitle(t.title)
    setDescription(t.description ?? '')
    setPriority(t.priority)
    setDueDate(t.dueDate ?? '')
    setAssignedTo(t.assignedTo?.id ?? '')
    setFormErrors({})
    setFormError(null)
    setFormOpen(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof formErrors = {}
    if (title.trim().length < 2 || title.trim().length > 150) {
      next.title = 'عنوان باید بین ۲ تا ۱۵۰ کاراکتر باشد'
    }
    if (dueDate !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      next.dueDate = 'فرمت مهلت انجام باید YYYY-MM-DD باشد'
    }
    setFormErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        // CLIENT: فقط فیلدهای مجاز — status هرگز ارسال نمی‌شود (قاعده‌ی M09)
        await taskService.updateTask(projectId, editing.id, {
          title: title.trim(),
          description: description.trim() === '' ? undefined : description.trim(),
          priority,
          dueDate: dueDate === '' ? undefined : dueDate,
          assignedTo: assignedTo === '' ? undefined : assignedTo,
        })
      } else {
        await taskService.createTask(projectId, {
          title: title.trim(),
          description: description.trim() === '' ? undefined : description.trim(),
          priority,
          dueDate: dueDate === '' ? undefined : dueDate,
          assignedTo: assignedTo === '' ? undefined : assignedTo,
        })
      }
      setFormOpen(false)
      refresh()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  // ── حذف (فقط TODO — بک‌اند 409 می‌دهد) ──
  const [deleting, setDeleting] = useState<TaskDto | null>(null)

  const doDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setActionError(null)
    try {
      await taskService.deleteTask(projectId, deleting.id)
      setDeleting(null)
      refresh()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      setDeleting(null)
    } finally {
      setBusy(false)
    }
  }

  // پیشرفت — صرفاً نمایشی از داده‌ی واقعی
  const doneCount = tasks?.items.filter((t) => t.status === 'DONE').length ?? 0
  const total = tasks?.total ?? 0
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100)

  return (
    <Card
      title={`کارهای پروژه${tasks ? ` (${total.toLocaleString('fa-IR')})` : ''}`}
      description={
        projectInProgress
          ? 'شما می‌توانید کار ثبت کنید، جزئیات را ویرایش کنید و کارهای انجام‌نشده را حذف کنید.'
          : 'ثبت/ویرایش/حذف کار فقط در پروژه‌ی «در حال اجرا» فعال است — فعلاً فقط مشاهده.'
      }
    >
      {actionError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      )}

      {/* پیشرفت نمایشی + فیلتر + ایجاد */}
      {tasks !== null && (
        <div className="mb-4 space-y-3">
          {total > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-slate-500">پیشرفت (نمایشی)</span>
                <span className="text-xs font-medium text-slate-700">
                  {doneCount.toLocaleString('fa-IR')} از {total.toLocaleString('fa-IR')} کار انجام شده (
                  {percent.toLocaleString('fa-IR')}٪)
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`پیشرفت پروژه ${percent} درصد`}
              >
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-48">
              <Select
                label="فیلتر وضعیت"
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e) => {
                  const v = e.target.value as '' | TaskStatus
                  setStatusFilter(v)
                  void load(1, v)
                }}
              />
            </div>
            {projectInProgress && !formOpen && (
              <Button size="sm" onClick={openCreate}>
                + ثبت کار جدید
              </Button>
            )}
          </div>
        </div>
      )}

      {tasks === null && !error && <Loading label="در حال دریافت کارها…" />}
      {error && <ErrorState message={error} onRetry={() => void load(1, statusFilter)} />}

      {tasks !== null && tasks.items.length === 0 && (
        <EmptyState
          title="هنوز کاری برای این پروژه ثبت نشده است."
          description={
            projectInProgress
              ? 'اولین کار این پروژه را ثبت کنید.'
              : 'کارهای این پروژه پس از شروع اجرا تعریف می‌شوند.'
          }
        />
      )}

      {tasks !== null && tasks.items.length > 0 && (
        <>
          <ul className="space-y-3">
            {tasks.items.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="min-w-0 text-sm font-bold text-slate-800">{t.title}</h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={taskPriorityVariant(t.priority)}>
                      اولویت: {taskPriorityLabel(t.priority)}
                    </Badge>
                    <Badge variant={taskStatusVariant(t.status)}>{taskStatusLabel(t.status)}</Badge>
                  </div>
                </div>
                {t.description && (
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
                    {t.description}
                  </p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:grid-cols-4">
                  <div>
                    <dt className="inline">مسئول: </dt>
                    <dd className="inline text-slate-700">
                      {t.assignedTo?.fullName ?? 'تخصیص‌نیافته'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">مهلت: </dt>
                    <dd className="inline text-slate-700" dir="ltr">
                      {t.dueDate ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline">ایجاد: </dt>
                    <dd className="inline text-slate-700">{formatFaDate(t.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="inline">به‌روزرسانی: </dt>
                    <dd className="inline text-slate-700">{formatFaDate(t.updatedAt)}</dd>
                  </div>
                </dl>

                {projectInProgress && t.status !== 'DONE' && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>
                      ویرایش جزئیات
                    </Button>
                    {t.status === 'TODO' && (
                      <Button variant="danger" size="sm" onClick={() => setDeleting(t)}>
                        حذف
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          {tasks.totalPages > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-3" aria-label="صفحه‌بندی کارها">
              <Button
                variant="outline"
                size="sm"
                disabled={tasks.page <= 1}
                onClick={() => void load(tasks.page - 1, statusFilter)}
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
                onClick={() => void load(tasks.page + 1, statusFilter)}
              >
                صفحه‌ی بعد
              </Button>
            </nav>
          )}
        </>
      )}

      {/* فرم ایجاد/ویرایش */}
      {formOpen && (
        <form
          onSubmit={submit}
          noValidate
          className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">
              {editing ? `ویرایش کار: ${editing.title}` : 'کار جدید'}
            </h4>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFormOpen(false)} disabled={submitting}>
              بستن
            </Button>
          </div>

          {formError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {formError}
            </div>
          )}

          <Input
            label="عنوان کار"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={formErrors.title}
          />

          <div>
            <label htmlFor="task-desc" className="mb-1.5 block text-sm font-medium text-slate-700">
              شرح (اختیاری)
            </label>
            <textarea
              id="task-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-800 focus:border-indigo-500"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="اولویت"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            />
            <Input
              label="مهلت انجام (اختیاری)"
              type="date"
              ltr
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              error={formErrors.dueDate}
              hint="نمی‌تواند در گذشته باشد"
            />
            <Select
              label="مسئول (اختیاری)"
              options={[
                { value: '', label: 'تخصیص‌نیافته' },
                ...(team?.members.map((m) => ({
                  value: m.userId,
                  label: `${m.fullName ?? 'بدون نام'} (${m.role})`,
                })) ?? []),
              ]}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              hint="فقط اعضای تیم پروژه"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting}>
              {editing ? 'ذخیره‌ی تغییرات' : 'ثبت کار'}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="حذف کار"
        message={`آیا از حذف کار «${deleting?.title ?? ''}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
        confirmLabel="بله، حذف کن"
        danger
        loading={busy}
        onConfirm={() => void doDelete()}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  )
}
