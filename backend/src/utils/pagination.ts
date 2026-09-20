import { z } from 'zod'

// صفحه‌بندی مشترک لیستها
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'صفحه باید حداقل ۱ باشد').default(1),
  pageSize: z.coerce.number().int().min(1, 'اندازه‌ی صفحه باید حداقل ۱ باشد').max(100, 'اندازه‌ی صفحه حداکثر ۱۰۰ است').default(20),
})

export type Pagination = z.infer<typeof paginationSchema>

export function toSkipTake(p: Pagination): { skip: number; take: number } {
  return { skip: (p.page - 1) * p.pageSize, take: p.pageSize }
}
