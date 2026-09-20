import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { Pagination } from '../../utils/pagination'
import { toSkipTake } from '../../utils/pagination'
import type { CreateTeamInput, UpdateTeamInput } from './admin.schema'
import type {
  DashboardSummaryDto,
  MatchSummaryDto,
  DashboardProjectItemDto,
} from './admin.types'

// ─────────────────────────────────────────────────────────────
// منطق Admin: Review / Match Decision / Team Formation
//
// قواعد کلیدی:
//  • تمام مسیرها فقط ADMIN (در router-level اعمال می‌شود)
//  • MATCHING → REVIEW اتمیک
//  • APPROVE هیچ Team Member نمی‌سازد؛ عضویت فقط از طریق POST team
//  • Team فقط در REVIEW ساخته می‌شود → REVIEW → TEAM_PROPOSED اتمیک
//  • ویرایش تیم فقط در PROPOSED؛ محاسبه‌ی teamScore با میانگین صحیح سنت‌ها
// ─────────────────────────────────────────────────────────────

/** میانگین امتیازهای match با ریاضی صحیح (سنت) — deterministic، مثال: 88.5,77.5,90 → 85.33 */
function averageScoreCents(scores: Prisma.Decimal[]): number {
  const cents = scores.map((s) => Math.round(Number(s) * 100))
  const sum = cents.reduce((a, b) => a + b, 0)
  return Math.round(sum / cents.length) // سنتِ میانگین
}

async function getProjectOr404(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, status: true },
  })
  if (!project) throw new HttpError(404, 'پروژه موردنظر یافت نشد')
  return project
}

// ────────────────── MATCHING → REVIEW ──────────────────

export async function moveProjectToReview(projectId: string) {
  await getProjectOr404(projectId)
  const moved = await prisma.project.updateMany({
    where: { id: projectId, status: 'MATCHING' },
    data: { status: 'REVIEW' },
  })
  if (moved.count === 0) {
    throw new HttpError(409, 'ورود به مرحله‌ی بررسی فقط از وضعیت MATCHING مجاز است')
  }
  return prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, status: true },
  })
}

// ────────────────── Match Decision ──────────────────

/**
 * تصمیم مدیریتی روی یک Match:
 *  • APPROVE → وضعیت RECOMMENDED/NEEDS_REVIEW «حفظ» می‌شود (Schema فیلد جدا ندارد —
 *    تصمیم مدیریتی از طریق Team Membership مشخص می‌شود؛ مستند). ردِ‌شده → 409.
 *  • REJECT  → وضعیت REJECTED؛ اگر قبلاً REJECTED بود → 409.
 * تصمیم‌ها فقط در وضعیت MATCHING یا REVIEW پروژه مجازند (پس از TEAM_PROPOSED قفل).
 */
export async function decideMatch(projectId: string, specialistId: string, decision: 'APPROVE' | 'REJECT') {
  const project = await getProjectOr404(projectId)
  if (project.status !== 'MATCHING' && project.status !== 'REVIEW') {
    throw new HttpError(409, `تصمیم‌گیری روی تطبیق فقط در وضعیت MATCHING یا REVIEW مجاز است (وضعیت فعلی: ${project.status})`)
  }

  const match = await prisma.match.findUnique({
    where: { projectId_specialistId: { projectId, specialistId } },
  })
  if (!match) throw new HttpError(404, 'تطبیق موردنظر برای این پروژه یافت نشد')

  if (decision === 'APPROVE') {
    if (match.status === 'REJECTED') {
      throw new HttpError(409, 'تطبیق قبلاً رد شده است و قابل تأیید نیست')
    }
    // تأیید ضمنی: وضعیت نگه داشته می‌شود (RECOMMENDED/NEEDS_REVIEW)
    return { match, changed: false, note: 'تأیید شد — عضویت فقط از طریق تشکیل تیم ایجاد می‌شود' }
  }

  // REJECT
  if (match.status === 'REJECTED') {
    throw new HttpError(409, 'این تطبیق قبلاً رد شده است')
  }
  const updated = await prisma.match.update({
    where: { projectId_specialistId: { projectId, specialistId } },
    data: { status: 'REJECTED' },
  })
  return { match: updated, changed: true, note: 'تطبیق رد شد' }
}

// ────────────────── TEAM_PROPOSED → IN_PROGRESS ──────────────────

