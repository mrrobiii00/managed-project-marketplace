// ─────────────────────────────────────────────────────────────
// ProjectForm — فرم مشترک Create/Edit پروژه (CLIENT)
//
// validation سبکِ آینه‌شده از zod بک‌اند M06 (source of truth)؛
// خطای نهایی همیشه از سرور می‌آید (422/409 با پیام فارسی).
// بودجه‌ها به‌صورت عدد به سرور می‌روند (قرارداد M06).
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Badge } from '../ui/Badge'
import { Loading } from '../ui/Loading'
import { ErrorState } from '../ui/ErrorState'
import { skillService, type SkillCatalogItem } from '../../services/skill.service'
import { cn } from '../../utils/cn'

/** مقدارهای قابل‌ویرایش فرم (ورودی‌ها رشته‌اند؛ در submit به عدد تبدیل می‌شوند) */
export interface ProjectFormValues {
  title: string
  description: string
  minBudget: string
  maxBudget: string
  deadline: string
  skills: Array<{ skillId: string; isRequired: boolean }>
  roles: Array<{ roleName: string; quantity: string }>
}

export const emptyProjectForm: ProjectFormValues = {
  title: '',
  description: '',
  minBudget: '',
  maxBudget: '',
  deadline: '',
  skills: [],
  roles: [],
}

export type ProjectFormPayload = {
  title: string
  description: string
  minBudget?: number
  maxBudget?: number
  deadline?: string
  skills: Array<{ skillId: string; isRequired: boolean }>
  roles: Array<{ roleName: string; quantity: number }>
}

export type FormErrors = Partial<Record<keyof ProjectFormValues, string>>

export interface ProjectFormProps {
  initial: ProjectFormValues
  submitLabel: string
  submitting: boolean
  /** پیام خطای سرور (فارسی) — بالای فرم نمایش داده می‌شود */
  serverError?: string | null
  onSubmit: (payload: ProjectFormPayload) => void
  /** متن دکمه‌ی فرعی برای بازگشت */
  onCancelLabel?: string
  onCancel?: () => void
}

const BUDGET_MAX = 1_000_000_000_000

function parseBudget(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  return Number(trimmed)
}

/** validation آینه‌ی zod بک‌اند — سبک و بدون تکرار قواعد پیچیده */
export function validateProjectForm(v: ProjectFormValues): FormErrors {
  const errors: FormErrors = {}

  if (v.title.trim().length < 3 || v.title.trim().length > 200) {
    errors.title = 'عنوان باید بین ۳ تا ۲۰۰ کاراکتر باشد'
  }
  if (v.description.trim().length < 20 || v.description.trim().length > 10000) {
    errors.description = 'شرح پروژه باید حداقل ۲۰ کاراکتر باشد'
  }

  const min = parseBudget(v.minBudget)
  const max = parseBudget(v.maxBudget)
  for (const [key, val] of [
    ['minBudget', min],
    ['maxBudget', max],
  ] as const) {
    if (val === undefined) continue
    if (Number.isNaN(val)) {
      errors[key] = 'بودجه باید عدد باشد'
    } else if (val < 0) {
      errors[key] = 'بودجه نمی‌تواند منفی باشد'
    } else if (val > BUDGET_MAX) {
      errors[key] = 'بودجه واردشده غیرمنطقی است'
    } else if (Math.round(val * 100) !== val * 100) {
      errors[key] = 'بودجه حداکثر دو رقم اعشار می‌تواند داشته باشد'
    }
  }
  if (min !== undefined && max !== undefined && min > max) {
    errors.minBudget = 'حداقل بودجه نمی‌تواند از حداکثر بودجه بیشتر باشد'
  }

  if (v.deadline !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(v.deadline)) {
    errors.deadline = 'فرمت مهلت انجام باید YYYY-MM-DD باشد'
  }

  if (v.skills.length > 20) errors.skills = 'حداکثر ۲۰ مهارت برای پروژه مجاز است'

  if (v.roles.length > 20) {
    errors.roles = 'حداکثر ۲۰ نقش برای پروژه مجاز است'
  } else {
    const names = v.roles.map((r) => r.roleName.trim())
    if (names.some((n) => n.length < 2 || n.length > 100)) {
      errors.roles = 'نام هر نقش باید بین ۲ تا ۱۰۰ کاراکتر باشد'
    } else if (new Set(names).size !== names.length) {
      errors.roles = 'نام نقش‌ها باید یکتا باشند'
    } else if (v.roles.some((r) => !Number.isInteger(Number(r.quantity)) || Number(r.quantity) < 1 || Number(r.quantity) > 20)) {
      errors.roles = 'تعداد هر نقش باید عدد صحیح بین ۱ تا ۲۰ باشد'
    }
  }

  return errors
}

