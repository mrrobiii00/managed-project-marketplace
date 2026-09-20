// ─────────────────────────────────────────────────────────────
// Demo Cleanup — فقط رکوردهای دمو را حذف می‌کند (M16 §19)
// هیچ داده‌ی غیردمو دست نمی‌خورد؛ هیچ reset/TRUNCATE انجام نمی‌شود.
// حذف ۴ کاربر دمو کافی است — تمام FKهای دمو (profiles، user_skills،
// پروژه‌ها، تیم‌ها، تسک‌ها، matches، ratings) Cascade حذف می‌شوند.
// اجرا: npm run db:seed:demo:clean
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_EMAILS = [
  'demo.client@example.com',
  'demo.frontend@example.com',
  'demo.backend@example.com',
  'demo.admin@example.com',
]

async function main(): Promise<void> {
  console.log('🧹 Demo Cleanup — حذف فقط داده‌های دمو')

  // شمارش قبل
  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true, email: true },
  })
  if (users.length === 0) {
    console.log('   داده‌ی دمویی برای حذف وجود ندارد.')
    return
  }
  const ids = users.map((u) => u.id)
  const before = {
    projects: await prisma.project.count({ where: { clientId: { in: ids } } }),
    teams: await prisma.team.count({ where: { project: { clientId: { in: ids } } } }),
    tasks: await prisma.task.count({ where: { project: { clientId: { in: ids } } } }),
    ratings: await prisma.rating.count({ where: { project: { clientId: { in: ids } } } }),
    matches: await prisma.match.count({ where: { project: { clientId: { in: ids } } } }),
  }

  // حذف کاربران دمو — بقیه Cascade
  const deleted = await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } })

  console.log(`   کاربران دمو حذف‌شده: ${deleted.count}`)
  console.log(
    `   (Cascade) پروژه‌ها: ${before.projects} | تیم‌ها: ${before.teams} | تسک‌ها: ${before.tasks} | ارزیابی‌ها: ${before.ratings} | matches: ${before.matches}`,
  )
  console.log('✅ فقط داده‌های دمو حذف شد — سایر داده‌ها دست‌نخورده.')
}

main()
  .catch((e) => {
    console.error('❌ Cleanup شکست خورد:', e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