/**
 * شروع اجرای پروژه (فقط ADMIN) — تصمیم رسمی lifecycle (M10 Hotfix):
 *   • وضعیت باید TEAM_PROPOSED باشد
 *   • تیم باید وجود داشته باشد و حداقل یک عضو داشته باشد
 *   • در «یک» transaction: Project → IN_PROGRESS و Team → ACTIVE
 *     (اگر یکی fail شود، دیگری هم rollback می‌شود — هیچ وضعیت ناقصی نمی‌ماند)
 *   • transition با updateMany شرطی اتمیک است (مقاوم به race)
 */
export async function startProjectExecution(projectId: string) {
  const project = await getProjectOr404(projectId)
  if (project.status !== 'TEAM_PROPOSED') {
    throw new HttpError(
      409,
      `شروع اجرا فقط از وضعیت TEAM_PROPOSED مجاز است (وضعیت فعلی: ${project.status})`,
      'PROJECT_NOT_TEAM_PROPOSED',
    )
  }

  const team = await prisma.team.findUnique({
    where: { projectId },
    select: { id: true, _count: { select: { members: true } } },
  })
  if (!team) {
    throw new HttpError(409, 'تیمی برای این پروژه ثبت نشده است', 'TEAM_NOT_FOUND')
  }
  if (team._count.members === 0) {
    throw new HttpError(409, 'تیم پروژه حداقل باید یک عضو داشته باشد', 'TEAM_EMPTY')
  }

  // transition اتمیک — اگر هم‌زمان وضعیت عوض شده باشد count=0 → 409 بدون تغییر
  // (M10: تیم هم در همین transaction فعال می‌شود تا در Complete وضعیت منطقی باشد)
  const teamId = await prisma.$transaction(async (tx) => {
    const moved = await tx.project.updateMany({
      where: { id: projectId, status: 'TEAM_PROPOSED' },
      data: { status: 'IN_PROGRESS' },
    })
    if (moved.count === 0) {
      throw new HttpError(409, 'وضعیت پروژه هم‌زمان تغییر کرده است', 'PROJECT_NOT_TEAM_PROPOSED')
    }
    // تیمِ همین پروژه → ACTIVE (در صورت PROPOSED بودن)
    const teamActivated = await tx.team.updateMany({
      where: { projectId, status: 'PROPOSED' },
      data: { status: 'ACTIVE' },
    })
    if (teamActivated.count === 0) {
      const teamStatus = await tx.team.findUnique({ where: { projectId }, select: { status: true } })
      if (teamStatus?.status !== 'ACTIVE') {
        throw new HttpError(409, 'وضعیت تیم نامعتبر است', 'TEAM_NOT_ACTIVE')
      }
    }
    return team.id
  })

  return {
    projectId,
    previousStatus: 'TEAM_PROPOSED' as const,
    newStatus: 'IN_PROGRESS' as const,
    teamId,
  }
}

// ────────────────── IN_PROGRESS → COMPLETED ──────────────────

/**
 * تکمیل پروژه (فقط ADMIN) — قواعد:
 *   • وضعیت باید IN_PROGRESS باشد
 *   • تیم باید وجود داشته باشد، حداقل یک عضو داشته باشد و ACTIVE باشد
 *   • حداقل یک تسک وجود داشته باشد و همه‌ی تسک‌ها DONE باشند
 *   • Project و Team در یک transaction هر دو COMPLETED می‌شوند (همه یا هیچ)
 */
