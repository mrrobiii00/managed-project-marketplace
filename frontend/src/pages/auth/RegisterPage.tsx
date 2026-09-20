// ─────────────────────────────────────────────────────────────
// RegisterPage — ثبت‌نام عمومی؛ نقش فقط CLIENT یا SPECIALIST
// (ADMIN از frontend عمومی قابل انتخاب نیست — عمداً حذف شده)
// ─────────────────────────────────────────────────────────────

import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { ApiError } from '../../types/api'
import type { PublicRegisterRole } from '../../types/auth'
import { getDashboardPath } from '../../utils/roles'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

/** فقط دو نقش عمومی — بدون ADMIN */
const roleOptions = [
  { value: '', label: 'نقش خود را انتخاب کنید', disabled: true },
  { value: 'CLIENT', label: 'کارفرما — ثبت و مدیریت پروژه' },
  { value: 'SPECIALIST', label: 'متخصص — دریافت پیشنهاد پروژه' },
]

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  role?: string
}

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'' | PublicRegisterRole>('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!email.trim()) next.email = 'ایمیل الزامی است'
    else if (!EMAIL_RE.test(email.trim())) next.email = 'ایمیل معتبر نیست'
    if (!password) next.password = 'رمز عبور الزامی است'
    else if (password.length < MIN_PASSWORD) next.password = `رمز عبور باید حداقل ${MIN_PASSWORD} کاراکتر باشد`
    if (!confirmPassword) next.confirmPassword = 'تکرار رمز عبور الزامی است'
    else if (confirmPassword !== password) next.confirmPassword = 'تکرار رمز عبور با رمز عبور یکسان نیست'
    if (role !== 'CLIENT' && role !== 'SPECIALIST') next.role = 'انتخاب نقش الزامی است'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      const user = await register({ email: email.trim(), password, role: role as PublicRegisterRole })
      // بک‌اند در ثبت‌نام token برمی‌گرداند → ورود خودکار و هدایت نقش‌محور
      navigate(getDashboardPath(user.role), { replace: true })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card title="ایجاد حساب کاربری" description="ثبت‌نام به‌عنوان کارفرما یا متخصص">
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
          autoComplete="new-password"
          ltr
          hint={`حداقل ${MIN_PASSWORD} کاراکتر`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <Input
          label="تکرار رمز عبور"
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          ltr
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />
        <Select
          label="نقش"
          name="role"
          options={roleOptions}
          value={role}
          onChange={(e) => setRole(e.target.value as '' | PublicRegisterRole)}
          error={errors.role}
        />

        <Button type="submit" block loading={submitting}>
          ثبت‌نام
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        قبلاً ثبت‌نام کرده‌اید؟{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700">
          وارد شوید
        </Link>
      </p>
    </Card>
  )
}
