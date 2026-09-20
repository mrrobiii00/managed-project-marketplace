// ─────────────────────────────────────────────────────────────
// /specialist/profile — پروفایل متخصص (M05 واقعی)
// بخش ۱: مشاهده/ویرایش پروفایل (GET/PUT /profile/me — upsert)
// بخش ۲: مدیریت مهارت‌ها (GET/POST/PUT/DELETE /profile/me/skills)
// مالکیت همیشه از توکن؛ هیچ userId ارسال نمی‌شود.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Loading } from '../../components/ui/Loading'
import { ErrorState } from '../../components/ui/ErrorState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import ReputationCard from '../../components/ratings/ReputationCard'
import { useAuth } from '../../context/AuthContext'
import { profileService } from '../../services/profile.service'
import { skillService, type SkillCatalogItem } from '../../services/skill.service'
import type {
  Availability,
  ProfileDto,
  SkillLevel,
  UserSkillDto,
} from '../../types/profile'
import { ApiError } from '../../types/api'
import { availabilityLabel, skillLevelLabel } from '../../utils/status'
import { cn } from '../../utils/cn'

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'بدون تغییر / نامشخص', disabled: false },
  { value: 'AVAILABLE', label: availabilityLabel('AVAILABLE') },
  { value: 'BUSY', label: availabilityLabel('BUSY') },
  { value: 'UNAVAILABLE', label: availabilityLabel('UNAVAILABLE') },
]

const LEVEL_OPTIONS: Array<{ value: SkillLevel; label: string }> = [
  { value: 'BEGINNER', label: skillLevelLabel('BEGINNER') },
  { value: 'INTERMEDIATE', label: skillLevelLabel('INTERMEDIATE') },
  { value: 'ADVANCED', label: skillLevelLabel('ADVANCED') },
  { value: 'EXPERT', label: skillLevelLabel('EXPERT') },
]

const URL_RE = /^https?:\/\/\S+$/i

// ═══════════════════════ بخش ۱: پروفایل ═══════════════════════

interface ProfileFormState {
  fullName: string
  jobTitle: string
  bio: string
  yearsOfExperience: string
  availability: '' | Availability
  hourlyRate: string
  avatarUrl: string
}

type ProfileErrors = Partial<Record<keyof ProfileFormState, string>>

/** validation آینه‌ی zod بک‌اند M05 — بدون قانون اضافه */
function validateProfile(v: ProfileFormState): ProfileErrors {
  const e: ProfileErrors = {}
  if (v.fullName.trim() !== '' && (v.fullName.trim().length < 2 || v.fullName.trim().length > 100)) {
    e.fullName = 'نام کامل باید بین ۲ تا ۱۰۰ کاراکتر باشد'
  }
  if (v.jobTitle.trim().length > 100) e.jobTitle = 'عنوان شغلی حداکثر ۱۰۰ کاراکتر است'
  if (v.bio.trim().length > 2000) e.bio = 'بیوگرافی حداکثر ۲۰۰۰ کاراکتر است'
  if (v.yearsOfExperience.trim() !== '') {
    const y = Number(v.yearsOfExperience)
    if (!Number.isInteger(y) || y < 0 || y > 60) {
      e.yearsOfExperience = 'سال تجربه باید عدد صحیح بین ۰ تا ۶۰ باشد'
    }
  }
  if (v.hourlyRate.trim() !== '') {
    const r = Number(v.hourlyRate)
    if (Number.isNaN(r) || r < 0) e.hourlyRate = 'نرخ ساعتی نمی‌تواند منفی باشد'
    else if (r > 1_000_000_000) e.hourlyRate = 'نرخ ساعتی واردشده غیرمنطقی است'
    else if (Math.round(r * 100) !== r * 100) e.hourlyRate = 'نرخ ساعتی حداکثر دو رقم اعشار می‌تواند داشته باشد'
  }
  if (v.avatarUrl.trim() !== '' && (!URL_RE.test(v.avatarUrl.trim()) || v.avatarUrl.trim().length > 500)) {
    e.avatarUrl = 'آدرس تصویر باید یک URL معتبر http/https (حداکثر ۵۰۰ کاراکتر) باشد'
  }
  return e
}

