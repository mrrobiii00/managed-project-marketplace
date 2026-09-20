import 'dotenv/config' // باید اول از همه اجرا شود تا متغیرهای .env قبل از خوانده‌شدن در env.ts بارگذاری شوند
import { app } from './app'
import { env } from './utils/env'
import { prisma } from './database/prisma'

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Backend running at http://localhost:${env.PORT} (${env.NODE_ENV})`)
  console.log(`   Health check: GET http://localhost:${env.PORT}/health`)
  console.log(`   DB check:     GET http://localhost:${env.PORT}/health/db`)
})

// ─── خاموشی تمیز (Graceful Shutdown) ──────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`\n📦 سیگنال ${signal} دریافت شد — در حال خاموش کردن...`)
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
