import { PrismaClient } from '@prisma/client'

// اسکریپت بررسی اتصال Prisma به PostgreSQL (مرحله ۰۲)
// اجرا: npm run db:check
const prisma = new PrismaClient()

async function main() {
  // ۱) اتصال خام
  await prisma.$connect()
  console.log('✅ Prisma Client به PostgreSQL متصل شد.')

  // ۲) کوئری خام سلامت دیتابیس
  const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT now()`
  console.log(`🕒 زمان سرور دیتابیس: ${now.toISOString()}`)

  // ۳) شمارش جداول دامنه (بدون احتساب جدول سیستمی _prisma_migrations)
  const tables = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `
  const domain = tables.map((t) => t.table_name).filter((n) => n !== '_prisma_migrations')
  console.log(`📋 جداول اپلیکیشن (${domain.length}/12): ${domain.join(', ')}`)

  // ۴) شمارش enumها
  const enums = await prisma.$queryRaw<{ typname: string }[]>`
    SELECT t.typname FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
    ORDER BY t.typname
  `
  console.log(`🏷️  انواع enum (${enums.length}/8): ${enums.map((e) => e.typname).join(', ')}`)

  // ۵) رکوردهای migration ثبت‌شده
  const migrations = await prisma.$queryRaw<{ migration_name: string; finished_at: Date }[]>`
    SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at
  `
  for (const m of migrations) {
    console.log(`📦 migration اعمال‌شده: ${m.migration_name}`)
  }
}

main()
  .catch((err) => {
    console.error('❌ خطا در بررسی اتصال:', err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
