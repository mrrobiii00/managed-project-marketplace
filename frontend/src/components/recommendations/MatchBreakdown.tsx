// ─────────────────────────────────────────────────────────────
// MatchBreakdown — توضیح‌پذیری تطبیق (Explainability)
// شش مؤلفه + Total/Trust برجسته — مقادیر عیناً از M11؛
// هیچ وزن/فرمول/بازمحاسبه‌ای در فرانت انجام نمی‌شود.
// ─────────────────────────────────────────────────────────────

import { formatFaScore } from '../../utils/status'
import type { MatchInfo } from '../../types/recommendation'

interface Row {
  key: string
  label: string
  value: number
}

function Bar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="presentation">
      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${clamped}%` }} />
    </div>
  )
}

function ComponentRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-800">{formatFaScore(value)}</span>
      </div>
      <Bar value={value} />
      <span className="sr-only">{`${label}: ${value} از ۱۰۰`}</span>
    </div>
  )
}

export default function MatchBreakdown({ match }: { match: MatchInfo }) {
  const rows: Row[] = [
    { key: 'skill', label: 'تطابق مهارت (Skill Match)', value: match.skillScore },
    { key: 'experience', label: 'تجربه (Experience)', value: match.experienceScore },
    { key: 'projects', label: 'پروژه‌های قبلی (Previous Projects)', value: match.projectScore },
    { key: 'rating', label: 'امتیاز کاربران (Rating)', value: match.ratingScore },
    { key: 'availability', label: 'دسترس‌پذیری (Availability)', value: match.availabilityScore },
    { key: 'budget', label: 'بودجه (Budget)', value: match.budgetScore },
  ]

  return (
    <div>
      {/* دو امتیاز کل — برجسته */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-indigo-50 p-4 text-center ring-1 ring-inset ring-indigo-100">
          <p className="text-[11px] font-medium text-indigo-600">امتیاز کل تطبیق</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{formatFaScore(match.totalScore)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-inset ring-emerald-100">
          <p className="text-[11px] font-medium text-emerald-600">اعتبار متخصص (Trust Score)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{formatFaScore(match.trustScore)}</p>
        </div>
      </div>

      {/* شش مؤلفه — مقادیر خام بک‌اند */}
      <ul className="mt-4 divide-y divide-slate-50" aria-label="مؤلفه‌های امتیاز تطبیق">
        {rows.map((r) => (
          <li key={r.key}>
            <ComponentRow label={r.label} value={r.value} />
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        این امتیازها توسط موتور تطبیق سیستم محاسبه و ذخیره شده‌اند و صرفاً نمایش داده می‌شوند.
      </p>
    </div>
  )
}
