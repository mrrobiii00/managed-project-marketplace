import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { CreateRatingInput } from './rating.schema'
import { isSelfRating, resolveRaterType } from './rating.rules'
import type { RatingDto } from './rating.types'

// ─────────────────────────────────────────────────────────────
// منطق Rating:
//  • فقط بعد از COMPLETED شدن پروژه فعال می‌شود
//  • CLIENT مالک ← اعضای تیم | SPECIALIST عضو ← مالک پروژه
//  • ADMIN طرف پروژه نیست و نمی‌تواند ارزیابی بدهد
//  • fromUserId فقط از توکن · خودارزیابی 422 · تکراری 409
// ─────────────────────────────────────────────────────────────

const PUBLIC_USER_SELECT = { id: true, profile: { select: { fullName: true } } } satisfies Prisma.UserSelect

const RATING_INCLUDE = {
  fromUser: { select: PUBLIC_USER_SELECT },
  toUser: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.RatingInclude

type RatingRow = Prisma.RatingGetPayload<{ include: typeof RATING_INCLUDE }>

function toDto(r: RatingRow): RatingDto {
  return {
    id: r.id,
    projectId: r.projectId,
    fromUser: { id: r.fromUser.id, fullName: r.fromUser.profile?.fullName ?? null },
    toUser: { id: r.toUser.id, fullName: r.toUser.profile?.fullName ?? null },
    score: r.score,
    review: r.review,
    createdAt: r.createdAt,
  }
}

/** بافتار پروژه برای ارزیابی — غیرمرتبط‌ها 404 (عدم افشای وجود پروژه) */
async function getRatingContext(viewer: { id: string; role: string }, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      clientId: true,
      team: { select: { id: true, members: { select: { userId: true } } } },
    },
  })
  if (!project) throw new HttpError(404, 'پروژه موردنظر یافت نشد', 'RATING_NOT_FOUND')

  const isProjectOwner = project.clientId === viewer.id
  const memberIds = new Set(project.team?.members.map((m) => m.userId) ?? [])
  const isTeamMember = memberIds.has(viewer.id)

  if (viewer.role !== 'ADMIN' && !isProjectOwner && !isTeamMember) {
    throw new HttpError(404, 'پروژه موردنظر یافت نشد', 'RATING_NOT_FOUND')
  }
  return { project, memberIds, isProjectOwner, isTeamMember }
}

export async function createRating(
  viewer: { id: string; role: string },
  projectId: string,
  input: CreateRatingInput,
): Promise<RatingDto> {
  const ctx = await getRatingContext(viewer, projectId)

  // ارزیابی فقط پس از تکمیل پروژه
  if (ctx.project.status !== 'COMPLETED') {
    throw new HttpError(
      409,
      `ارزیابی فقط پس از تکمیل پروژه ممکن است (وضعیت فعلی: ${ctx.project.status})`,
      'PROJECT_NOT_COMPLETABLE',
    )
  }

  // ADMIN طرف پروژه نیست
  const raterType = resolveRaterType(viewer.role, ctx.isProjectOwner, ctx.isTeamMember)
  if (raterType === null) {
    throw new HttpError(403, 'شما طرف این پروژه نیستید و نمی‌توانید ارزیابی ثبت کنید', 'RATING_NOT_ALLOWED')
  }

  // خودارزیابی ممنوع
  if (isSelfRating(viewer.id, input.toUserId)) {
    throw new HttpError(422, 'ارزیابی خود مجاز نیست', 'SELF_RATING')
  }

  // هدف مجاز: CLIENT مالک ← عضو تیم | SPECIALIST عضو ← مالک پروژه
  if (raterType === 'CLIENT_OWNER' && !ctx.memberIds.has(input.toUserId)) {
    throw new HttpError(403, 'کارفرما فقط می‌تواند اعضای تیم پروژه را ارزیابی کند', 'RATING_NOT_ALLOWED')
  }
  if (raterType === 'TEAM_MEMBER' && input.toUserId !== ctx.project.clientId) {
    throw new HttpError(403, 'عضو تیم فقط می‌تواند کارفرمای پروژه را ارزیابی کند', 'RATING_NOT_ALLOWED')
  }

  try {
    const rating = await prisma.rating.create({
      data: {
        projectId, // فقط از مسیر
        fromUserId: viewer.id, // فقط از توکن — هرگز از body
        toUserId: input.toUserId,
        score: input.score,
        review: input.review ?? null,
      },
      include: RATING_INCLUDE,
    })
    return toDto(rating)
  } catch (err) {
    // unique(projectId, fromUserId, toUserId)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'ارزیابی شما برای این کاربر در این پروژه قبلاً ثبت شده است', 'RATING_ALREADY_EXISTS')
    }
    throw err
  }
}

export async function listProjectRatings(
  viewer: { id: string; role: string },
  projectId: string,
): Promise<RatingDto[]> {
  await getRatingContext(viewer, projectId)
  const rows = await prisma.rating.findMany({
    where: { projectId }, // گارد IDOR: رتبه‌ها همیشه در قالب همین پروژه
    include: RATING_INCLUDE,
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
  })
  return rows.map(toDto)
}
