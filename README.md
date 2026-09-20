# مارکت‌پلیس پروژه‌های نرم‌افزاری (MVP)

پلتفرم مدیریت پروژه‌های نرم‌افزاری با تطبیق هوشمند متخصصان، مدیریت تیم و تسک، و نظام اعتبار — فارسی و RTL-first.

## پشته‌ی فناوری

- **بک‌اند:** Node.js + Express 5 + TypeScript + Prisma (PostgreSQL) + Zod + JWT + Argon2id
- **فرانت‌اند:** React + TypeScript + Tailwind CSS (RTL) + React Router + fetch
- **تست:** unit (موتور تطبیق/قواعد تسک/قواعد ارزیابی) + اسکریپت‌های integration بر پایه‌ی curl

## ساختار

```
backend/   ماژول‌های دامنه (auth, profile, projects, matching, teams, tasks, ratings, recommendations, admin)
frontend/  SPA فارسی RTL (pages/components/services/context)
prisma/    schema + migrations + seed مهارت‌ها
scripts/   اسکریپت‌های تست/ستاپ مراحل + demo-seed
docs/      گزارش هر مایل‌استون + راهنمای دمو
```

## راه‌اندازی سریع

```bash
npm install && (cd frontend && npm install)
npx prisma migrate deploy
npm run db:seed        # catalog مهارت‌ها
npm run build && node dist/server.js   # بک‌اند روی :4000
(cd frontend && npm run dev)           # فرانت‌اند روی :5173
```

## دمو

حساب‌های دمو، داده‌ی آماده و سناریوی کامل End-to-End در **[docs/demo.md](docs/demo.md)**:

```bash
npm run db:seed:demo              # داده‌ی دمو (idempotent — سرور باید بالا باشد)
npm run db:seed:demo:clean        # حذف فقط داده‌های دمو
```

| نقش | ایمیل | رمز |
| --- | --- | --- |
| کارفرما | demo.client@example.com | Demo12345! |
| متخصص فرانت‌اند | demo.frontend@example.com | Demo12345! |
| متخصص بک‌اند | demo.backend@example.com | Demo12345! |
| مدیر سیستم | demo.admin@example.com | Demo12345! |

## اسکریپت‌های پرکاربرد

| دستور | توضیح |
| --- | --- |
| `npm run dev` | بک‌اند با tsx watch |
| `npm run db:seed` / `db:seed:demo` / `db:seed:demo:clean` | seed مهارت‌ها / داده‌ی دمو / پاک‌سازی دمو |
| `npm run test:unit` | تست‌های unit (۶۷ حالت) |
| `npm run test:integration` | تست‌های integration مرحله‌ی M10 |

گزارش کامل هر مایل‌استون در `docs/milestone-*.md` موجود است.
