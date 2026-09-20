# Milestone 03 — پیکربندی Backend پایه (Express + TypeScript + Prisma)

> وضعیت: ✅ تکمیل — build موفق، اجرا موفق، هر سه endpoint تست‌شده روی PostgreSQL واقعی
> بدون تغییر در `prisma/schema.prisma` و `prisma/migrations/` و بدون هیچ Feature کسب‌وکاری

---

## ۱) ساختار نهایی

```
managed-project-marketplace/
├── .env / .env.example        # PORT · NODE_ENV · CORS_ORIGINS · DATABASE_URL
├── package.json               # اسکریپت‌های dev/build/start + db:*
├── tsconfig.json              # پیکربندی TypeScript (strict, NodeNext, rootDir=backend/src)
├── prisma/                    # دست‌نخورده (schema + migrations)
├── scripts/db-check.ts        # از Milestone 02
├── docs/
└── backend/
    └── src/
        ├── middleware/
        │   ├── error-handler.ts   # JSON استاندارد خطا + پنهان‌سازی stack در production
        │   └── not-found.ts       # 404 با پاسخ استاندارد
        ├── utils/
        │   ├── env.ts             # اعتبارسنجی متغیرهای محیط با Zod
        │   └── http-error.ts      # کلاس HttpError برای milestoneهای بعدی
        ├── database/
        │   └── prisma.ts          # singleton مشترک Prisma Client
        ├── app.ts                 # express + helmet + cors + json + health routes
        └── server.ts              # listen روی PORT از env + Graceful Shutdown
```

## ۲) پکیج‌های نصب‌شده (runtime)

`@prisma/client 6.19.3` · `express 5.2.1` · `cors 2.8.6` · `helmet 8.3.0` · `zod 4.5.4` · `dotenv 17.4.2`

(dev): `typescript 7.0.2` · `tsx 4.23.13` · `@types/node 26.4.1` · `@types/express 5.0.6` · `@types/cors 2.8.19` · `prisma 6.19.3`

## ۳) دستورات اجرا

```bash
npm install          # نصب وابستگی‌ها
npm run dev          # توسعه با reload خودکار (tsx watch)
npm run build        # کامپایل TypeScript → dist/
npm run start        # اجرای خروجی build (node dist/server.js)
npm run db:generate  # prisma generate
npm run db:check     # اسکریپت بررسی اتصال (Milestone 02)
```

## ۴) نتایج تست واقعی

| تست | نتیجه |
|---|---|
| `npm run build` (tsc) | ✔ exit=0 — ۷ فایل JS در `dist/` |
| اجرای `node dist/server.js` | ✔ `🚀 Backend running at http://localhost:4000 (development)` |
| `GET /health` | ✔ HTTP 200 — `{"success":true,"message":"Backend is running"}` |
| `GET /health/db` | ✔ HTTP 200 — `{"success":true,"message":"Database connection is healthy","data":{"latencyMs":49}}` |
| مسیر ناشناخته | ✔ HTTP 404 — `{"success":false,"message":"مسیر «GET /api/v1/nonexistent» یافت نشد"}` |
| هدرهای helmet | ✔ CSP · HSTS · X-Frame-Options · nosniff · Referrer-Policy |

## ۵) طراحی CORS (بدون `*` دائمی)

- `CORS_ORIGINS` تنظیم شده → فقط همان originها مجازند (الگوی تولید: reflect whitelist)
- تنظیم نشده + `NODE_ENV=development` → همه‌ی originها (فقط برای راحتی توسعه)
- تنظیم نشده + `NODE_ENV=production` → هیچ origin مرورگری مجاز نیست (must configure)

## ۶) قرارداد پاسخ JSON

- موفق: `{ success: true, message, data? }`
- خطا: `{ success: false, message, errors?[], stack? (فقط development) }`
- کدهای خطا: ZodError→422 · HttpError→کد دلخواه · خطای ساختار Express→400..499 · ناشناخته→500 (در production فقط «خطای داخلی سرور»)

## ۷) خطاهای محتمل همین مرحله و رفع

| خطا | علت | رفع |
|---|---|---|
| `EADDRINUSE :::4000` | پورت 4000 اشغال است | `PORT` دیگری در `.env` یا کشتن فرآیند قبلی |
| `❌ متغیرهای محیط نامعتبر` و خروج | `DATABASE_URL` ناقص/غلط | `.env` را از `.env.example` بازسازی کنید |
| `tsx: command not found` | `node_modules` نصب نیست | `npm install` |
| خروجی `dist/server.js` پیدا نمی‌شود | build اجرا نشده | `npm run build` قبل از `npm run start` |
| `GET /health/db` → 503 | PostgreSQL خاموش/رمز غلط | سرویس را start کنید؛ `DATABASE_URL` را چک کنید (جزئیات فقط در dev برمی‌گردد) |
| خطای نوع هنگام build | `@types/express` نصب نیست | `npm install -D @types/express @types/cors` |
| تغییر پورت اثر ندارد | `.env` ویرایش شده ولی سرور restart نشده | restart (tsx watch فقط فایل‌های src را واچ می‌کند؛ برای .env ری‌استارت دستی) |

## ۸) چک‌لیست Milestone 03

- [x] وابستگی‌ها نصب شد (express, cors, helmet, zod, dotenv + dev types) — بدون نصب مجدد غیرضروری
- [x] `tsconfig.json` مناسب (strict / NodeNext / خروجی `dist/`)
- [x] `backend/src/database/prisma.ts` — singleton با همان `DATABASE_URL` (بدون connection string جدید)
- [x] `backend/src/app.ts` — express + JSON parser + CORS + Helmet + Error handling پایه + جای mount کردن routeهای آینده
- [x] `backend/src/server.ts` — PORT از env (پیش‌فرض 4000) + Graceful Shutdown
- [x] `GET /health` → `{"success":true,"message":"Backend is running"}`
- [x] `GET /health/db` → اتصال واقعی Prisma→PostgreSQL با `SELECT 1` غیرمخرب
- [x] Error handling: ناشناخته/Zod آینده/JSON استاندارد/پنهان‌سازی stack در production
- [x] CORS بر اساس env (بدون `*` دائمی)
- [x] `.env.example` فقط با placeholder → PORT / NODE_ENV / DATABASE_URL (+CORS_ORIGINS اختیاری)
- [x] `.env` در `.gitignore` (از قبل موجود)
- [x] اسکریپت‌های dev/build/start/db:generate/db:check (اسکریپت‌های قبلی حفظ شدند)
- [x] TypeScript build تست شد — بدون خطا
- [x] Backend اجرا و هر سه endpoint تست شد (خروجی واقعی در بالا)
- [x] هیچ تغییری در `prisma/schema.prisma` و `prisma/migrations/`
- [x] هیچ Feature کسب‌وکاری/Auth/JWT پیاده نشد
