import { Router } from 'express'
import * as skillsController from './skills.controller'

const router = Router()

// عمومی (بدون requireAuth) — تصمیم مستند: کاتالوگ Skill داده‌ی مرجعِ
// غیرحساس است و برای صفحه‌ی ثبت‌نام/جست‌وجوی عمومی هم لازم خواهد بود.
// برخلاف آن، دایرکتوری متخصصان (/specialists) احراز هویت می‌خواهد.
router.get('/', skillsController.listSkills)

export { router as skillsRouter }
