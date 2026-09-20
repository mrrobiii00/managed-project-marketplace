import express, { type Request, type Response } from 'express'
import cors, { type CorsOptions } from 'cors'
import helmet from 'helmet'
import { prisma } from './database/prisma'
import { corsOrigins, isDev } from './utils/env'
import { notFoundHandler } from './middleware/not-found'
import { errorHandler } from './middleware/error-handler'
import { authRouter } from './modules/auth/auth.routes'
import { profileRouter } from './modules/profile/profile.routes'
import { skillsRouter } from './modules/skills/skills.routes'
import { specialistsRouter } from './modules/specialists/specialists.routes'
import { recommendationsRouter } from './modules/recommendations/recommendations.routes'
import { projectRouter } from './modules/projects/project.routes'
import { matchingRouter } from './modules/matching/matching.routes'
import { adminRouter } from './modules/admin/admin.routes'
import { teamRouter } from './modules/teams/team.routes'
import { taskRouter } from './modules/tasks/task.routes'
import { ratingRouter, reputationRouter } from './modules/ratings/rating.routes'

const app = express()

// ─── امنیت و پایه ─────────────────────────────────────────────

app.use(helmet())

// CORS از environment خوانده می‌شود (متغیر CORS_ORIGINS) — '*' راه‌حل دائمی نیست:
//   • CORS_ORIGINS تنظیم شده      → فقط همان originها مجازند (توصیه‌شده)
//   • تنظیم نشده + development    → همه‌ی originها (فقط برای راحتی توسعه)
//   • تنظیم نشده + production     → هیچ origin مرورگری مجاز نیست
const corsOptions: CorsOptions = corsOrigins
  ? { origin: corsOrigins }
  : isDev
    ? { origin: true }
    : { origin: false }
app.use(cors(corsOptions))

app.use(express.json({ limit: '1mb' }))

// ─── Health Check (زیرساختی، نه Feature کسب‌وکاری) ────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Backend is running' })
})

app.get('/health/db', async (_req: Request, res: Response) => {
  const startedAt = Date.now()
  try {
    // کوئری ساده و غیرمخرب — فقط بررسی اتصال
    await prisma.$queryRaw`SELECT 1`
    res.json({
      success: true,
      message: 'Database connection is healthy',
      data: { latencyMs: Date.now() - startedAt },
    })
  } catch (error) {
    console.error('❌ اتصال دیتابیس ناموفق:', error)
    res.status(503).json({
      success: false,
      message: 'اتصال به دیتابیس برقرار نشد',
      ...(isDev && error instanceof Error && { detail: error.message }),
    })
  }
})

// ─── مسیرهای API (Milestoneهای بعدی روی همین الگو سوار می‌شوند) ──

app.use('/api/v1/auth', authRouter)
app.use('/api/v1/profile', profileRouter)
app.use('/api/v1/skills', skillsRouter)
app.use('/api/v1/specialists', specialistsRouter)
// پیشنهاد پروژه‌ها به متخصص (M11) — فقط مسیرهای /me/recommended-projects*
app.use('/api/v1/specialists', recommendationsRouter)
app.use('/api/v1/projects', projectRouter)
// مسیرهای تطبیق (زیر همان prefix پروژه‌ها): /:id/matching و /:id/matches...
app.use('/api/v1/projects', matchingRouter)
// مشاهده‌ی تیم پروژه: GET /:projectId/team
app.use('/api/v1/projects', teamRouter)
// مدیریت تسک‌ها: /:projectId/tasks...
app.use('/api/v1/projects', taskRouter)
// ارزیابی پروژه: /:projectId/ratings...
app.use('/api/v1/projects', ratingRouter)
// اعتبار کاربر: /users/:userId/reputation
app.use('/api/v1/users', reputationRouter)
// مسیرهای مدیریتی (فقط ADMIN)
app.use('/api/v1/admin', adminRouter)

// ─── 404 و Error Handling (همیشه آخر) ─────────────────────────

app.use(notFoundHandler)
app.use(errorHandler)

export { app }