function ProfileSection({ profile, onSaved }: { profile: ProfileDto | null; onSaved: (p: ProfileDto) => void }) {
  const [values, setValues] = useState<ProfileFormState>({
    fullName: profile?.fullName ?? '',
    jobTitle: profile?.jobTitle ?? '',
    bio: profile?.bio ?? '',
    yearsOfExperience: profile?.yearsOfExperience?.toString() ?? '',
    availability: profile?.availability ?? '',
    hourlyRate: profile?.hourlyRate ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
  })
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof ProfileFormState>(key: K, val: ProfileFormState[K]) =>
    setValues((p) => ({ ...p, [key]: val }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaved(false)
    const next = validateProfile(values)
    setErrors(next)
    if (Object.keys(next).length > 0) return

    // فقط فیلدهای پرشده ارسال می‌شوند (فیلد خالی = بدون تغییر)
    const years = values.yearsOfExperience.trim()
    const rate = values.hourlyRate.trim()
    const payload = {
      fullName: values.fullName.trim() || undefined,
      jobTitle: values.jobTitle.trim() || undefined,
      bio: values.bio.trim() || undefined,
      yearsOfExperience: years === '' ? undefined : Number(years),
      availability: values.availability === '' ? undefined : values.availability,
      hourlyRate: rate === '' ? undefined : Number(rate),
      avatarUrl: values.avatarUrl.trim() || undefined,
    }

    setSubmitting(true)
    setServerError(null)
    try {
      const updated = await profileService.updateMyProfile(payload)
      onSaved(updated)
      setSaved(true)
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card
      title={profile ? 'ویرایش پروفایل' : 'ساخت پروفایل'}
      description={
        profile
          ? 'فیلدهایی که خالی بگذارید تغییر نمی‌کنند.'
          : 'پروفایل شما هنوز ساخته نشده — با پر کردن این فرم ساخته می‌شود.'
      }
    >
      {serverError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverError}
        </div>
      )}
      {saved && (
        <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          پروفایل با موفقیت ذخیره شد ✓
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="نام کامل"
            value={values.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            error={errors.fullName}
            placeholder="مثلاً: آرش نیک‌اندیش"
          />
          <Input
            label="عنوان شغلی"
            value={values.jobTitle}
            onChange={(e) => set('jobTitle', e.target.value)}
            error={errors.jobTitle}
            placeholder="مثلاً: مهندس ارشد نرم‌افزار"
          />
        </div>

        <div>
          <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-medium text-slate-700">
            معرفی کوتاه (بیوگرافی)
          </label>
          <textarea
            id="profile-bio"
            rows={4}
            value={values.bio}
            onChange={(e) => set('bio', e.target.value)}
            aria-invalid={errors.bio ? true : undefined}
            aria-describedby={errors.bio ? 'profile-bio-error' : undefined}
            placeholder="خلاصه‌ای از تخصص و سابقه‌ی شما (حداکثر ۲۰۰۰ کاراکتر)"
            className={cn(
              'w-full rounded-lg border bg-white px-3 py-2 text-sm leading-6 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500',
              errors.bio ? 'border-rose-400' : 'border-slate-300',
            )}
          />
          {errors.bio && (
            <p id="profile-bio-error" role="alert" className="mt-1.5 text-xs text-rose-600">
              {errors.bio}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="سابقه (سال)"
            type="number"
            min={0}
            max={60}
            step={1}
            ltr
            value={values.yearsOfExperience}
            onChange={(e) => set('yearsOfExperience', e.target.value)}
            error={errors.yearsOfExperience}
          />
          <Select
            label="وضعیت دسترس‌بودگی"
            options={AVAILABILITY_OPTIONS}
            value={values.availability}
            onChange={(e) => set('availability', e.target.value as '' | Availability)}
          />
          <Input
            label="نرخ ساعتی (تومان)"
            type="number"
            min={0}
            step="0.01"
            ltr
            value={values.hourlyRate}
            onChange={(e) => set('hourlyRate', e.target.value)}
            error={errors.hourlyRate}
          />
        </div>

        <Input
          label="آدرس تصویر پروفایل (اختیاری)"
          type="url"
          ltr
          value={values.avatarUrl}
          onChange={(e) => set('avatarUrl', e.target.value)}
          error={errors.avatarUrl}
          placeholder="https://example.com/avatar.jpg"
        />

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" loading={submitting}>
            ذخیره‌ی پروفایل
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ═══════════════════════ بخش ۲: مهارت‌ها ═══════════════════════

function SkillsSection() {
  const [skills, setSkills] = useState<UserSkillDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([])

  // فرم افزودن
  const [search, setSearch] = useState('')
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [newLevel, setNewLevel] = useState<SkillLevel>('INTERMEDIATE')
  const [newYears, setNewYears] = useState('1')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  // ویرایش درجا
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLevel, setEditLevel] = useState<SkillLevel>('BEGINNER')
  const [editYears, setEditYears] = useState('0')
  const [editError, setEditError] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // حذف
  const [deleting, setDeleting] = useState<UserSkillDto | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  const loadSkills = useCallback(async () => {
    setSkills(null)
    setError(null)
    try {
      setSkills(await profileService.getMySkills())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    }
  }, [])

  useEffect(() => {
    void loadSkills()
    skillService
      .getSkills()
      .then(setCatalog)
      .catch(() => setCatalog([]))
  }, [loadSkills])

  const ownedIds = useMemo(() => new Set((skills ?? []).map((s) => s.skillId)), [skills])

  // گزینه‌های افزودن: فیلتر جست‌وجو + حذف مهارت‌های موجود
  const addable = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (catalog ?? [])
      .filter((s) => s && !ownedIds.has(s.id))
      .filter((s) => q === '' || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
  }, [catalog, ownedIds, search])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof addable>()
    for (const s of addable) {
      const list = map.get(s.category) ?? []
      list.push(s)
      map.set(s.category, list)
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [addable])

  const handleAdd = async () => {
    if (!selectedSkillId) {
      setAddError('ابتدا یک مهارت انتخاب کنید')
      return
    }
    const years = Number(newYears)
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      setAddError('سال تجربه باید عدد صحیح بین ۰ تا ۶۰ باشد')
      return
    }
    setAdding(true)
    setAddError(null)
    try {
      await profileService.addMySkill({ skillId: selectedSkillId, level: newLevel, yearsOfExperience: years })
      setSelectedSkillId('')
      setNewYears('1')
      await loadSkills()
    } catch (err) {
      // 409 تکراری / 404 مهارت ناموجود — پیام فارسی سرور
      setAddError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (s: UserSkillDto) => {
    setEditingId(s.skillId)
    setEditLevel(s.level)
    setEditYears(String(s.yearsOfExperience))
    setEditError(null)
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    const years = Number(editYears)
    if (!Number.isInteger(years) || years < 0 || years > 60) {
      setEditError('سال تجربه باید عدد صحیح بین ۰ تا ۶۰ باشد')
      return
    }
    setSavingEdit(true)
    setEditError(null)
    try {
      await profileService.updateMySkill(editingId, { level: editLevel, yearsOfExperience: years })
      setEditingId(null)
      await loadSkills()
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    setDeleteError(null)
    try {
      await profileService.deleteMySkill(deleting.skillId)
      setDeleting(null)
      await loadSkills()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      setDeleting(null)
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <Card
      title={`مهارت‌های من (${(skills ?? []).length.toLocaleString('fa-IR')})`}
      description="این مهارت‌ها ورودی موتور تطبیق هستند — سطح و سابقه را به‌روز نگه دارید."
    >
      {deleteError && (
        <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {deleteError}
        </div>
      )}

      {skills === null && !error && <Loading label="در حال دریافت مهارت‌ها…" />}
      {error && <ErrorState message={error} onRetry={() => void loadSkills()} />}

      {skills !== null && skills.length === 0 && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
          هنوز مهارتی ثبت نکرده‌اید — از فرم زیر اولین مهارت خود را اضافه کنید.
        </p>
      )}

      {skills !== null && skills.length > 0 && (
        <ul className="divide-y divide-slate-50">
          {skills.map((s) => (
            <li key={s.skillId} className="py-3">
              {editingId === s.skillId ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        label={`سطح (${s.skill.name})`}
                        options={LEVEL_OPTIONS}
                        value={editLevel}
                        onChange={(e) => setEditLevel(e.target.value as SkillLevel)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        label="سال تجربه"
                        type="number"
                        min={0}
                        max={60}
                        step={1}
                        ltr
                        value={editYears}
                        onChange={(e) => setEditYears(e.target.value)}
                      />
                    </div>
                    <Button size="sm" onClick={() => void handleSaveEdit()} loading={savingEdit}>
                      ذخیره
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} disabled={savingEdit}>
                      لغو
                    </Button>
                  </div>
                  {editError && (
                    <p role="alert" className="text-xs text-rose-600">
                      {editError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{s.skill.name}</span>
                    <Badge variant="neutral">{s.skill.category}</Badge>
                    <Badge variant="primary">{skillLevelLabel(s.level)}</Badge>
                    <span className="text-xs text-slate-500">
                      {s.yearsOfExperience.toLocaleString('fa-IR')} سال تجربه
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => startEdit(s)}>
                      ویرایش
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleting(s)}>
                      حذف
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* افزودن مهارت از کاتالوگ واقعی */}
      <fieldset className="mt-5 border-t border-slate-100 pt-4">
        <legend className="mb-3 text-sm font-semibold text-slate-700">افزودن مهارت جدید</legend>

        <div className="space-y-3">
          <Input
            label="جست‌وجوی مهارت"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام یا دسته‌ی مهارت…"
          />

          {catalog.length === 0 && <p className="text-xs text-slate-400">کاتالوگ مهارت‌ها در دسترس نیست.</p>}

          {catalog.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs text-slate-500">
                انتخاب مهارت (مهارت‌های ثبت‌شده‌ی شما نمایش داده نمی‌شوند):
              </p>
              <div className="max-h-44 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
                {grouped.length === 0 && (
                  <p className="text-xs text-slate-400">مهارت جدیدی برای افزودن وجود ندارد.</p>
                )}
                {grouped.map(([category, items]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-xs font-semibold text-slate-400">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          aria-pressed={selectedSkillId === s.id}
                          onClick={() => setSelectedSkillId(s.id)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs transition-colors',
                            selectedSkillId === s.id
                              ? 'border-indigo-600 bg-indigo-50 font-medium text-indigo-700'
                              : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400',
                          )}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Select
              label="سطح مهارت"
              options={LEVEL_OPTIONS}
              value={newLevel}
              onChange={(e) => setNewLevel(e.target.value as SkillLevel)}
            />
            <Input
              label="سال تجربه"
              type="number"
              min={0}
              max={60}
              step={1}
              ltr
              value={newYears}
              onChange={(e) => setNewYears(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={() => void handleAdd()} loading={adding} block>
                افزودن به پروفایل
              </Button>
            </div>
          </div>

          {addError && (
            <p role="alert" className="text-xs text-rose-600">
              {addError}
            </p>
          )}
        </div>
      </fieldset>

      <ConfirmDialog
        open={deleting !== null}
        title="حذف مهارت"
        message={`آیا از حذف مهارت «${deleting?.skill.name ?? ''}» از پروفایل خود مطمئن هستید؟`}
        confirmLabel="بله، حذف کن"
        danger
        loading={deletingBusy}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  )
}

// ═══════════════════════ صفحه ═══════════════════════

export default function SpecialistProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<ProfileDto | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [notCreated, setNotCreated] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    setProfileError(null)
    setNotCreated(false)
    try {
      setProfile(await profileService.getMyProfile())
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotCreated(true) // هنوز ساخته نشده — با فرم ساخته می‌شود (upsert)
      } else {
        setProfileError(err instanceof ApiError ? err.message : 'خطای غیرمنتظره‌ای رخ داد')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-slate-800">پروفایل من</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          این اطلاعات مبنای تطبیق پروژه‌ها با شماست.
        </p>
      </div>

      {loading && (
        <Card>
          <Loading label="در حال دریافت پروفایل…" />
        </Card>
      )}
      {profileError && (
        <Card>
          <ErrorState message={profileError} onRetry={() => void loadProfile()} />
        </Card>
      )}

      {!loading && !profileError && (profile || notCreated) && (
        <>
          {profile && (
            <Card title="نمای فعلی پروفایل">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">نام کامل</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-800">{profile.fullName ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">عنوان شغلی</dt>
                  <dd className="mt-1 text-sm text-slate-700">{profile.jobTitle ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">وضعیت دسترس‌بودگی</dt>
                  <dd className="mt-1">
                    {profile.availability ? (
                      <Badge variant={profile.availability === 'AVAILABLE' ? 'success' : 'warning'}>
                        {availabilityLabel(profile.availability)}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">سابقه</dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {profile.yearsOfExperience === null ? '—' : `${profile.yearsOfExperience.toLocaleString('fa-IR')} سال`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">نرخ ساعتی (تومان)</dt>
                  <dd className="mt-1 text-sm text-slate-700" dir="ltr">
                    {profile.hourlyRate === null ? '—' : Number(profile.hourlyRate).toLocaleString('fa-IR')}
                  </dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-1">
                  <dt className="text-xs text-slate-500">بیوگرافی</dt>
                  <dd className="mt-1 line-clamp-2 text-sm text-slate-700">{profile.bio ?? '—'}</dd>
                </div>
              </dl>
            </Card>
          )}

          <ProfileSection profile={profile} onSaved={setProfile} />
          {/* اعتبار واقعی از M10 — با user id همان متخصصِ لاگین‌شده */}
          {user && <ReputationCard userId={user.id} />}
          <SkillsSection />
        </>
      )}
    </div>
  )
}