/** تبدیل مقادیر فرم به payload قرارداد API (bodget عدد) */
export function toProjectPayload(v: ProjectFormValues): ProjectFormPayload {
  return {
    title: v.title.trim(),
    description: v.description.trim(),
    minBudget: parseBudget(v.minBudget),
    maxBudget: parseBudget(v.maxBudget),
    deadline: v.deadline === '' ? undefined : v.deadline,
    skills: v.skills.map((s) => ({ skillId: s.skillId, isRequired: s.isRequired })),
    roles: v.roles
      .map((r) => ({ roleName: r.roleName.trim(), quantity: Number(r.quantity) }))
      .filter((r) => r.roleName !== ''),
  }
}

export default function ProjectForm({
  initial,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onCancelLabel,
  onCancel,
}: ProjectFormProps) {
  const [values, setValues] = useState<ProjectFormValues>(initial)
  const [errors, setErrors] = useState<FormErrors>({})
  const [catalog, setCatalog] = useState<SkillCatalogItem[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // کاتالوگ مهارت‌ها از API واقعی (GET /skills — عمومی)
  useEffect(() => {
    let cancelled = false
    skillService
      .getSkills()
      .then((items) => !cancelled && setCatalog(items))
      .catch(() => !cancelled && setCatalogError('دریافت فهرست مهارت‌ها ناموفق بود'))
    return () => {
      cancelled = true
    }
  }, [])

  // گروه‌بندی مهارت‌ها بر اساس category
  const grouped = useMemo(() => {
    const map = new Map<string, SkillCatalogItem[]>()
    for (const s of catalog ?? []) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [catalog])

  const selectedIds = useMemo(() => new Set(values.skills.map((s) => s.skillId)), [values.skills])

  const toggleSkill = (skillId: string) => {
    setValues((prev) => {
      const exists = prev.skills.some((s) => s.skillId === skillId)
      return {
        ...prev,
        skills: exists
          ? prev.skills.filter((s) => s.skillId !== skillId)
          : [...prev.skills, { skillId, isRequired: true }],
      }
    })
  }

  const toggleRequired = (skillId: string) => {
    setValues((prev) => ({
      ...prev,
      skills: prev.skills.map((s) =>
        s.skillId === skillId ? { ...s, isRequired: !s.isRequired } : s,
      ),
    }))
  }

  const addRole = () => setValues((prev) => ({ ...prev, roles: [...prev.roles, { roleName: '', quantity: '1' }] }))
  const removeRole = (index: number) =>
    setValues((prev) => ({ ...prev, roles: prev.roles.filter((_, i) => i !== index) }))
  const setRole = (index: number, patch: Partial<{ roleName: string; quantity: string }>) =>
    setValues((prev) => ({
      ...prev,
      roles: prev.roles.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const next = validateProjectForm(values)
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onSubmit(toProjectPayload(values))
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {serverError && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverError}
        </div>
      )}

      <Input
        label="عنوان پروژه"
        value={values.title}
        onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
        error={errors.title}
        placeholder="مثلاً: ساخت فروشگاه اینترنتی"
        required
      />

      <div>
        <label htmlFor="project-description" className="mb-1.5 block text-sm font-medium text-slate-700">
          شرح پروژه <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="project-description"
          rows={5}
          value={values.description}
          onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? 'project-description-error' : undefined}
          placeholder="نیازها، اهداف و محدوده‌ی پروژه را کامل توضیح دهید (حداقل ۲۰ کاراکتر)"
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm leading-6 text-slate-800 placeholder:text-slate-400',
            'transition-colors focus:border-indigo-500',
            errors.description ? 'border-rose-400' : 'border-slate-300',
          )}
        />
        {errors.description && (
          <p id="project-description-error" role="alert" className="mt-1.5 text-xs text-rose-600">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="حداقل بودجه (تومان)"
          type="number"
          min={0}
          step="0.01"
          ltr
          value={values.minBudget}
          onChange={(e) => setValues((p) => ({ ...p, minBudget: e.target.value }))}
          error={errors.minBudget}
          hint="اختیاری — برای ارسال نهایی لازم است"
        />
        <Input
          label="حداکثر بودجه (تومان)"
          type="number"
          min={0}
          step="0.01"
          ltr
          value={values.maxBudget}
          onChange={(e) => setValues((p) => ({ ...p, maxBudget: e.target.value }))}
          error={errors.maxBudget}
          hint="اختیاری — برای ارسال نهایی لازم است"
        />
      </div>

      <Input
        label="مهلت انجام"
        type="date"
        ltr
        value={values.deadline}
        onChange={(e) => setValues((p) => ({ ...p, deadline: e.target.value }))}
        error={errors.deadline}
        hint="اختیاری — برای ارسال نهایی باید در آینده باشد"
      />

      {/* مهارت‌ها */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">
          مهارت‌های موردنیاز <span className="text-xs font-normal text-slate-400">(برای ارسال نهایی حداقل یک مهارت)</span>
        </legend>
        {catalogError && <ErrorState message={catalogError} />}
        {!catalog && !catalogError && <Loading label="در حال دریافت مهارت‌ها…" />}
        {catalog && (
          <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <p className="mb-1.5 text-xs font-semibold text-slate-400">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => {
                    const selected = selectedIds.has(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleSkill(s.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition-colors',
                          selected
                            ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                            : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
                        )}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {errors.skills && (
          <p role="alert" className="mt-1.5 text-xs text-rose-600">
            {errors.skills}
          </p>
        )}

        {/* مهارت‌های انتخاب‌شده + الزامی بودن */}
        {values.skills.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-slate-500">مهارت‌های انتخاب‌شده:</p>
            <ul className="space-y-1.5">
              {values.skills.map((sel) => {
                const skill = catalog?.find((c) => c.id === sel.skillId)
                return (
                  <li key={sel.skillId} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
                    <span className="text-xs text-slate-700">{skill?.name ?? sel.skillId}</span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={sel.isRequired}
                        onChange={() => toggleRequired(sel.skillId)}
                        className="h-3.5 w-3.5 accent-indigo-600"
                      />
                      الزامی
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </fieldset>

      {/* نقش‌ها */}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">
          نقش‌های تیم <span className="text-xs font-normal text-slate-400">(برای ارسال نهایی حداقل یک نقش)</span>
        </legend>
        <div className="space-y-2">
          {values.roles.map((role, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <label className="sr-only" htmlFor={`role-name-${i}`}>
                  نام نقش {i + 1}
                </label>
                <input
                  id={`role-name-${i}`}
                  value={role.roleName}
                  onChange={(e) => setRole(i, { roleName: e.target.value })}
                  placeholder="مثلاً: توسعه‌دهنده‌ی فرانت‌اند"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-indigo-500"
                />
              </div>
              <div className="w-24">
                <label className="sr-only" htmlFor={`role-qty-${i}`}>
                  تعداد نقش {i + 1}
                </label>
                <input
                  id={`role-qty-${i}`}
                  type="number"
                  min={1}
                  max={20}
                  value={role.quantity}
                  onChange={(e) => setRole(i, { quantity: e.target.value })}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-indigo-500"
                  dir="ltr"
                />
              </div>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={() => removeRole(i)}
                aria-label={`حذف نقش ${role.roleName || i + 1}`}
                className="shrink-0"
              >
                حذف
              </Button>
            </div>
          ))}
        </div>
        {errors.roles && (
          <p role="alert" className="mt-1.5 text-xs text-rose-600">
            {errors.roles}
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addRole} className="mt-2">
          + افزودن نقش
        </Button>
        {values.roles.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">
            {values.roles.length} نقش تعریف شده — <Badge variant="neutral">{values.roles.reduce((a, r) => a + (Number(r.quantity) || 0), 0)} نفر تیم</Badge>
          </p>
        )}
      </fieldset>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            {onCancelLabel ?? 'انصراف'}
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
