// ─────────────────────────────────────────────────────────────
// TaskCard — کارت تسک در Workspace متخصص
// Actionهای وضعیت فقط برای تسکِ خودِ متخصص و طبق گذارهای واقعی
// M09 آینه‌سازی می‌شوند (بک‌اند منبع نهایی مجوز است).
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import type { TaskDto, TaskStatus } from '../../types/task'
import {
  formatFaDate,
  taskPriorityLabel,
  taskPriorityVariant,
  taskStatusLabel,
  taskStatusVariant,
} from '../../utils/status'

/** گذارهای مجاز — آینه‌ی دقیق ALLOWED_TASK_TRANSITIONS بک‌اند (task.rules.ts M09) */
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

export interface TaskCardProps {
  task: TaskDto
  projectId: string
  /** پروژه در حال اجراست؟ (گذار فقط در IN_PROGRESS مجاز است — قاعده‌ی بک‌اند) */
  projectInProgress: boolean
  /** شناسه‌ی متخصص جاری — برای آینه‌سازی «فقط تسک خودش» */
  currentUserId: string
  onTransition: (task: TaskDto, to: TaskStatus) => void
  busy?: boolean
}

export default function TaskCard({
  task,
  projectId,
  projectInProgress,
  currentUserId,
  onTransition,
  busy = false,
}: TaskCardProps) {
  const isMine = task.assignedTo?.id === currentUserId
  const nexts = NEXT_STATUSES[task.status] ?? []

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="min-w-0 text-sm font-bold text-slate-800">
          <Link
            to={`/specialist/projects/${projectId}/tasks/${task.id}`}
            className="hover:text-indigo-700"
          >
            {task.title}
          </Link>
        </h4>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={taskPriorityVariant(task.priority)}>
            اولویت: {taskPriorityLabel(task.priority)}
          </Badge>
          <Badge variant={taskStatusVariant(task.status)}>{taskStatusLabel(task.status)}</Badge>
        </div>
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-slate-500">
          {task.description}
        </p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:grid-cols-3">
        <div>
          <dt className="inline">مسئول: </dt>
          <dd className="inline text-slate-700">
            {task.assignedTo?.fullName ?? 'تخصیص‌نیافته'}
            {isMine && ' (شما)'}
          </dd>
        </div>
        <div>
          <dt className="inline">مهلت: </dt>
          <dd className="inline text-slate-700" dir="ltr">
            {task.dueDate ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="inline">ایجاد: </dt>
          <dd className="inline text-slate-700">{formatFaDate(task.createdAt)}</dd>
        </div>
      </dl>

      {/* Actionهای وضعیت — فقط تسک خودِ متخصص + پروژه‌ی در حال اجرا + گذار مجاز */}
      {isMine && projectInProgress && nexts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-50 pt-3">
          {nexts.map((to) => (
            <Button
              key={to}
              size="sm"
              variant={to === 'DONE' ? 'primary' : to === 'TODO' ? 'ghost' : 'outline'}
              disabled={busy}
              onClick={() => onTransition(task, to)}
            >
              {TRANSITION_LABEL[`${task.status}>${to}`] ?? to}
            </Button>
          ))}
        </div>
      )}
      {isMine && !projectInProgress && nexts.length > 0 && (
        <p className="mt-3 border-t border-slate-50 pt-2 text-[11px] text-slate-400">
          تغییر وضعیت فقط در پروژه‌ی «در حال اجرا» ممکن است.
        </p>
      )}
    </article>
  )
}
