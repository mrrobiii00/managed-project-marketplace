# Milestone 02 — راه‌اندازی PostgreSQL + Prisma و اولین Migration

> وضعیت: ✅ تکمیل و اجرا شده روی PostgreSQL 17.11 واقعی
> خروجی: `prisma/migrations/20260904163053_init/migration.sql` (اعمال‌شده روی دیتابیس)
> Schema مرحله ۰۱: **بدون هیچ تغییری** دست‌نخورده ماند (`prisma validate` ✔)

---

## ۱) ساختار مورد نیاز پروژه (پیش از Backend)

```
managed-project-marketplace/
├── .env                      # اتصال دیتابیس — در git قرار نمی‌گیرد (gitignore)
├── .env.example              # الگوی .env با مقدار placeholder — commit می‌شود
├── .gitignore                # شامل .env و node_modules
├── package.json              # اسکریپت‌های db:* و وابستگی‌ها
├── prisma/
│   ├── schema.prisma         # تکلیف‌شده در مرحله ۰۱ — دست‌نخورده
│   └── migrations/
│       ├── migration_lock.toml      # قفل provider دیتابیس (postgresql)
│       └── 20260904163053_init/
│           └── migration.sql        # DDL کامل: 12 جدول، 8 enum، 23 ایندکس، 18 FK
├── scripts/
│   └── db-check.ts           # بررسی اتصال Prisma → PostgreSQL
└── docs/                     # مستندات milestoneها
```

نقش هر قطعه در زنجیره‌ی این مرحله:

```
Project → PostgreSQL (سرور در حال اجرا) → Prisma CLI → schema.prisma → migration.sql → دیتابیس marketplace
```

## ۲) نسخه‌های انتخابی (با دلیل)

| پکیج | نسخه | جای نصب | دلیل |
|---|---|---|---|
| `prisma` | ^6.19.3 | devDependencies | خط 6.x پایدار با الگوی استاندارد `env("DATABASE_URL")`؛ خط 7 الگوی جدید `prisma.config.ts` + Driver Adapter را الزامی می‌کند که برای MVP پیچیدگی زائد است. |
| `@prisma/client` | ^6.19.3 | dependencies | وابستگیِ **زمان اجرا** است (بر خلاف CLI) — بعداً همه‌ی Serviceها از آن import می‌کنند. هم‌نسخه با CLI. |
| `tsx` | ^4.23.13 | devDependencies | فقط برای اجرای `scripts/db-check.ts` بدون مرحله build. |

## ۳) گام ۰ — نصب و اجرای PostgreSQL (در صورت نبود)

**اوبونتو/دبیان:**
```bash
sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql     # اجرای خودکار بعد از reboot
sudo systemctl status postgresql           # باید active باشد
```

**macOS (Homebrew):**
```bash
brew install postgresql@17 && brew services start postgresql@17
```

**ویندوز:** نصب‌کننده‌ی رسمی postgresql.org (پورت پیش‌فرض 5432، یادآوری رمز کاربر `postgres`).

ساخت کاربر و دیتابیس (یک‌بار، روی هر محیط):
```bash
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'رمز-محلی-شما';"
sudo -u postgres createdb marketplace
```

> Docker در این مرحله لازم نیست؛ نصب محلی ساده‌تر و کاملاً کافی است.

## ۴) گام‌های اجرا به‌ترتیب

```bash
# 1) نصب وابستگی‌ها (prisma CLI + prisma client + tsx)
npm install

# 2) ساخت .env از روی الگو و تنظیم DATABASE_URL
cp .env.example .env
#   سپس مقدار را ویرایش کنید (فقط placeholder — رمز واقعی نگذارید):
#   DATABASE_URL="postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/marketplace?schema=public"

# 3) بررسی اعتبار schema (باید بگوید valid)
npx prisma validate

# 4) تولید Prisma Client
npx prisma generate

# 5) اولین migration (ساخت فایل + اعمال روی دیتابیس)
npx prisma migrate dev --name init

# 6) بررسی وضعیت migration
npx prisma migrate status     # باید: "Database schema is up to date!"

# 7) بررسی اتصال Prisma → PostgreSQL (جدول‌ها + enumها + رکورد migration)
npm run db:check

# 8) (اختیاری) مشاهده‌ی بصری دیتابیس
npx prisma studio
```

## ۵) چرا `.env` نباید commit شود؟

