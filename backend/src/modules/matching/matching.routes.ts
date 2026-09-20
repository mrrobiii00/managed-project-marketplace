import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireRole } from '../../middleware/require-role'
import * as matchingController from './matching.controller'

const router = Router()

// شروع تطبیق: فقط CLIENT مالک پروژه (مالکیت در Service بررسی می‌شود)
router.post(
  '/:id/matching',
  requireAuth,
  requireRole('CLIENT'),
  matchingController.startMatching,
)

// فهرست تطبیق‌ها: مالک یا ADMIN (سایرین در Service با 404 رد می‌شوند)
router.get('/:id/matches', requireAuth, matchingController.listMatches)

// جزئیات یک تطبیق: مالک یا ADMIN
router.get('/:id/matches/:specialistId', requireAuth, matchingController.getMatchDetails)

export { router as matchingRouter }