export async function completeProjectExecution(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      team: { select: { id: true, status: true, _count: { select: { members: true } } } },
    },
  })
  if (!project) throw new HttpError(404, 'پروژه موردنظر یافت نشد', 'PROJECT_NOT_FOUND')

  if (project.status !== 'IN_PROGRESS') {
    throw new HttpError(
      409,
      `تکمیل فقط از وضعیت IN_PROGRESS مجاز است (وضعیت فعلی: ${project.status})`,
      'PROJECT_NOT_IN_PROGRESS',
    )
  }

  const team = project.team
  if (!team) throw new HttpError(409, 'تیمی برای این پروژه ثبت نشده است', 'TEAM_NOT_FOUND')
  if (team._count.members === 0) {
    throw new HttpError(409, 'تیم پروژه حداقل باید یک عضو داشته باشد', 'TEAM_EMPTY')
  }
  if (team.status !== 'ACTIVE') {
    throw new HttpError(
      409,
      `تیم پروژه باید فعال باشد (وضعیت فعلی: ${team.status})`,
      'TEAM_NOT_ACTIVE',
    )
  }

  const [totalTasks, notDoneTasks] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, status: { not: 'DONE' } } }),
  ])
  if (totalTasks === 0) {
    throw new HttpError(409, 'پروژه بدون تسک قابل تکمیل نیست', 'NO_TASKS')
  }
  if (notDoneTasks > 0) {
    throw new HttpError(409, 'همه‌ی تسک‌های پروژه باید DONE باشند', 'INCOMPLETE_TASKS')
  }

  // هر دو تغییر در یک transaction — rollback کامل در صورت شکست
  await prisma.$transaction(async (tx) => {
    const moved = await tx.project.updateMany({
      where: { id: projectId, status: 'IN_PROGRESS' },
      data: { status: 'COMPLETED' },
    })
    if (moved.count === 0) {
      throw new HttpError(409, 'وضعیت پروژه هم‌زمان تغییر کرده است', 'PROJECT_NOT_IN_PROGRESS')
    }
    const teamDone = await tx.team.updateMany({
      where: { projectId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    })
    if (teamDone.count === 0) {
      throw new HttpError(409, 'وضعیت تیم هم‌زمان تغییر کرده است', 'TEAM_NOT_ACTIVE')
    }
  })

  return {
    projectId,
    previousStatus: 'IN_PROGRESS' as const,
    newStatus: 'COMPLETED' as const,
    teamId: team.id,
    totalTasks,
    doneTasks: totalTasks - notDoneTasks,
  }
}

// ────────────────── Team Formation ──────────────────

interface ValidatedMember {
  userId: string
  role: string
  matchScore: Prisma.Decimal
}

/**
 * اعتبارسنجی کامل اعضای تیم (پیش از transaction):
 * وجود کاربر → نقش SPECIALIST → فعال → دارای Match همین پروژه →
 * Match ردنشده → نقش در تعریف پروژه → ظرفیت هر نقش → پوشش مهارت‌های الزامی
 */
async function validateTeamMembers(
  projectId: string,
  members: { specialistId: string; role: string }[],
): Promise<ValidatedMember[]> {
  const ids = members.map((m) => m.specialistId)

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      role: true,
      isActive: true,
      userSkills: { select: { skillId: true } },
    },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  for (const m of members) {
    const u = userMap.get(m.specialistId)
    if (!u) throw new HttpError(404, 'کاربر عضو انتخاب‌شده یافت نشد')
    if (u.role !== 'SPECIALIST') throw new HttpError(422, 'کاربر انتخاب‌شده متخصص نیست')
    if (!u.isActive) throw new HttpError(422, 'کاربر انتخاب‌شده غیرفعال است')
  }

  const matches = await prisma.match.findMany({
    where: { projectId, specialistId: { in: ids } },
    select: { specialistId: true, totalScore: true, status: true },
  })
  const matchMap = new Map(matches.map((mm) => [mm.specialistId, mm]))

  for (const m of members) {
    const mm = matchMap.get(m.specialistId)
    if (!mm) throw new HttpError(409, 'متخصص انتخاب‌شده تطبیقِ این پروژه را ندارد')
    if (mm.status === 'REJECTED') throw new HttpError(409, 'تطبیق این متخصص رد شده است')
    if (mm.status === 'FLAGGED') throw new HttpError(409, 'تطبیق این متخصص نیازمند بررسی ویژه (FLAGGED) است')
  }

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      roles: { select: { roleName: true, quantity: true } },
      projectSkills: {
        where: { isRequired: true },
        select: { skill: { select: { name: true } }, skillId: true },
      },
    },
  })

  // نقش باید در تعریف پروژه باشد
  const roleCapacity = new Map(project.roles.map((r) => [r.roleName, r.quantity]))
  for (const m of members) {
    if (!roleCapacity.has(m.role)) {
      throw new HttpError(422, `نقش «${m.role}» در تعریف پروژه وجود ندارد`)
    }
  }
  // ظرفیت هر نقش
  const counts = new Map<string, number>()
  for (const m of members) counts.set(m.role, (counts.get(m.role) ?? 0) + 1)
  for (const [roleName, count] of counts) {
    if (count > roleCapacity.get(roleName)!) {
      throw new HttpError(422, `تعداد اعضای نقش «${roleName}» (${count}) بیش از ظرفیت پروژه است`)
    }
  }
  // پوشش مهارت‌های الزامی توسط اعضا
  const unionSkills = new Set(users.flatMap((u) => u.userSkills.map((s) => s.skillId)))
  for (const rs of project.projectSkills) {
    if (!unionSkills.has(rs.skillId)) {
      throw new HttpError(422, `مهارت الزامی «${rs.skill.name}» توسط اعضای تیم پوشش داده نشده است`)
    }
  }

  return members.map((m) => ({
    userId: m.specialistId,
    role: m.role,
    matchScore: matchMap.get(m.specialistId)!.totalScore, // همان امتیاز Match — بدون تولید score جدید
  }))
}