1. **نشتی دائمی اعتبارنامه:** هر چیزی در Git history می‌ماند؛ حتی اگر بعداً فایل را حذف کنید، رمز در تاریخچه باقی می‌ماند و فقط با rewrite تاریخچه پاک می‌شود.
2. **مقدار per-environment است:** دسکتاپ، CI و سرور هرکدام `DATABASE_URL` خودشان را دارند؛ commit کردن یعنی تداخل ثابت.
3. **چرخش رمز دشوار می‌شود:** با هر leak ناچار به تعویض رمز و پاک‌سازی تاریخچه‌ی مخزن خواهید شد.

راه‌حل استاندارد: `.env` در `.gitignore` (انجام شده ✔) و `.env.example` با مقدار placeholder به‌عنوان الگو commit می‌شود (انجام شده ✔).

## ۶) دستورات بررسی پس از Migration

```bash
# وضعیت migrationها از دید Prisma
npx prisma migrate status

# لیست جدول‌ها با psql
psql -h localhost -U postgres -d marketplace -c '\dt'

# ساختار یک جدول (مثلاً matches)
psql -h localhost -U postgres -d marketplace -c '\d matches'

# رکوردهای migration ثبت‌شده
psql -h localhost -U postgres -d marketplace -c 'SELECT migration_name, finished_at FROM _prisma_migrations;'

# شمارش enumهای ساخته‌شده (باید 8 باشد)
psql -h localhost -U postgres -d marketplace -tAc \
  "SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e';"
```

خروجی واقعی اجرا در این محیط:
- `\dt` → ۱۲ جدول اپلیکیشن + `_prisma_migrations` (سیستمی) ✔
- enum count → **8** ✔
- `migrate status` → «1 migration found … Database schema is up to date!» ✔
- `npm run db:check` → اتصال برقرار، 12/12 جدول، 8/8 enum ✔

## ۷) خطاهای محتمل همین مرحله و روش رفع

| خطا | علت | رفع |
|---|---|---|
| `P1001: Can't reach database server at localhost:5432` | سرویس PostgreSQL اجرا نیست | `sudo systemctl start postgresql` (یا `brew services start postgresql@17`) |
| `P1000: Authentication failed for user postgres` | رمز در `DATABASE_URL` با رمز واقعی نمی‌خواند | رمز را با `ALTER USER postgres PASSWORD '...'` تنظیم و URL را اصلاح کنید؛ کاراکترهای خاص را URL-encode کنید (مثلاً `@` → `%40`) |
| `database "marketplace" does not exist` | دیتابیس ساخته نشده | `sudo -u postgres createdb marketplace` |
| `ECONNREFUSED ::1:5432` (IPv6) | localhost به ::1 resolve می‌شود ولی PG فقط روی IPv4 است | در `DATABASE_URL` به‌جای `localhost` از `127.0.0.1` استفاده کنید |
| خطای Shadow Database (`P3006` / مجوز CREATEDB) | `migrate dev` برای diff گرفتن به دیتابیس موقت نیاز دارد | به کاربرِ اتصال، مجوز بدهید: `ALTER USER postgres CREATEDB;` |
| `migrate dev` در حالت drift | دیتابیس به‌صورت دستی تغییر کرده | `npx prisma migrate reset` (دیتابیس را drop و migrationها را از نو می‌سازد — فقط محیط dev) |
| تایم‌اوت دانلود engineها | اولین اجرا به اینترنت نیاز دارد | پراکسی/شبکه را بررسی کنید؛ engineها در `node_modules` کش می‌شوند |

## ۸) چک‌لیست موفقیت مرحله ۰۲

- [ ] PostgreSQL نصب و **در حال اجرا** است (`systemctl status postgresql` → active)
- [ ] دیتابیس `marketplace` ساخته شده
- [ ] `.env` ساخته شده و `DATABASE_URL` صحیح است (فقط placeholder)
- [ ] `.env` در `.gitignore` موجود است و `.env.example` commit می‌شود
- [ ] `npx prisma validate` → «schema is valid»
- [ ] `npx prisma generate` → Prisma Client تولید شد
- [ ] `npx prisma migrate dev --name init` → پوشه‌ی `prisma/migrations/*_init/migration.sql` ساخته و اعمال شد
- [ ] `npx prisma migrate status` → «Database schema is up to date!»
- [ ] `psql \dt` → ۱۲ جدول + `_prisma_migrations`
- [ ] شمارش enum → ۸
- [ ] `npm run db:check` → اتصال موفق + 12/12 جدول + 8/8 enum + رکورد migration

اگر همه‌ی موارد بالا ✔ بود، مرحله ۰۲ کامل است و پایه آماده ورود به مرحله ۰۳ (پیکربندی پروژه Backend) است.
