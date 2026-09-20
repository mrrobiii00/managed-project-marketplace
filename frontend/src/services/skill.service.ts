// ─────────────────────────────────────────────────────────────
// سرویس مهارت‌ها — GET /api/v1/skills (عمومی، از M05)
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'

export interface SkillCatalogItem {
  id: string
  name: string
  category: string
  createdAt: string
}

export const skillService = {
  /** کاتالوگ مرجع مهارت‌ها — بدون احراز هویت (endpoint عمومی) */
  async getSkills(): Promise<SkillCatalogItem[]> {
    const data = await apiRequest<{ items: SkillCatalogItem[] }>('/skills', { auth: false })
    return data.items
  },
}
