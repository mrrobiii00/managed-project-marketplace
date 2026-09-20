// ─────────────────────────────────────────────────────────────
// انواع Team — دقیقاً منطبق با GET /projects/:projectId/team (M08)
// ─────────────────────────────────────────────────────────────

export type TeamStatus = 'PROPOSED' | 'ACTIVE' | 'COMPLETED'

export interface TeamMemberDto {
  userId: string
  fullName: string | null
  jobTitle: string | null
  /** نقش عضو در تیم (roleName) */
  role: string
  /** امتیاز تطبیق عضو (number) */
  matchScore: number
  joinedAt: string
}

export interface TeamDto {
  id: string
  projectId: string
  name: string
  teamScore: number
  status: TeamStatus
  createdAt: string
  updatedAt: string
  project: { id: string; title: string; status: string }
  members: TeamMemberDto[]
}
