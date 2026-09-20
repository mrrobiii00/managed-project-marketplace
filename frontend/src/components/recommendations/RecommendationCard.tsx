// ─────────────────────────────────────────────────────────────
// RecommendationCard — کارت پیشنهاد پروژه برای متخصص
// همه‌ی مقادیر (score/trust/وضعیت‌ها) مستقیم از API — بدون بازمحاسبه
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import {
  formatFaBudget,
  formatFaScore,
  recoStatusLabel,
  recoStatusVariant,
  statusLabel,
  statusVariant,
} from '../../utils/status'
import type { RecommendationListItem } from '../../types/recommendation'

/** نوار پیشرفتِ صرفاً نمایشی مقدار واقعی بک‌اند (0..100) */
function ScoreBar({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className="text-xs font-bold text-slate-700">{formatFaScore(value)}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="presentation"
      >
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

export default function RecommendationCard({ item }: { item: RecommendationListItem }) {
  const { project, match } = item

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-sm font-bold text-slate-800">{project.title}</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={statusVariant(project.status)}>{statusLabel(project.status)}</Badge>
          <Badge variant={recoStatusVariant(match.status)}>{recoStatusLabel(match.status)}</Badge>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 sm:grid-cols-3">
        <div>
          <dt className="inline">بودجه: </dt>
          <dd className="inline text-slate-700">
            {project.minBudget === null && project.maxBudget === null
              ? '—'
              : `${formatFaBudget(project.minBudget)} تا ${formatFaBudget(project.maxBudget)}`}
          </dd>
        </div>
        <div>
          <dt className="inline">مهلت: </dt>
          <dd className="inline text-slate-700" dir="ltr">
            {project.deadline ?? '—'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ScoreBar value={match.totalScore} label="امتیاز تطبیق" />
        <ScoreBar value={match.trustScore} label="اعتبار (Trust)" />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <Link
          to={`/specialist/recommended-projects/${project.id}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          مشاهده جزئیات و دلیل تطبیق ←
        </Link>
      </div>
    </article>
  )
}
