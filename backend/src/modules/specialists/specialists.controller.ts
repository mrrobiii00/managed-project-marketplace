import { z } from 'zod'
import type { Request, Response } from 'express'
import * as specialistsService from './specialists.service'
import { paginationSchema } from '../../utils/pagination'

export async function listSpecialists(req: Request, res: Response): Promise<void> {
  const query = paginationSchema.parse(req.query)
  const result = await specialistsService.listSpecialists(query)
  res.json({ success: true, message: 'فهرست متخصصان', data: result })
}

export async function getSpecialist(req: Request, res: Response): Promise<void> {
  const { id } = z.object({ id: z.uuid('شناسه متخصص نامعتبر است') }).parse(req.params)
  const specialist = await specialistsService.getSpecialistById(id)
  res.json({ success: true, message: 'اطلاعات متخصص', data: specialist })
}