const TEAM_MEMBERS_INCLUDE = {
  members: {
    select: {
      userId: true,
      role: true,
      matchScore: true,
      joinedAt: true,
      user: { select: { profile: { select: { fullName: true, jobTitle: true } } } },
    },
    orderBy: { joinedAt: 'asc' },
  },
  project: { select: { id: true, status: true, title: true } },
} satisfies Prisma.TeamInclude

type TeamRow = Prisma.TeamGetPayload<{ include: typeof TEAM_MEMBERS_INCLUDE }>

function toTeamDto(t: TeamRow) {
  return {
    id: t.id,
    projectId: t.projectId,
    name: t.name,
    teamScore: Number(t.teamScore),
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    project: t.project,
    members: t.members.map((m) => ({
      userId: m.userId,
      fullName: m.user.profile?.fullName ?? null,
      jobTitle: m.user.profile?.jobTitle ?? null,
      role: m.role,
      matchScore: Number(m.matchScore),
      joinedAt: m.joinedAt,
    })),
  }
}

export async function createTeam(projectId: string, input: CreateTeamInput) {
  const project = await getProjectOr404(projectId)
  if (project.status !== 'REVIEW') {
    throw new HttpError(409, `تشکیل تیم فقط در وضعیت REVIEW مجاز است (وضعیت فعلی: ${project.status})`)
  }

  const enriched = await validateTeamMembers(projectId, input.members)
  const teamScoreCents = averageScoreCents(enriched.map((m) => m.matchScore))

  // Transaction: Team + TeamMembers + تغییر وضعیت پروژه — همه یا هیچ
  const teamId = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        projectId,
        name: input.name,
        teamScore: new Prisma.Decimal(teamScoreCents).div(100),
        status: 'PROPOSED',
      },
      select: { id: true },
    })
    await tx.teamMember.createMany({
      data: enriched.map((m) => ({ teamId: team.id, userId: m.userId, role: m.role, matchScore: m.matchScore })),
    })
    const moved = await tx.project.updateMany({
      where: { id: projectId, status: 'REVIEW' },
      data: { status: 'TEAM_PROPOSED' },
    })
    if (moved.count === 0) {
      throw new HttpError(409, 'وضعیت پروژه هم‌زمان تغییر کرده است — عملیات لغو شد')
    }
    return team.id
  })

  const full = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, include: TEAM_MEMBERS_INCLUDE })
  return toTeamDto(full)
}

export async function updateTeam(projectId: string, input: UpdateTeamInput) {
  const team = await prisma.team.findUnique({
    where: { projectId },
    select: { id: true, status: true },
  })
  if (!team) throw new HttpError(404, 'تیمی برای این پروژه یافت نشد')
  if (team.status !== 'PROPOSED') {
    throw new HttpError(409, `تیم در وضعیت ${team.status} قابل تغییر نیست (فقط PROPOSED)`)
  }

  const enriched = input.members
    ? await validateTeamMembers(projectId, input.members)
    : null
  const teamScoreCents = enriched ? averageScoreCents(enriched.map((m) => m.matchScore)) : null

  // Transaction: حذف اعضای قبلی + ثبت اعضای جدید + محاسبه‌ی مجدد teamScore
  await prisma.$transaction(async (tx) => {
    if (enriched) {
      await tx.teamMember.deleteMany({ where: { teamId: team.id } })
      await tx.teamMember.createMany({
        data: enriched.map((m) => ({ teamId: team.id, userId: m.userId, role: m.role, matchScore: m.matchScore })),
      })
      await tx.team.update({
        where: { id: team.id },
        data: {
          teamScore: new Prisma.Decimal(teamScoreCents!).div(100),
          ...(input.name && { name: input.name }),
        },
      })
    } else if (input.name) {
      await tx.team.update({ where: { id: team.id }, data: { name: input.name } })
    }
  })

  const full = await prisma.team.findUniqueOrThrow({ where: { projectId }, include: TEAM_MEMBERS_INCLUDE })
  return toTeamDto(full)
}

