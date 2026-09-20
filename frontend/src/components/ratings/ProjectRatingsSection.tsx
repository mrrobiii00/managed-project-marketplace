// ─────────────────────────────────────────────────────────────
// ProjectRatingsSection — بخش «ارزیابی پروژه» در Workspace (M15)
// نمایش فقط برای COMPLETED/RATED (§21). قرارداد واقعی M10:
//   • CLIENT مالک ← اعضای تیم | SPECIALIST عضو ← کارفرمای پروژه
//   • ثبت فقط در COMPLETED (در RATED بک‌اند 409 می‌دهد → فرم نیست)
//   • از قبل ثبت‌شده → کارت به جای فرم (بدون Edit/Delete — بک‌اند
//     امکانش را ندارد)
//   • ADMIN طرف پروژه نیست → فقط مشاهده‌ی لیست
// هدف‌ها از داده‌ی واقعی موجود (team/ProjectDto) — eligibility
// نهایی همیشه با بک‌اند است؛ UI فقط UX را بهتر می‌کند.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { Loading } from '../ui/Loading'
import { ErrorState } from '../ui/ErrorState'
import { EmptyState } from '../ui/EmptyState'
import RatingForm from './RatingForm'
import RatingCard from './RatingCard'
import { ratingService } from '../../services/rating.service'
import type { RatingDto } from '../../types/rating'
import type { ProjectDto } from '../../types/project'
import type { TeamDto } from '../../types/team'
import type { UserRole } from '../../types/auth'
import { ApiError } from '../../types/api'
import { statusLabel } from '../../utils/status'

interface ProjectRatingsSectionProps {
  project: ProjectDto
  team: TeamDto | null
  currentUserId: string
  currentRole: UserRole
}

interface RatingTarget {
  userId: string
  name: string
}

export default function ProjectRatingsSection({
  project,
  team,
  currentUserId,
  currentRole,
}: ProjectRatingsSectionProps) {
  const [ratings, setRatings] = useState<RatingDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRatings(null)
    setError(null)
    try {
      const res = await ratingService.getProjectRatings(project.id)
      setRatings(res.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [project.id])

  useEffect(() => {
    void load()
  }, [load])

  // هدف‌های مجاز از داده‌ی واقعی موجود (آینه‌ی قواعد M10 — نه قانون جدید)
  const isOwner = project.client.id === currentUserId
  const isTeamMember = (team?.members ?? []).some((m) => m.userId === currentUserId)
  let targets: RatingTarget[] = []
  if (currentRole === 'CLIENT' && isOwner) {
    targets = (team?.members ?? [])
      .filter((m) => m.userId !== currentUserId)
      .map((m) => ({ userId: m.userId, name: m.fullName ?? 'عضو تیم' }))
  } else if (currentRole === 'SPECIALIST' && isTeamMember) {
    if (project.client.id !== currentUserId) {
      targets = [{ userId: project.client.id, name: project.client.fullName ?? 'کارفرمای پروژه' }]
    }
  }
  // ADMIN/سایر: targets خالی — فقط مشاهده‌ی ارزیابی‌ها

  // ثبت جدید فقط در COMPLETED؛ RATED یعنی فرآیند ارزیابی بسته شده
  const canSubmit = project.status === 'COMPLETED'

  const myRatings = (ratings ?? []).filter((r) => r.fromUser.id === currentUserId)
  const othersRatings = (ratings ?? []).filter((r) => r.fromUser.id !== currentUserId)
  const myRatingFor = (targetId: string) =>
    myRatings.find((r) => r.toUser.id === targetId) ?? null

  return (
    <Card
      title="ارزیابی پروژه"
      description={
        project.status === 'COMPLETED'
          ? 'پروژه تکمیل شده است — تجربه‌ی همکاری خود با طرف‌های دیگر این پروژه را ارزیابی کنید.'
          : `ارزیابی‌های ثبت‌شده‌ی این پروژه (وضعیت: ${statusLabel(project.status)}).`
      }
    >
      {ratings === null && !error && <Loading label="در حال دریافت ارزیابی‌ها…" />}
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {ratings !== null && (
        <div className="space-y-5">
          {/* ── ارزیابی‌ی شما (فرم یا کارت ثبت‌شده) ── */}
          {targets.length > 0 && (
            <section aria-label="ارزیابی شما">
              <h4 className="mb-2 text-xs font-semibold text-slate-500">
                ارزیابی شما — {currentRole === 'CLIENT' ? 'اعضای تیم پروژه' : 'کارفرمای پروژه'}
              </h4>
              <div className="space-y-3">
                {targets.map((target) => {
                  const existing = myRatingFor(target.userId)
                  if (existing) {
                    return (
                      <RatingCard key={target.userId} rating={existing} badgeLabel="ارزیابی شما" />
                    )
                  }
                  if (canSubmit) {
                    return (
                      <RatingForm
                        key={target.userId}
                        projectId={project.id}
                        toUserId={target.userId}
                        toUserName={target.name}
                        onCreated={() => void load()}
                      />
                    )
                  }
                  return (
                    <p key={target.userId} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                      ارزیابی {target.name} در وضعیت فعلی پروژه امکان‌پذیر نیست.
                    </p>
                  )
                })}
              </div>
            </section>
          )}

          {targets.length === 0 && (
            <EmptyState
              title="در حال حاضر شخصی برای ارزیابی در دسترس نیست."
              description={
                currentRole === 'CLIENT'
                  ? 'برای ارزیابی، ابتدا باید تیم این پروژه تشکیل شده باشد.'
                  : 'فقط طرف‌های پروژه (کارفرمای مالک و اعضای تیم) می‌توانند ارزیابی ثبت کنند.'
              }
            />
          )}

          {/* ── ارزیابی‌های ثبت‌شده (بقیه‌ی طرف‌ها) ── */}
          <section aria-label="ارزیابی‌های ثبت‌شده">
            <h4 className="mb-2 text-xs font-semibold text-slate-500">
              ارزیابی‌های ثبت‌شده ({(ratings.length).toLocaleString('fa-IR')})
            </h4>
            {ratings.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-xs leading-6 text-slate-500">
                هنوز ارزیابی‌ای برای این پروژه ثبت نشده است.
              </p>
            ) : (
              <ul className="space-y-3">
                {othersRatings.map((r) => (
                  <li key={r.id}>
                    <RatingCard rating={r} showTarget />
                  </li>
                ))}
                {othersRatings.length === 0 && myRatings.length > 0 && (
                  <li className="rounded-lg bg-slate-50 px-3 py-3 text-xs leading-6 text-slate-500">
                    به‌جز ارزیابی‌های شما، ارزیابی دیگری برای این پروژه ثبت نشده است.
                  </li>
                )}
              </ul>
            )}
          </section>
        </div>
      )}
    </Card>
  )
}
