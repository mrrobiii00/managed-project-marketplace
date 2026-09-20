import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import { requireRole } from '../../middleware/require-role'
import * as recommendationsController from './recommendations.controller'

const router = Router()

// فقط SPECIALIST — CLIENT و ADMIN مجاز نیستند (طبق قرارداد M11)
router.use(requireAuth, requireRole('SPECIALIST'))

// توجه: مسیر count باید قبل از :projectId ثبت شود
router.get('/me/recommended-projects', recommendationsController.listMyRecommendations)
router.get('/me/recommended-projects/count', recommendationsController.countMyRecommendations)
router.get('/me/recommended-projects/:projectId', recommendationsController.getMyRecommendation)

export { router as recommendationsRouter }
