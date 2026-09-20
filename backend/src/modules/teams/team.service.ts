import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'

// ─────────────────────────────────────────────────────────────
// مشاهده‌ی تیم پروژه — ماتریس دسترسی:
//   ADMIN ✓ · CLIENT مالک ✓ · SPECIALIST عضو تیم ✓ · بقیه → 404
// (بدون email/passwordHash)
// ─────────────────────────────────────────────────────────────

const TEAM_INCLUDE = {
  project: { select: { id: true, title: true, status: true, clientId: true } },
  members: {
    select: {
      userId: true,
      role: true,
      matchScore: true,
      joinedAt: true,
      user: { select: { id: true, profile: { select: { fullName: true, jobTitle: true } } } },
    },
    orderBy: { joinedAt: 'asc' },
  },
} satisfies Prisma.TeamInclude

export async function getTeamForViewer(
  viewer: { id: string; role: string },
  projectId: string,
) {
  const team = await prisma.team.findUnique({
    where: { projectId },
    include: TEAM_INCLUDE,
  })
  if (!team) throw new HttpError(404, 'تیمی برای این پروژه یافت نشد')

  const isAdmin = viewer.role === 'ADMIN'
  const isOwner = team.project.clientId === viewer.id
  const isMember = team.members.some((m) => m.userId === viewer.id)

  if (!isAdmin && !isOwner && !isMember) {
    // 404 عمدی — وجود تیم برای بی‌ربط‌ها افشا نشود
    throw new HttpError(404, 'تیمی برای این پروژه یافت نشد')
  }

  return {
    id: team.id,
    projectId: team.projectId,
    name: team.name,
    teamScore: Number(team.teamScore),
    status: team.status,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    project: { id: team.project.id, title: team.project.title, status: team.project.status },
    members: team.members.map((m) => ({
      userId: m.user.id,
      fullName: m.user.profile?.fullName ?? null,
      jobTitle: m.user.profile?.jobTitle ?? null,
      role: m.role,
      matchScore: Number(m.matchScore),
      joinedAt: m.joinedAt,
    })),
  }
}
