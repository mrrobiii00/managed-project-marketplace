import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import * as teamController from './team.controller'

const router = Router()

// ماتریس دسترسی (admin/مالک/عضو) داخل Service بررسی می‌شود — بقیه 404
router.get('/:projectId/team', requireAuth, teamController.getTeam)

export { router as teamRouter }
