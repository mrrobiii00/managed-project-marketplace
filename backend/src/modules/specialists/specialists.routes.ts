import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import * as specialistsController from './specialists.controller'

const router = Router()

// احراز هویت لازم است (هر نقشی) — تصمیم مستند: دایرکتوری متخصصان
// داده‌ی درون‌سکویی است (برای Client و موتور Matching) و نباید برای
// بازدیدکننده‌ی ناشناس عمومی باشد.
router.get('/', requireAuth, specialistsController.listSpecialists)
router.get('/:id', requireAuth, specialistsController.getSpecialist)

export { router as specialistsRouter }
