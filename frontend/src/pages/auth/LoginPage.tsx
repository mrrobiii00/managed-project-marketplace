// ─────────────────────────────────────────────────────────────
// LoginPage — ورود با ایمیل/رمز؛ اتصال واقعی به POST /auth/login
// ─────────────────────────────────────────────────────────────

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../types/api'
import { getDashboardPath } from '../../utils/roles'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!email.trim()) next.email = 'ایمیل الزامی است'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'ایمیل معتبر نیست'
    if (!password) next.password = 'رمز عبور الزامی است'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const user = await login({ email: email.trim(), password })
      // هدایت متمرکز بر اساس نقش (CLIENT/SPECIALIST/ADMIN)
      navigate(getDashboardPath(user.role), { replace: true })
    } catch (err) {
      // فقط پیام فارسی قابل‌فهم — بدون جزئیات فنی
      setSubmitError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="ورود به حساب" description="با ایمیل و رمز عبور خود وارد شوید">
      {submitError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="ایمیل"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          ltr
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="رمز عبور"
          type="password"
          name="password"
          autoComplete="current-password"
          ltr
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <Button type="submit" block loading={submitting}>
          ورود
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        حساب ندارید؟{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700">
          ثبت‌نام کنید
        </Link>
      </p>
    </Card>
  )
}
