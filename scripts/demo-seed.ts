// ─────────────────────────────────────────────────────────────
// Demo Seed — مایل‌استون 16 (دموی دانشگاهی)
//
// اصول:
//  • Idempotent: اجرای دوم هیچ duplicate نمی‌سازد (کلیدهای طبیعی:
//    email برای کاربران، clientId+title برای پروژه‌ها، title برای
//    تسک‌ها، unique(project,from,to) برای rating و ...).
//  • Workflow واقعی: پروژه‌ها از همان API واقعی عبور می‌کنند
//    (create → submit → matching → review → team → start → tasks →
//    complete → ratings) — هیچ match score / lifecycle جعلی نیست.
//  • ایمن برای داده‌ی موجود: هیچ deleteMany/reset انجام نمی‌شود؛
//    فقط رکوردهای دمو create می‌شوند (cleanup جدا: db:seed:demo:clean).
//  • UUID ثابت فقط برای ۴ کاربر دمو (ساخت مستقیم با Argon2id).
//
// نکته‌ی موتور تطبیق (M07 — source of truth):
//  • عضو تیم باید match غیرردشده داشته باشد → همه‌ی مهارت‌های
//    «الزامی» پروژه را باید داشته باشد (hard filter) و امتیاز ≥ ۷۰.
//  • برای همین مهارت‌های دمو fullstack-realistic انتخاب شده‌اند.
//  • Project B بعد از تکمیل C و ثبت ratingها matching می‌شود تا
//    پیشنهاد RECOMMENDED واقعی (با تاریخچه‌ی trust) ساخته شود.
//
// پیش‌نیازها: migrations اعمال شده + skills seed شده (npm run db:seed)
//            و سرور روی :4000 در حال اجرا باشد.
// اجرا: npm run db:seed:demo
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()
const BASE = process.env.DEMO_API_BASE ?? 'http://127.0.0.1:4000/api/v1'
const DEMO_PASSWORD = 'Demo12345!' // فقط credential دمو — مستند در docs/demo.md

// ── شناسه‌های ثابت دمو (فقط برای ساخت اولیه؛ اگر کاربر از قبل با این
//    ایمیل موجود باشد، id واقعی همان رکورد استفاده می‌شود) ──
const DEMO_IDS = {
  client: '00000000-0000-4000-8000-0000000000c1',
  frontend: '00000000-0000-4000-8000-0000000000f1',
  backend: '00000000-0000-4000-8000-0000000000b1',
  admin: '00000000-0000-4000-8000-0000000000a1',
} as const

// ── شمارنده‌ی گزارش (§14) ──
const report = { created: 0, skipped: 0 }
const bump = (ok: boolean, label: string): void => {
  if (ok) report.created++
  else report.skipped++
  console.log(`${ok ? '  + ایجاد' : '  · موجود'}: ${label}`)
}

