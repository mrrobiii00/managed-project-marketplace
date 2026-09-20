// ─────────────────────────────────────────────────────────────
// TeamSummaryCard — کارت فقط‌خواندنی تیم (M08) برای Workspace ها
// هیچ action مدیریتی ندارد — خواندن pure.
// ─────────────────────────────────────────────────────────────

import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { TeamDto } from '../../types/team'
import { formatFaScore, teamStatusLabel, teamStatusVariant } from '../../utils/status'

export interface TeamSummaryCardProps {
  team: TeamDto
  /** شناسه‌ی کاربر جاری برای نشان‌دادن «(شما)» */
  currentUserId?: string
}

export default function TeamSummaryCard({ team, currentUserId }: TeamSummaryCardProps) {
  return (
    <Card title="تیم پروژه (فقط مشاهده)" description="مدیریت تیم با کارفرما/مدیر سیستم است.">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-800">{team.name}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={teamStatusVariant(team.status)}>{teamStatusLabel(team.status)}</Badge>
            <Badge variant="primary">امتیاز تیم: {formatFaScore(team.teamScore)}</Badge>
          </div>
        </div>
        <ul className="divide-y divide-slate-50">
          {team.members.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-800">
                  {m.fullName ?? 'بدون نام'}
                  {m.userId === currentUserId && (
                    <span className="mr-1 text-[11px] font-medium text-indigo-600">(شما)</span>
                  )}
                </p>
                {m.jobTitle && <p className="text-[11px] text-slate-400">{m.jobTitle}</p>}
                <p className="text-[11px] text-slate-400">{m.role}</p>
              </div>
              <Badge variant="info">تطبیق: {formatFaScore(m.matchScore)}</Badge>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
