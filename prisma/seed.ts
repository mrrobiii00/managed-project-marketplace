import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// Seed مهارت‌های پایه — Milestone 05
// • Idempotent است: با skipDuplicates مهارت تکراری ایجاد نمی‌شود.
// • هیچ رکوردی حذف یا تغییر نمی‌کند؛ فقط مهارت‌های غایب را اضافه می‌کند.
// اجرا: npm run db:seed
// ─────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

const SKILLS: { name: string; category: string }[] = [
  { name: 'JavaScript', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'React', category: 'Frontend' },
  { name: 'Node.js', category: 'Backend' },
  { name: 'Express', category: 'Backend' },
  { name: 'Python', category: 'Backend' },
  { name: 'Java', category: 'Backend' },
  { name: 'C#', category: 'Backend' },
  { name: 'PostgreSQL', category: 'Database' },
  { name: 'MongoDB', category: 'Database' },
  { name: 'UI/UX', category: 'Design' },
  { name: 'Figma', category: 'Design' },
  { name: 'Flutter', category: 'Mobile' },
  { name: 'React Native', category: 'Mobile' },
  { name: 'Docker', category: 'DevOps' },
  { name: 'Git', category: 'Tools' },
  { name: 'GitHub', category: 'Tools' },
  { name: 'Testing', category: 'Quality' },
  { name: 'DevOps', category: 'DevOps' },
  { name: 'Machine Learning', category: 'Data' },
]

async function main(): Promise<void> {
  const result = await prisma.skill.createMany({ data: SKILLS, skipDuplicates: true })
  const total = await prisma.skill.count()
  console.log(`🌱 Skillهای جدید ثبت‌شده: ${result.count} | مجموع Skillهای موجود: ${total}`)
}

main()
  .catch((err) => {
    console.error('❌ خطا در seed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