// ── فراخوانی API با envelope استاندارد ──
class ApiFail extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}: ${JSON.stringify(body).slice(0, 300)}`)
  }
}

async function api<T>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean
    data?: T
    message?: string
  }
  if (!res.ok || json.success === false) {
    throw new ApiFail(res.status, json.message ?? json)
  }
  return json.data as T
}

async function login(email: string): Promise<string> {
  const d = await api<{ token: string }>('POST', '/auth/login', undefined, {
    email,
    password: DEMO_PASSWORD,
  })
  return d.token
}

// ── فاز ۱: کاربران دمو (Prisma + Argon2id — مثل auth.service) ──
interface DemoUser {
  key: keyof typeof DEMO_IDS
  email: string
  role: 'CLIENT' | 'SPECIALIST' | 'ADMIN'
}

const DEMO_USERS: DemoUser[] = [
  { key: 'client', email: 'demo.client@example.com', role: 'CLIENT' },
  { key: 'frontend', email: 'demo.frontend@example.com', role: 'SPECIALIST' },
  { key: 'backend', email: 'demo.backend@example.com', role: 'SPECIALIST' },
  { key: 'admin', email: 'demo.admin@example.com', role: 'ADMIN' },
]

async function seedUsers(): Promise<Record<string, string>> {
  console.log('── کاربران دمو ──')
  const ids: Record<string, string> = {}
  const hash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id })
  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } })
    if (existing) {
      ids[u.key] = existing.id // id واقعی رکورد موجود — هرگز overwrite نمی‌شود
      bump(false, `${u.email} (${u.role})`)
    } else {
      const created = await prisma.user.create({
        data: { id: DEMO_IDS[u.key], email: u.email, passwordHash: hash, role: u.role },
      })
      ids[u.key] = created.id
      bump(true, `${u.email} (${u.role})`)
    }
  }
  return ids
}

// ── فاز ۲: پروفایل‌ها و مهارت‌ها (API واقعی — idempotent) ──
async function seedProfiles(
  tokens: Record<string, string>,
  ids: Record<string, string>,
): Promise<void> {
  console.log('── پروفایل‌ها ──')
  const profiles: Array<[string, Record<string, unknown>]> = [
    ['client', { fullName: 'کارفرمای دمو', jobTitle: 'مدیر محصول', availability: 'AVAILABLE' }],
    ['frontend', { fullName: 'متخصص فرانت‌اند دمو', jobTitle: 'Frontend Developer', availability: 'AVAILABLE', yearsOfExperience: 9 }],
    ['backend', { fullName: 'متخصص بک‌اند دمو', jobTitle: 'Backend Developer', availability: 'AVAILABLE', yearsOfExperience: 9 }],
    ['admin', { fullName: 'مدیر دمو', jobTitle: 'مدیر پلتفرم' }],
  ]
  for (const [key, body] of profiles) {
    const before = await prisma.profile.findUnique({ where: { userId: ids[key] } })
    await api('PUT', '/profile/me', tokens[key], body)
    bump(before === null, `پروفایل ${key}`)
  }

  console.log('── مهارت‌های متخصصان (از catalog موجود — hard filter موتور M07) ──')
  // هر دو متخصص باید همه‌ی مهارت‌های الزامی پروژه‌های دمو را داشته باشند
  // (React + TypeScript + Node.js) و امتیاز ≥ ۷۰ بگیرند.
  const wanted: Record<string, Array<{ name: string; level: 'ADVANCED' | 'EXPERT'; years: number }>> = {
    frontend: [
      { name: 'React', level: 'EXPERT', years: 6 },
      { name: 'TypeScript', level: 'EXPERT', years: 5 },
      { name: 'JavaScript', level: 'EXPERT', years: 8 },
      { name: 'Node.js', level: 'EXPERT', years: 4 },
    ],
    backend: [
      { name: 'Node.js', level: 'EXPERT', years: 7 },
      { name: 'TypeScript', level: 'EXPERT', years: 5 },
      { name: 'Express', level: 'EXPERT', years: 6 },
      { name: 'PostgreSQL', level: 'EXPERT', years: 8 },
      { name: 'React', level: 'ADVANCED', years: 4 },
      { name: 'Git', level: 'ADVANCED', years: 5 },
    ],
  }
  for (const key of ['frontend', 'backend'] as const) {
    const mine = await api<{ items: Array<{ skill: { id: string; name: string } }> }>(
      'GET',
      '/profile/me/skills',
      tokens[key],
    )
    const have = new Map(mine.items.map((s) => [s.skill.name, s]))
    for (const w of wanted[key]) {
      const existing = have.get(w.name)
      if (existing) {
        bump(false, `${key}: ${w.name}`)
        continue
      }
      const skill = await prisma.skill.findUnique({ where: { name: w.name } })
      if (!skill) throw new Error(`مهارت «${w.name}» در catalog موجود نیست — npm run db:seed را اجرا کنید`)
      await api('POST', '/profile/me/skills', tokens[key], {
        skillId: skill.id,
        level: w.level,
        yearsOfExperience: w.years,
      })
      bump(true, `${key}: ${w.name} (${w.level})`)
    }
  }
}

// ── فاز ۳: پروژه‌ها — کل lifecycle از API واقعی ──
interface ProjectShape {
  id: string
  title: string
  status: string
}

async function findProject(title: string, tokens: Record<string, string>): Promise<ProjectShape | null> {
  const list = await api<{ items: ProjectShape[] }>(
    'GET',
    '/projects/me?page=1&pageSize=100',
    tokens.client,
  )
  return list.items.find((p) => p.title === title) ?? null
}

async function skillIds(names: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const n of names) {
    const s = await prisma.skill.findUnique({ where: { name: n } })
    if (!s) throw new Error(`مهارت «${n}» در catalog موجود نیست`)
    out[n] = s.id
  }
  return out
}

async function ensureProject(
  title: string,
  tokens: Record<string, string>,
  payload: Record<string, unknown>,
): Promise<ProjectShape> {
  const existing = await findProject(title, tokens)
  if (existing) {
    bump(false, `پروژه «${title}» (${existing.status})`)
    return existing
  }
  const created = await api<ProjectShape>('POST', '/projects', tokens.client, payload)
  bump(true, `پروژه «${title}» (DRAFT)`)
  return created
}

async function getProject(id: string, token: string): Promise<ProjectShape> {
  return api<ProjectShape>('GET', `/projects/${id}`, token)
}

/** چرخه‌ی lifecycle را فقط تا جایی که لازم است جلو می‌برد (idempotent) */
async function advance(
  projectId: string,
  tokens: Record<string, string>,
  steps: Array<{ when: string; action: string; do: () => Promise<void>; log: string }>,
): Promise<ProjectShape> {
  let p = await getProject(projectId, tokens.client)
  for (const s of steps) {
    if (p.status !== s.when) continue
    await s.do()
    const before = p.status
    p = await getProject(projectId, tokens.client)
    console.log(`  · ${s.log}: ${before} → ${p.status}`)
  }
  return p
}

async function teamExists(projectId: string, adminToken: string): Promise<boolean> {
  const res = await fetch(`${BASE}/projects/${projectId}/team`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  return res.ok
}

async function ensureTeam(
  projectId: string,
  tokens: Record<string, string>,
  ids: Record<string, string>,
  label: string,
): Promise<void> {
  if (await teamExists(projectId, tokens.admin)) {
    bump(false, `تیم ${label}`)
    return
  }
  await api('POST', `/admin/projects/${projectId}/team`, tokens.admin, {
    name: `تیم ${label}`,
    members: [
      { specialistId: ids.frontend, role: 'Frontend Developer' },
      { specialistId: ids.backend, role: 'Backend Developer' },
    ],
  })
  bump(true, `تیم ${label} (۲ عضو)`)
}

interface TaskShape {
  id: string
  title: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
}

async function ensureTask(
  projectId: string,
  title: string,
  assignedTo: string | null,
  targetStatus: 'TODO' | 'IN_PROGRESS' | 'DONE',
  tokens: Record<string, string>,
): Promise<void> {
  const list = await api<{ items: TaskShape[] }>(
    'GET',
    `/projects/${projectId}/tasks?page=1&pageSize=100`,
    tokens.client,
  )
  let task = list.items.find((t) => t.title === title)
  if (!task) {
    task = await api<TaskShape>('POST', `/projects/${projectId}/tasks`, tokens.client, {
      title,
      priority: 'HIGH',
      ...(assignedTo ? { assignedTo } : {}),
    })
    bump(true, `تسک «${title}»`)
  } else {
    bump(false, `تسک «${title}» (${task.status})`)
  }
  // انتقال تا وضعیت هدف — فقط با ترتیب مجاز (admin از API واقعی)
  const seq: Array<'TODO' | 'IN_PROGRESS' | 'DONE'> = ['TODO', 'IN_PROGRESS', 'DONE']
  while (task.status !== targetStatus && seq.indexOf(task.status) < seq.indexOf(targetStatus)) {
    const next = seq[seq.indexOf(task.status) + 1]
    task = await api<TaskShape>('PUT', `/projects/${projectId}/tasks/${task.id}`, tokens.admin, {
      status: next,
    })
    console.log(`  · تسک «${title}»: → ${task.status}`)
  }
}

async function ensureRating(
  projectId: string,
  fromToken: string,
  toUserId: string,
  score: number,
  review: string,
): Promise<void> {
  try {
    await api('POST', `/projects/${projectId}/ratings`, fromToken, { toUserId, score, review })
    bump(true, `rating ${score}★`)
  } catch (e) {
    if (e instanceof ApiFail && e.status === 409) {
      bump(false, `rating ${score}★ (قبلاً ثبت شده)`)
      return
    }
    throw e
  }
}

async function main(): Promise<void> {
  console.log('🌱 Demo Seed — Milestone 16')
  console.log(`   API: ${BASE}`)

  // سلامت سرور و مهارت‌ها
  await fetch(BASE.replace('/api/v1', '') + '/health')
  const skillCount = await prisma.skill.count()
  if (skillCount === 0) throw new Error('catalog مهارت‌ها خالی است — ابتدا npm run db:seed')

  // فاز ۱: کاربران
  const ids = await seedUsers()

  // فاز ۲: login + پروفایل + مهارت
  console.log('── ورود دمو ──')
  const tokens: Record<string, string> = {
    client: await login('demo.client@example.com'),
    frontend: await login('demo.frontend@example.com'),
    backend: await login('demo.backend@example.com'),
    admin: await login('demo.admin@example.com'),
  }
  console.log('  · ورود هر ۴ حساب دمو موفق')
  await seedProfiles(tokens, ids)

  const sk = await skillIds(['React', 'TypeScript', 'Node.js'])

  // ═ Project A — Main Demo: چرخه‌ی کامل تا IN_PROGRESS ═
  console.log('── Project A: فروشگاه اینترنتی (تا IN_PROGRESS با تیم و تسک‌های متنوع) ──')
  const pa = await ensureProject('طراحی و توسعه فروشگاه اینترنتی', tokens, {
    title: 'طراحی و توسعه فروشگاه اینترنتی',
    description:
      'طراحی و توسعه‌ی کامل فروشگاه اینترنتی شامل رابط کاربری React و TypeScript، احراز هویت کاربران، مدیریت محصولات و سفارش‌ها و API بک‌اند با Node.js.',
    minBudget: 80_000_000,
    maxBudget: 150_000_000,
    deadline: '2027-03-01',
    skills: [
      { skillId: sk['React'], isRequired: true },
      { skillId: sk['TypeScript'], isRequired: true },
      { skillId: sk['Node.js'], isRequired: true },
    ],
    roles: [
      { roleName: 'Frontend Developer', quantity: 1 },
      { roleName: 'Backend Developer', quantity: 1 },
    ],
  })
  {
    const a = await advance(pa.id, tokens, [
      { when: 'DRAFT', action: 'submit', do: () => api('POST', `/projects/${pa.id}/submit`, tokens.client), log: 'submit' },
      { when: 'SUBMITTED', action: 'matching', do: () => api('POST', `/projects/${pa.id}/matching`, tokens.client), log: 'matching واقعی (موتور M07)' },
      { when: 'MATCHING', action: 'review', do: () => api('POST', `/admin/projects/${pa.id}/review`, tokens.admin), log: 'review (admin)' },
    ])
    if (a.status === 'REVIEW') {
      await ensureTeam(pa.id, tokens, ids, 'فروشگاه اینترنتی')
      const t = await advance(pa.id, tokens, [
        { when: 'TEAM_PROPOSED', action: 'start', do: () => api('POST', `/admin/projects/${pa.id}/start`, tokens.admin), log: 'start (admin)' },
      ])
      if (t.status !== 'IN_PROGRESS') throw new Error(`Project A: وضعیت غیرمنتظره ${t.status}`)
    }
    const a2 = await getProject(pa.id, tokens.client)
    if (a2.status === 'IN_PROGRESS') {
      await ensureTask(pa.id, 'پیاده‌سازی رابط کاربری فروشگاه', ids.frontend, 'IN_PROGRESS', tokens)
      await ensureTask(pa.id, 'توسعه‌ی API محصولات و سفارش‌ها', ids.backend, 'DONE', tokens)
      await ensureTask(pa.id, 'طراحی و مستندسازی تست‌های پذیرش', null, 'TODO', tokens)
    }
  }

  // ═ Project C — Completed Demo (قبل از B تا تاریخچه‌ی trust ساخته شود) ═
  console.log('── Project C: وب‌سایت آموزش برنامه‌نویسی (تا COMPLETED + ارزیابی) ──')
  const pc = await ensureProject('طراحی وب‌سایت آموزش برنامه‌نویسی', tokens, {
    title: 'طراحی وب‌سایت آموزش برنامه‌نویسی',
    description:
      'طراحی و توسعه‌ی وب‌سایت آموزش برنامه‌نویسی با پنل مدیریت دوره‌ها، ثبت‌نام کاربران و پخش ویدیو؛ فرانت‌اند React و بک‌اند Node.js.',
    minBudget: 50_000_000,
    maxBudget: 90_000_000,
    deadline: '2027-01-15',
    skills: [
      { skillId: sk['React'], isRequired: true },
      { skillId: sk['Node.js'], isRequired: true },
    ],
    roles: [
      { roleName: 'Frontend Developer', quantity: 1 },
      { roleName: 'Backend Developer', quantity: 1 },
    ],
  })
  {
    const c = await advance(pc.id, tokens, [
      { when: 'DRAFT', action: 'submit', do: () => api('POST', `/projects/${pc.id}/submit`, tokens.client), log: 'submit' },
      { when: 'SUBMITTED', action: 'matching', do: () => api('POST', `/projects/${pc.id}/matching`, tokens.client), log: 'matching واقعی (موتور M07)' },
      { when: 'MATCHING', action: 'review', do: () => api('POST', `/admin/projects/${pc.id}/review`, tokens.admin), log: 'review (admin)' },
    ])
    if (c.status === 'REVIEW') {
      await ensureTeam(pc.id, tokens, ids, 'وب‌سایت آموزشی')
      await advance(pc.id, tokens, [
        { when: 'TEAM_PROPOSED', action: 'start', do: () => api('POST', `/admin/projects/${pc.id}/start`, tokens.admin), log: 'start (admin)' },
      ])
    }
    const c2 = await getProject(pc.id, tokens.client)
    if (c2.status === 'IN_PROGRESS') {
      await ensureTask(pc.id, 'پیاده‌سازی صفحه‌ی دوره‌ها و پخش ویدیو', ids.frontend, 'DONE', tokens)
      await ensureTask(pc.id, 'توسعه‌ی API دوره‌ها و ثبت‌نام', ids.backend, 'DONE', tokens)
      await advance(pc.id, tokens, [
        { when: 'IN_PROGRESS', action: 'complete', do: () => api('POST', `/admin/projects/${pc.id}/complete`, tokens.admin), log: 'complete (admin)' },
      ])
    }
    const c3 = await getProject(pc.id, tokens.client)
    if (c3.status === 'COMPLETED') {
      console.log('  ── ارزیابی‌ها (با قواعد واقعی M10) ──')
      await ensureRating(pc.id, tokens.client, ids.frontend, 5, 'هماهنگی عالی و تحویل به‌موقع رابط کاربری')
      await ensureRating(pc.id, tokens.client, ids.backend, 4, 'کیفیت خوب؛ تأخیر جزئی در یکی از مراحل')
      await ensureRating(pc.id, tokens.frontend, ids.client, 4, 'نیازمندی‌های شفاف و پاسخ‌گویی خوب')
      await ensureRating(pc.id, tokens.backend, ids.client, 5, 'مدیریت منظم پروژه و بازخورد سریع')
    } else if (c3.status !== 'RATED') {
      console.log(`  · وضعیت: ${c3.status} — ارزیابی فقط در COMPLETED`)
    }
  }

  // ═ Project B — Recommendation Demo (بعد از C: تاریخچه‌ی trust → RECOMMENDED واقعی) ═
  console.log('── Project B: اپلیکیشن مدیریت تیم ریموت (پیشنهادها) ──')
  const pb = await ensureProject('اپلیکیشن مدیریت تیم ریموت', tokens, {
    title: 'اپلیکیشن مدیریت تیم ریموت',
    description:
      'اپلیکیشن وب برای مدیریت تیم‌های دورکار با داشبورد فعالیت اعضا، تقویم مشترک و گزارش پیشرفت پروژه‌ها؛ فرانت‌اند React و TypeScript.',
    minBudget: 40_000_000,
    maxBudget: 70_000_000,
    deadline: '2027-06-01',
    skills: [
      { skillId: sk['React'], isRequired: true },
      { skillId: sk['TypeScript'], isRequired: true },
    ],
    roles: [{ roleName: 'Frontend Developer', quantity: 1 }],
  })
  {
    // چرخه تا MATCHING — پیشنهادها برای متخصصان فعال می‌ماند
    await advance(pb.id, tokens, [
      { when: 'DRAFT', action: 'submit', do: () => api('POST', `/projects/${pb.id}/submit`, tokens.client), log: 'submit' },
      { when: 'SUBMITTED', action: 'matching', do: () => api('POST', `/projects/${pb.id}/matching`, tokens.client), log: 'matching واقعی (موتور M07) — پیشنهادها فعال' },
    ])
    const b = await getProject(pb.id, tokens.client)
    console.log(`  · وضعیت نهایی: ${b.status} (پیشنهادها از طریق API قابل مشاهده‌اند)`)
  }

  // ── خلاصه‌ی نهایی ──
  console.log('── خلاصه ──')
  const demoProjectIds = (
    await prisma.project.findMany({ where: { clientId: ids.client }, select: { id: true } })
  ).map((p) => p.id)
  const counts = {
    پروژه: demoProjectIds.length,
    matches: await prisma.match.count({ where: { projectId: { in: demoProjectIds } } }),
    تیم: await prisma.team.count({ where: { projectId: { in: demoProjectIds } } }),
    اعضای_تیم: await prisma.teamMember.count({ where: { team: { projectId: { in: demoProjectIds } } } }),
    تسک: await prisma.task.count({ where: { projectId: { in: demoProjectIds } } }),
    ارزیابی: await prisma.rating.count({ where: { projectId: { in: demoProjectIds } } }),
  }
  console.log(`   ایجادشده در این اجرا: ${report.created} | موجود (skip): ${report.skipped}`)
  console.log(`   داده‌ی دمو — ${Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' | ')}`)
  console.log('✅ Demo Seed تمام شد.')
}

main()
  .catch((e) => {
    console.error('❌ Demo Seed شکست خورد:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
