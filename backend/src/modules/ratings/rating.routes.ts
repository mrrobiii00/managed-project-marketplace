import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import * as ratingController from './rating.controller'

// ارزیابی پروژه — مجوزهای طرفِ پروژه در Service بررسی می‌شوند
const router = Router()
router.post('/:projectId/ratings', requireAuth, ratingController.createRating)
router.get('/:projectId/ratings', requireAuth, ratingController.listProjectRatings)
export { router as ratingRouter }

// Reputation — عمومی برای کاربران احراز هویت‌شده (بدون داده‌ی خصوصی)
const reputationRouter = Router()
reputationRouter.get('/:userId/reputation', requireAuth, ratingController.getUserReputation)
export { reputationRouter }
