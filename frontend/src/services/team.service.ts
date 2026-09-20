// ─────────────────────────────────────────────────────────────
// سرویس تیم — فقط خواندنی:
//   GET /api/v1/projects/:projectId/team (M08)
// غیرمرتبط‌ها → 404 (بدون افشای وجود تیم)
// ─────────────────────────────────────────────────────────────

import { apiRequest } from './api'
import type { TeamDto } from '../types/team'

export const teamService = {
  getProjectTeam(projectId: string): Promise<TeamDto> {
    return apiRequest<TeamDto>(`/projects/${encodeURIComponent(projectId)}/team`)
  },
}
