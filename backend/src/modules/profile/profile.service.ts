import { Prisma } from '@prisma/client'
import { prisma } from '../../database/prisma'
import { HttpError } from '../../utils/http-error'
import type { UpdateProfileInput, AddUserSkillInput, UpdateUserSkillInput } from './profile.schema'

// ─────────────────────────────────────────────────────────────
// منطق Profile و UserSkill — مالکیت همیشه و فقط از req.user.id
// (هیچ userId از body/query قبول نمی‌شود → ضد IDOR)
// ─────────────────────────────────────────────────────────────

const USER_SKILL_SELECT = {
  skillId: true,
  level: true,
  yearsOfExperience: true,
  skill: { select: { id: true, name: true, category: true } },
} satisfies Prisma.UserSkillSelect

export async function getMyProfile(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      userId: true,
      fullName: true,
      bio: true,
      jobTitle: true,
      yearsOfExperience: true,
      availability: true,
      avatarUrl: true,
      hourlyRate: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  if (!profile) {
    // رفتار مستند: پروفایل هنوز ساخته نشده → 404 (با PUT /profile/me ساخته می‌شود)
    throw new HttpError(404, 'پروفایلی برای شما ثبت نشده است')
  }
  return profile
}

export async function upsertMyProfile(userId: string, input: UpdateProfileInput) {
  // upsert: اگر نبود می‌سازد، اگر بود همانِ کاربر جاری را به‌روز می‌کند
  // (where روی userId از توکن است → مالکیت قابل جعل نیست)
  return prisma.profile.upsert({
    where: { userId },
    create: { userId, ...input },
    update: { ...input },
    select: {
      userId: true,
      fullName: true,
      bio: true,
      jobTitle: true,
      yearsOfExperience: true,
      availability: true,
      avatarUrl: true,
      hourlyRate: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function listMySkills(userId: string) {
  return prisma.userSkill.findMany({
    where: { userId },
    select: USER_SKILL_SELECT,
    orderBy: { skill: { name: 'asc' } },
  })
}

export async function addMySkill(userId: string, input: AddUserSkillInput) {
  // Skill باید واقعاً در دیتابیس وجود داشته باشد (skillId جعلی رد می‌شود)
  const skill = await prisma.skill.findUnique({
    where: { id: input.skillId },
    select: { id: true },
  })
  if (!skill) {
    throw new HttpError(404, 'مهارت موردنظر یافت نشد')
  }

  try {
    return await prisma.userSkill.create({
      data: {
        userId,
        skillId: input.skillId,
        level: input.level,
        yearsOfExperience: input.yearsOfExperience,
      },
      select: USER_SKILL_SELECT,
    })
  } catch (err) {
    // unique(user_id, skill_id) → مهارت تکراری
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'این مهارت قبلاً در پروفایل شما ثبت شده است')
    }
    throw err
  }
}

export async function updateMySkill(userId: string, skillId: string, input: UpdateUserSkillInput) {
  try {
    return await prisma.userSkill.update({
      // کلید مرکب (userId, skillId) → فقط رکورد خودِ کاربر قابل تغییر است
      where: { userId_skillId: { userId, skillId } },
      data: {
        ...(input.level !== undefined && { level: input.level }),
        ...(input.yearsOfExperience !== undefined && { yearsOfExperience: input.yearsOfExperience }),
      },
      select: USER_SKILL_SELECT,
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'این مهارت در پروفایل شما ثبت نشده است')
    }
    throw err
  }
}

export async function removeMySkill(userId: string, skillId: string) {
  try {
    await prisma.userSkill.delete({ where: { userId_skillId: { userId, skillId } } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'این مهارت در پروفایل شما ثبت نشده است')
    }
    throw err
  }
}
