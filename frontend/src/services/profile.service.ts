// ─────────────────────────────────────────────────────────────
// سرویس پروفایل — دقیقاً endpointهای موجود M05:
//   GET    /api/v1/profile/me                (احراز هویت)
//   PUT    /api/v1/profile/me                (upsert؛ مالکیت از توکن)
//   GET    /api/v1/profile/me/skills         (احراز هویت)
//   POST   /api/v1/profile/me/skills         (409 برای تکراری)
//   PUT    /api/v1/profile/me/skills/:skillId
//   DELETE /api/v1/profile/me/skills/:skillId
// هیچ userId/specialistId از فرانت ارسال نمی‌شود.
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type {
  AddSkillPayload,
  ProfileDto,
  ProfileUpdatePayload,
  UpdateSkillPayload,
  UserSkillDto,
} from '../types/profile'

export const profileService = {
  /** 404 به معنی «پروفایل هنوز ساخته نشده» است (با PUT ساخته می‌شود) */
  getMyProfile(): Promise<ProfileDto> {
    return apiRequest<ProfileDto>('/profile/me')
  },

  updateMyProfile(payload: ProfileUpdatePayload): Promise<ProfileDto> {
    return apiRequest<ProfileDto>('/profile/me', { method: 'PUT', body: payload })
  },

  getMySkills(): Promise<UserSkillDto[]> {
    return apiRequest<{ items: UserSkillDto[] }>('/profile/me/skills').then((d) => d.items)
  },

  addMySkill(payload: AddSkillPayload): Promise<UserSkillDto> {
    return apiRequest<UserSkillDto>('/profile/me/skills', { method: 'POST', body: payload })
  },

  updateMySkill(skillId: string, payload: UpdateSkillPayload): Promise<UserSkillDto> {
    return apiRequest<UserSkillDto>(`/profile/me/skills/${encodeURIComponent(skillId)}`, {
      method: 'PUT',
      body: payload,
    })
  },

  async deleteMySkill(skillId: string): Promise<void> {
    await apiRequest<unknown>(`/profile/me/skills/${encodeURIComponent(skillId)}`, {
      method: 'DELETE',
    })
  },
}
