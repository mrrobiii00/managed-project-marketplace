import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireRole } from '../../middleware/require-role'
import * as adminController from './admin.controller'

const router = Router()

// تمام مسیرهای ادمین: احراز هویت + نقش ADMIN (RBAC از دیتابیس)
router.use(requireAuth, requireRole('ADMIN'))

router.post('/projects/:id/review', adminController.reviewProject)
router.post('/projects/:projectId/start', adminController.startProject)
router.post('/projects/:projectId/complete', adminController.completeProject)
router.get('/projects/:id/matches', adminController.listMatches)
router.put('/projects/:projectId/matches/:specialistId', adminController.decideMatch)
router.post('/projects/:projectId/team', adminController.createTeam)
router.put('/projects/:projectId/team', adminController.updateTeam)

// ─────────────────────────────────────────────────────────────
// M12 — Admin Dashboard (فقط خواندنی، همان گارد ADMIN ماژول)
// ─────────────────────────────────────────────────────────────
router.get('/dashboard/summary', adminController.dashboardSummary)
router.get('/dashboard/recent-projects', adminController.dashboardRecentProjects)
router.get('/dashboard/attention', adminController.dashboardAttention)
router.get('/dashboard/match-summary', adminController.dashboardMatchSummary)

export { router as adminRouter }
