// ─────────────────────────────────────────────────────────────
// انواع Project — دقیقاً منطبق با قرارداد واقعی M06
// توجه: بودجه در «درخواست» عدد و در «پاسخ» رشته است.
// ─────────────────────────────────────────────────────────────

export type ProjectStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'MATCHING'
  | 'REVIEW'
  | 'TEAM_PROPOSED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'RATED'
  | 'CANCELLED'

/** آیتم لیست GET /projects/me */
export interface ProjectSummaryDto {
  id: string
  title: string
  status: ProjectStatus
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  createdAt: string
  updatedAt: string
  skillsCount: number
  rolesCount: number
}

export interface ProjectListResult {
  items: ProjectSummaryDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ProjectSkillDto {
  skillId: string
  name: string
  category: string
  isRequired: boolean
}

export interface ProjectRoleDto {
  id: string
  roleName: string
  quantity: number
}

/** پاسخ کامل GET /projects/:id (و POST/PUT/submit) */
export interface ProjectDto {
  id: string
  title: string
  description: string
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  status: ProjectStatus
  createdAt: string
  updatedAt: string
  client: { id: string; fullName: string | null }
  skills: ProjectSkillDto[]
  roles: ProjectRoleDto[]
}

// ── درخواست‌ها (bodget = number مطابق zod بک‌اند) ──

export interface SkillInput {
  skillId: string
  isRequired?: boolean
}

export interface RoleInput {
  roleName: string
  quantity: number
}

export interface CreateProjectInput {
  title: string
  description: string
  minBudget?: number
  maxBudget?: number
  deadline?: string
  skills?: SkillInput[]
  roles?: RoleInput[]
}

/** PUT جزئی است؛ فرم ما همیشه همه‌ی فیلدها را می‌فرستد */
export interface UpdateProjectInput {
  title?: string
  description?: string
  minBudget?: number
  maxBudget?: number
  deadline?: string
  skills?: SkillInput[]
  roles?: RoleInput[]
}
