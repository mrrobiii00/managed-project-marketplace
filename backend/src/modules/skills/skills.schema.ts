import { z } from 'zod'
import { paginationSchema } from '../../utils/pagination'

export const listSkillsQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100, 'عبارت جست‌وجو حداکثر ۱۰۰ کاراکتر است').optional(),
  category: z.string().trim().max(100, 'دسته‌بندی حداکثر ۱۰۰ کاراکتر است').optional(),
})

export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>
