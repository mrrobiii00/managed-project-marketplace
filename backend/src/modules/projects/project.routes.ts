import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireRole } from '../../middleware/require-role'
import * as projectController from './project.controller'

const router = Router()

// ساخت/مدیریت پروژه فقط برای CLIENT (RBAC از دیتابیس — نه از body)
// ADMIN هم در MVP فعلاً از این مسیرها استفاده نمی‌کند (داشبورد ادمین خارج از scope)
router.post('/', requireAuth, requireRole('CLIENT'), projectController.createProject)

// تصمیم مستند: در MVP فعلی، SPECIALIST هنوز مسیر مشاهده‌ی پروژه ندارد
// (تا Milestone Matching) و ADMIN از API مخصوص خودش استفاده خواهد کرد → 403
router.get('/me', requireAuth, requireRole('CLIENT'), projectController.listMyProjects)

// مشاهده‌ی جزئیات: هر کاربر احراز هویت‌شده (سیاست DRAFT=فقط مالک در Service)
router.get('/:id', requireAuth, projectController.getProject)

router.put('/:id', requireAuth, requireRole('CLIENT'), projectController.updateProject)
router.post('/:id/submit', requireAuth, requireRole('CLIENT'), projectController.submitProject)
router.delete('/:id', requireAuth, requireRole('CLIENT'), projectController.deleteProject)

export { router as projectRouter }
