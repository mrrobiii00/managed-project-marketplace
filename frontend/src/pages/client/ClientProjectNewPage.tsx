// ─────────────────────────────────────────────────────────────
// /client/projects/new — ایجاد پروژه (POST /projects)
// موفق → redirect به detail؛ خطا → پیام فارسی سرور
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import ProjectForm, {
  emptyProjectForm,
  type ProjectFormPayload,
} from '../../components/projects/ProjectForm'
import { projectService } from '../../services/project.service'
import { ApiError } from '../../types/api'

export default function ClientProjectNewPage() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = async (payload: ProjectFormPayload) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const created = await projectService.createProject(payload)
      navigate(`/client/projects/${created.id}`, { replace: true })
    } catch (err) {
      // 401 توسط رویداد سراسری M14-A مدیریت می‌شود (خروج + /login)
      setServerError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-800">ایجاد پروژه‌ی جدید</h2>
        <Link to="/client/projects">
          <Button variant="ghost" size="sm">بازگشت به لیست</Button>
        </Link>
      </div>

      <Card
        title="مشخصات پروژه"
        description="پروژه به‌صورت «پیش‌نویس» ساخته می‌شود؛ پس از تکمیل، آن را برای بررسی و تطبیق ارسال کنید."
      >
        <ProjectForm
          initial={emptyProjectForm}
          submitLabel="ایجاد پروژه"
          submitting={submitting}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/client/projects')}
          onCancelLabel="انصراف"
        />
      </Card>
    </div>
  )
}
