// ─────────────────────────────────────────────────────────────
// M12 — Admin Dashboard: انواع DTO (فقط خواندنی، بدون منطق)
// ─────────────────────────────────────────────────────────────

/** بلوک users در dashboard/summary — همه‌ی مقادیر از aggregate های DB */
export interface DashboardUsersDto {
  total: number
  clients: number
  specialists: number
  admins: number
  active: number
  inactive: number
}

/** بلوک projects — هر ۹ وضعیت + total (مجموع همه‌ی وضعیت‌ها) */
export interface DashboardProjectsDto {
  total: number
  draft: number
  submitted: number
  matching: number
  review: number
  teamProposed: number
  inProgress: number
  completed: number
  rated: number
  cancelled: number
}

/** بلوک matches — سه وضعیت اصلی طبق قرارداد M12 (FLAGGED فقط در totalStats لحاظ می‌شود) */
export interface DashboardMatchesDto {
  recommended: number
  needsReview: number
  rejected: number
}

export interface DashboardTeamsDto {
  proposed: number
  active: number
  completed: number
}

export interface DashboardTasksDto {
  todo: number
  inProgress: number
  done: number
}

export interface DashboardSummaryDto {
  users: DashboardUsersDto
  projects: DashboardProjectsDto
  matches: DashboardMatchesDto
  teams: DashboardTeamsDto
  tasks: DashboardTasksDto
}

/** آیتم recent-projects / attention — فقط فیلدهای موردنیاز Dashboard */
export interface DashboardProjectItemDto {
  id: string
  title: string
  status: string
  minBudget: string | null
  maxBudget: string | null
  deadline: string | null
  createdAt: Date
  client: { id: string; fullName: string | null }
}

export interface MatchSummaryDto {
  recommended: number
  needsReview: number
  rejected: number
  total: number
}
