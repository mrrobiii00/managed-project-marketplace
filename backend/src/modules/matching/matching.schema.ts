import { z } from 'zod'

export const projectIdParamSchema = z.object({
  id: z.uuid('شناسه پروژه نامعتبر است'),
})

export const matchParamsSchema = z.object({
  id: z.uuid('شناسه پروژه نامعتبر است'),
  specialistId: z.uuid('شناسه متخصص نامعتبر است'),
})
