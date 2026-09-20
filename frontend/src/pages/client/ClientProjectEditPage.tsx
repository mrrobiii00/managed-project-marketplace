// ─────────────────────────────────────────────────────────────
// /client/projects/:projectId/edit — ویرایش (PUT /projects/:id)
// فرم با داده‌ی فعلی populate می‌شود؛ فقط DRAFT|SUBMITTED طبق بک‌اند.
// اگر وضعیت قفل باشد (direct URL)، خطای واقعی سرور/handle می‌شود.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Loading } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/ErrorState'
import ProjectForm, {
  type ProjectFormPayload,
  type ProjectFormValues,
} from '../../components/projects/ProjectForm'
import { projectService } from '../../services/project.service'
import { ApiError } from '../../types/api'
import type { ProjectStatus } from '../../types/project'
import { canEditProject, statusLabel } from '../../utils/status'

export default function ClientProjectEditPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()

  const [initial, setInitial] = useState<ProjectFormValues | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadStatus, setLoadStatus] = useState<ProjectStatus | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!projectId) return
    setInitial(null)
    setLoadError(null)
    try {
      const p = await projectService.getProject(projectId)
      setLoadStatus(p.status)
      // populate فرم از داده‌ی واقعی
      setInitial({
        title: p.title,
        description: p.description,
        minBudget: p.minBudget ?? '',
        maxBudget: p.maxBudget ?? '',
        deadline: p.deadline ?? '',
        skills: p.skills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })),
        roles: p.roles.map((r) => ({ roleName: r.roleName, quantity: String(r.quantity) })),
      })
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (payload: ProjectFormPayload) => {
    if (!projectId) return
    setSubmitting(true)
    setServerError(null)
    try {
      await projectService.updateProject(projectId, payload)
      navigate(`/client/projects/${projectId}`, { replace: true })
    } catch (err) {
      // 409 «قابل ویرایش نیست» و 422 با پیام فارسی سرور
      setServerError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  if (initial === null && !loadError) {
    return <Card><Loading label="در حال دریافت پروژه…" /></Card>
  }
  if (loadError) {
    return (
      <Card>
        <ErrorState
          title="دریافت پروژه ناموفق بود"
          message={loadError}
          onRetry={() => void load()}
          action={
            <Link to={projectId ? `/client/projects/${projectId}` : '/client/projects'}>
              <Button variant="ghost" size="sm">بازگشت به جزئیات پروژه</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  // گارد UI بر اساس وضعیت واقعیِ خوانده‌شده از سرور (backend همچنان source of truth)
  if (loadStatus && !canEditProject(loadStatus)) {
    return (
      <Card>
        <ErrorState
          title="این پروژه قابل ویرایش نیست"
          message={`پروژه در وضعیت «${statusLabel(loadStatus)}» است و طبق قواعد سیستم فقط در وضعیت‌های پیش‌نویس و ارسال‌شده قابل ویرایش است.`}
          action={
            <Link to={`/client/projects/${projectId}`}>
              <Button variant="outline" size="sm">بازگشت به جزئیات پروژه</Button>
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-800">ویرایش پروژه</h2>
        <Link to={`/client/projects/${projectId}`}>
          <Button variant="ghost" size="sm">بازگشت به جزئیات</Button>
        </Link>
      </div>

      <Card title="مشخصات پروژه" description="تغییرات پس از ذخیره بلافاصله اعمال می‌شود.">
        {initial && (
          <ProjectForm
            initial={initial}
            submitLabel="ذخیره‌ی تغییرات"
            submitting={submitting}
            serverError={serverError}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/client/projects/${projectId}`)}
            onCancelLabel="انصراف"
          />
        )}
      </Card>
    </div>
  )
}
