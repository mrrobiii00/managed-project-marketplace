import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────
// نمونه‌ی واحد (singleton) از Prisma Client برای کل Backend.
//
// • از همان DATABASE_URL موجود در .env استفاده می‌کند —
//   هیچ connection string جدید یا hard-coded ساخته نمی‌شود.
// • در Milestoneهای بعدی، همه‌ی ماژول‌ها فقط همین instance را
//   import می‌کنند تا اتصال اضافی به دیتابیس باز نشود.
// ─────────────────────────────────────────────────────────────

const prisma = new PrismaClient()

export { prisma }