// ────────────────── لیست Matchها برای ادمین ──────────────────

export async function adminListMatches(projectId: string, pagination: Pagination) {
  await getProjectOr404(projectId)
  const [rows, total] = await Promise.all([
    prisma.match.findMany({
      where: { projectId },
      orderBy: [{ totalScore: 'desc' }, { trustScore: 'desc' }, { specialistId: 'asc' }],
      include: {
        specialist: {
          select: {
            id: true,
            profile: { select: { fullName: true, jobTitle: true } },
            userSkills: {
              select: { level: true, yearsOfExperience: true, skill: { select: { name: true } } },
              orderBy: { skill: { name: 'asc' } },
            },
          },
        },
      },
      ...toSkipTake(pagination),
    }),
    prisma.match.count({ where: { projectId } }),
  ])

  return {
    items: rows.map((r) => ({
      specialistId: r.specialistId,
      fullName: r.specialist.profile?.fullName ?? null,
      jobTitle: r.specialist.profile?.jobTitle ?? null,
      skills: r.specialist.userSkills.map((us) => ({
        name: us.skill.name,
        level: us.level,
        yearsOfExperience: us.yearsOfExperience,
      })),
      scores: {
        skillScore: Number(r.skillScore),
        experienceScore: Number(r.experienceScore),
        projectScore: Number(r.projectScore),
        ratingScore: Number(r.ratingScore),
        availabilityScore: Number(r.availabilityScore),
        budgetScore: Number(r.budgetScore),
        totalScore: Number(r.totalScore),
        trustScore: Number(r.trustScore),
      },
      status: r.status,
    })),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}

// ─────────────────────────────────────────────────────────────
// M12 — Admin Dashboard (فقط خواندنی)
//
// قواعد کلیدی:
//  • همه‌ی countها از aggregate های DB (groupBy/count) — هیچ رکوردی
//    load و در JavaScript شمرده نمی‌شود.
//  • هیچ business rule ای تغییر نمی‌کند؛ این لایه فقط «نمای وضعیت» است.
//  • attention sort کاملاً در DB: ترتیب enum ProjectStatus در Postgres
//    همان ترتیب تعریف است، بنابراین status ASC دقیقاً اولویت
//    SUBMITTED → REVIEW → TEAM_PROPOSED را می‌دهد.
// ─────────────────────────────────────────────────────────────

/** شمارش هر مقدار یک فیلد enum را به نگاشت {مقدار → count} تبدیل می‌کند */
function countByField<T extends string>(rows: Array<{ field: T; _count: number }>): Record<T, number> {
  const acc = {} as Record<T, number>
  for (const r of rows) acc[r.field] = r._count
  return acc
}

export async function getDashboardSummary(): Promise<DashboardSummaryDto> {
  const [usersByRole, usersByActive, projectsByStatus, matchesByStatus, teamsByStatus, tasksByStatus] =
    await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      prisma.user.groupBy({ by: ['isActive'], _count: { isActive: true } }),
      prisma.project.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.match.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.team.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.task.groupBy({ by: ['status'], _count: { status: true } }),
    ])

  const role = countByField<'CLIENT' | 'SPECIALIST' | 'ADMIN'>(
    usersByRole.map((r) => ({ field: r.role, _count: r._count.role })),
  )
  const active = countByField<'true' | 'false'>(
    usersByActive.map((r) => ({ field: String(r.isActive) as 'true' | 'false', _count: r._count.isActive })),
  )
  const ps = countByField<
    'DRAFT' | 'SUBMITTED' | 'MATCHING' | 'REVIEW' | 'TEAM_PROPOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'RATED' | 'CANCELLED'
  >(projectsByStatus.map((r) => ({ field: r.status, _count: r._count.status })))
  const ms = countByField<'RECOMMENDED' | 'NEEDS_REVIEW' | 'REJECTED' | 'FLAGGED'>(
    matchesByStatus.map((r) => ({ field: r.status, _count: r._count.status })),
  )
  const ts = countByField<'PROPOSED' | 'ACTIVE' | 'COMPLETED'>(
    teamsByStatus.map((r) => ({ field: r.status, _count: r._count.status })),
  )
  const ks = countByField<'TODO' | 'IN_PROGRESS' | 'DONE'>(
    tasksByStatus.map((r) => ({ field: r.status, _count: r._count.status })),
  )

  return {
    users: {
      total: (role.CLIENT ?? 0) + (role.SPECIALIST ?? 0) + (role.ADMIN ?? 0),
      clients: role.CLIENT ?? 0,
      specialists: role.SPECIALIST ?? 0,
      admins: role.ADMIN ?? 0,
      active: active.true ?? 0,
      inactive: active.false ?? 0,
    },
    projects: {
      total: Object.values(ps).reduce((a, b) => a + b, 0),
      draft: ps.DRAFT ?? 0,
      submitted: ps.SUBMITTED ?? 0,
      matching: ps.MATCHING ?? 0,
      review: ps.REVIEW ?? 0,
      teamProposed: ps.TEAM_PROPOSED ?? 0,
      inProgress: ps.IN_PROGRESS ?? 0,
      completed: ps.COMPLETED ?? 0,
      rated: ps.RATED ?? 0,
      cancelled: ps.CANCELLED ?? 0,
    },
    matches: {
      recommended: ms.RECOMMENDED ?? 0,
      needsReview: ms.NEEDS_REVIEW ?? 0,
      rejected: ms.REJECTED ?? 0,
    },
    teams: { proposed: ts.PROPOSED ?? 0, active: ts.ACTIVE ?? 0, completed: ts.COMPLETED ?? 0 },
    tasks: { todo: ks.TODO ?? 0, inProgress: ks.IN_PROGRESS ?? 0, done: ks.DONE ?? 0 },
  }
}

