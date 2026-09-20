// ─────────────────────────────────────────────────────────────
// انواع Task — دقیقاً منطبق با قرارداد واقعی M09
// enum ها عین بک‌اند؛ هیچ مقدار جدیدی اضافه نشده.
// ─────────────────────────────────────────────────────────────

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'

export interface TaskAssignee {
  id: string
  fullName: string | null
}

/** پاسخ GET /projects/:id/tasks (آیتم‌ها) و GET .../tasks/:taskId */
export interface TaskDto {
  id: string
  projectId: string
  teamId: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  assignedTo: TaskAssignee | null
  createdAt: string
  updatedAt: string
}

export interface TaskPagination {
  items: TaskDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/** فیلترهای واقعی query بک‌اند */
export interface TaskListQuery {
  page?: number
  pageSize?: number
  status?: TaskStatus
  priority?: TaskPriority
  /** uuid متخصص */
  assignedTo?: string
}

/** POST body — SPECIALIST بدون assignedTo می‌فرستد (بک‌اند خودش را تخصیص می‌دهد) */
export interface CreateTaskPayload {
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  assignedTo?: string
}

/**
 * PUT body طبق قرارداد کامل بک‌اند. قواعد نقش در سرور اعمال می‌شود:
 *   SPECIALIST → فقط { status } (بقیه 403)
 *   CLIENT مالک → title/description/priority/dueDate/assignedTo
 *                 (status توسط سرور دور ریخته می‌شود)
 *   ADMIN → همه‌ی فیلدها
 */
export interface UpdateTaskPayload {
  title?: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  /** uuid عضو تیم — فقط CLIENT/ADMIN */
  assignedTo?: string
  status?: TaskStatus
}
