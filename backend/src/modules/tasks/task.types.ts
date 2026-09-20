import type { TaskPriority, TaskStatus } from '@prisma/client'

/** خروجی استاندارد Task — بدون داده‌ی حساس */
export interface TaskDto {
  id: string
  projectId: string
  teamId: string
  title: string
  description: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  assignedTo: { id: string; fullName: string | null } | null
  createdAt: Date
  updatedAt: Date
}