export async function getMatchSummary(): Promise<MatchSummaryDto> {
  const [byStatus, total] = await Promise.all([
    prisma.match.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.match.count(),
  ])
  const ms = countByField<'RECOMMENDED' | 'NEEDS_REVIEW' | 'REJECTED' | 'FLAGGED'>(
    byStatus.map((r) => ({ field: r.status, _count: r._count.status })),
  )
  return {
    recommended: ms.RECOMMENDED ?? 0,
    needsReview: ms.NEEDS_REVIEW ?? 0,
    rejected: ms.REJECTED ?? 0,
    total, // کل واقعی رکوردها (شامل FLAGGED در صورت وجود)
  }
}

/** select مشترک آیتم‌های Dashboard — فقط فیلدهای لازم، client بدون داده‌ی حساس */
const dashboardProjectSelect = {
  id: true,
  title: true,
  status: true,
  minBudget: true,
  maxBudget: true,
  deadline: true,
  createdAt: true,
  client: { select: { id: true, profile: { select: { fullName: true } } } },
} as const

type DashboardProjectRow = {
  id: string
  title: string
  status: string
  minBudget: Prisma.Decimal | null
  maxBudget: Prisma.Decimal | null
  deadline: Date | null
  createdAt: Date
  client: { id: string; profile: { fullName: string | null } | null }
}

function toDashboardItem(p: DashboardProjectRow): DashboardProjectItemDto {
  return {
    id: p.id,
    title: p.title,
    status: p.status,
    minBudget: p.minBudget === null ? null : p.minBudget.toString(),
    maxBudget: p.maxBudget === null ? null : p.maxBudget.toString(),
    deadline: p.deadline === null ? null : p.deadline.toISOString().slice(0, 10),
    createdAt: p.createdAt,
    client: { id: p.client.id, fullName: p.client.profile?.fullName ?? null },
  }
}

/** آخرین پروژه‌ها — createdAt DESC سپس id ASC (deterministic) */
export async function listRecentProjects(pagination: Pagination) {
  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: dashboardProjectSelect,
      ...toSkipTake(pagination),
    }),
    prisma.project.count(),
  ])
  return {
    items: rows.map(toDashboardItem),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}

/**
 * پروژه‌های نیازمند توجه ادمین — فقط SUBMITTED / REVIEW / TEAM_PROPOSED.
 * sort کاملاً در DB: status ASC (ترتیب enum = اولویت) سپس createdAt ASC
 * (قدیمی‌تر اول) سپس id ASC.
 */
export async function listAttentionProjects(pagination: Pagination) {
  const where: Prisma.ProjectWhereInput = {
    status: { in: ['SUBMITTED', 'REVIEW', 'TEAM_PROPOSED'] },
  }
  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: dashboardProjectSelect,
      ...toSkipTake(pagination),
    }),
    prisma.project.count({ where }),
  ])
  return {
    items: rows.map(toDashboardItem),
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.pageSize)),
  }
}
