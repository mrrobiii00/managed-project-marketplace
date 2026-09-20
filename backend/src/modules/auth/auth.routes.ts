import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { requireAuth } from '../../middleware/require-auth'
import { requireRole } from '../../middleware/require-role'
import * as authController from './auth.controller'

const router = Router()

// Rate limit پایه برای جلوگیری از brute-force ساده (per-IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // پنجره‌ی ۱۵ دقیقه
  limit: 30, // حداکثر ۳۰ درخواست register/login در هر پنجره
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'تعداد درخواست‌ها بیش از حد مجاز است؛ لطفاً چند دقیقه بعد دوباره تلاش کنید',
  },
})

router.post('/register', authLimiter, authController.register)
router.post('/login', authLimiter, authController.login)
router.get('/me', requireAuth, authController.me)
// endpoint آزمایشی RBAC — فقط برای تست این Milestone؛ در آینده حذف/جایگزین می‌شود
router.get('/admin-test', requireAuth, requireRole('ADMIN'), authController.adminTest)

export { router as authRouter }
