import { z } from 'zod'
import { paginationSchema } from '../../utils/pagination'

// ─────────────────────────────────────────────────────────────
// Schemaهای ورودی Recommendations — همان utility صفحه‌بندی مشترک
// (قرارداد فعلی پروژه: page + pageSize)
// ─────────────────────────────────────────────────────────────

export const listRecommendationsQuerySchema = paginationSchema

export const projectIdParamSchema = z.object({
  projectId: z.uuid('شناسه پروژه نامعتبر است'),
})
