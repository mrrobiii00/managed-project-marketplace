import type { Request, Response } from 'express'
import * as profileService from './profile.service'
import { updateProfileSchema, addUserSkillSchema, updateUserSkillSchema, skillIdParamSchema } from './profile.schema'

// ─────────────────────────────────────────────────────────────
// Controller نازک — مالکیت همیشه از req.user.id (از توکن)
// ─────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  const profile = await profileService.getMyProfile(req.user!.id)
  res.json({ success: true, message: 'پروفایل کاربر جاری', data: profile })
}

export async function upsertMe(req: Request, res: Response): Promise<void> {
  const input = updateProfileSchema.parse(req.body)
  const profile = await profileService.upsertMyProfile(req.user!.id, input)
  res.json({ success: true, message: 'پروفایل ذخیره شد', data: profile })
}

export async function listMySkills(req: Request, res: Response): Promise<void> {
  const skills = await profileService.listMySkills(req.user!.id)
  res.json({ success: true, message: 'مهارت‌های کاربر جاری', data: { items: skills } })
}

export async function addMySkill(req: Request, res: Response): Promise<void> {
  const input = addUserSkillSchema.parse(req.body)
  const userSkill = await profileService.addMySkill(req.user!.id, input)
  res.status(201).json({ success: true, message: 'مهارت به پروفایل شما اضافه شد', data: userSkill })
}

export async function updateMySkill(req: Request, res: Response): Promise<void> {
  const { skillId } = skillIdParamSchema.parse(req.params)
  const input = updateUserSkillSchema.parse(req.body)
  const userSkill = await profileService.updateMySkill(req.user!.id, skillId, input)
  res.json({ success: true, message: 'مهارت به‌روزرسانی شد', data: userSkill })
}

export async function removeMySkill(req: Request, res: Response): Promise<void> {
  const { skillId } = skillIdParamSchema.parse(req.params)
  await profileService.removeMySkill(req.user!.id, skillId)
  res.json({ success: true, message: 'مهارت از پروفایل شما حذف شد' })
}
