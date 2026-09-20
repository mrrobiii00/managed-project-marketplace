import { Router } from 'express'
import { requireAuth } from '../../middleware/require-auth'
import * as profileController from './profile.controller'

const router = Router()

// تمام مسیرها requireAuth دارند و مالکیت فقط از req.user.id تعیین می‌شود
router.get('/me', requireAuth, profileController.getMe)
router.put('/me', requireAuth, profileController.upsertMe)
router.get('/me/skills', requireAuth, profileController.listMySkills)
router.post('/me/skills', requireAuth, profileController.addMySkill)
router.put('/me/skills/:skillId', requireAuth, profileController.updateMySkill)
router.delete('/me/skills/:skillId', requireAuth, profileController.removeMySkill)

export { router as profileRouter }
