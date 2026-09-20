# Milestone 06 — ماژول Projects

> وضعیت: ✅ تکمیل — build موفق، ۳۷+ سناریوی تست اجرا و موفق
> بدون تغییر `prisma/schema.prisma` (validate ✔ · migrate diff → «No difference detected») · بدون Migration جدید

---

## ۱) APIهای نهایی

| متد | مسیر | حفاظت | توضیح |
|---|---|---|---|
| POST | `/api/v1/projects` | requireAuth + CLIENT | ساخت تراکنشی پروژه + skills + roles — `clientId` فقط از `req.user.id` |
| GET | `/api/v1/projects/me` | requireAuth + CLIENT | پروژه‌های خود کارفرما + صفحه‌بندی (SPECIALIST/ADMIN → 403 مستند) |
| GET | `/api/v1/projects/:id` | requireAuth (هر نقش) | DRAFT فقط مالک؛ غیر DRAFT برای همه‌ی احراز هویت‌شده |
| PUT | `/api/v1/projects/:id` | requireAuth + CLIENT | فقط مالک، فقط در DRAFT/SUBMITTED — جایگزینی اتمی skills/roles |
| POST | `/api/v1/projects/:id/submit` | requireAuth + CLIENT | DRAFT → SUBMITTED با اعتبارسنجی کامل بودن از روی DB |
| DELETE | `/api/v1/projects/:id` | requireAuth + CLIENT | فقط مالک و فقط DRAFT |

## ۲) تصمیم‌های معماری مستند

1. **غیرمالک در PUT/DELETE/submit → 404** (نه 403): وجود پروژه افشا نشود (ضد IDOR). در GET، غیر DRAFTها عمومی‌اند پس 403/404 موضوعیت ندارد.
2. **ویرایش فقط در DRAFT و SUBMITTED** — با شروع فرآیند تطبیق (MATCHING+) پروژه قفل می‌شود (409).
3. **حذف فقط DRAFT** — SUBMITTED تا RATED → 409؛ **CANCELLED هم حذف نمی‌شود** (حفظ سوابق؛ حذف فیزیکی داده‌ی تاریخی خطرناک است).
4. **Skills/Roles در Create اختیاری** (چرخه‌ی wizard)؛ **حداقل‌ها در Submit** اعمال می‌شوند.
5. **Update با آرایه = جایگزینی کامل** (آرایه‌ی خالی = پاک‌کردن) — رفتار RESTful صریح و مستند.
6. **مهارت/نقش تکراری در همان درخواست → 422 (reject بدون merge)**؛ تکرارِ DB با unique constraint موجود (P2002) مهار می‌شود.
7. **Submit دوباره → 409** (وضعیت SUBMITTED قابل submit نیست).
8. **Budget Safety:** ورودی حداکثر ۲ رقم اعشار (Zod)؛ خروجی به‌صورت رشته‌ی Decimal؛ مقایسه‌ی min≤max بعد از ادغام با مقادیر موجود در Service (بدون محاسبه‌ی float روی مبالغ).
9. **deadline با round-trip strict** اعتبارسنجی می‌شود (JS تاریخ ناموجود مثل 02-30 را roll می‌کند — این حفره در تست 14 پیدا و رفع شد).
10. **`/projects/me` برای SPECIALIST/ADMIN → 403**: در MVP فعلی specialist مسیر مشاهده‌ی پروژه دارد (GET /:id برای غیر DRAFTها) اما «پروژه‌های من» برایش تعریف ندارد تا Milestone Matching؛ ADMIN هم خارج از scope این مرحله.

## ۳) Validationها (Zod)

`title` تریم 3..200 · `description` 20..10000 · `minBudget/maxBudget` ≥0 با ≤۲ رقم اعشار و min≤max (حتی بعد از merge با مقادیر موجود) · `deadline` فقط `YYYY-MM-DD` معتبر (round-trip) · `skillId` UUID + وجود در DB (وگرنه 404) · `isRequired` فقط boolean (پیش‌فرض true) · `roleName` تریم 2..100 یکتا در درخواست · `quantity` صحیح 1..20 · آرایه‌ها حداکثر ۲۰ آیتم · `page`≥1 و `pageSize` 1..100 · پارامتر `:id` باید UUID باشد (وگرنه 422).

## ۴) Authorization / قوانین امنیتی

`clientId` فقط از توکن · Zod کلیدهای ناشناخته (clientId/status/id/createdAt/updatedAt) را دور می‌ریزد → mass assignment بی‌اثر (آزمایش شد) · `status` فقط از مسیر submit و فقط با transition مجاز تغییر می‌کند · 404 یکسان برای «ناموجود» و «متعلق به دیگری» در مسیرهای مدیریتی · passwordHash/email هرگز در خروجی نیست (select صریح؛ grep=0).

## ۵) Project Status Rules

در این Milestone فقط: `DRAFT → SUBMITTED` (اتمیک با `updateMany` مقاوم به race). سایر transitionها (MATCHING به بعد + CANCELLED) عمداً پیاده نشدند.

## ۶) Transaction Strategy

- **Create:** `$transaction` → ساخت project + `createMany` skills + `createMany` roles (همه یا هیچ)
- **Update:** `$transaction` → update فیلدها + در صورت ارسال: `deleteMany`+`createMany` برای skills/roles (جایگزینی اتمی، بدون وضعیت ناقص)
- **Submit:** اعتبارسنجی از روی DB سپس `updateMany({where:{id, clientId, status:'DRAFT'}})` → transition اتمیک
- Cascade فقط همان‌های تعریف‌شده در Schema (بدون cascade جدید) — بعد از حذف، رکورد یتیم project_skills/roles = 0 (بررسی شد)

## ۷) نتایج تست‌ها (اجرای واقعی)

| # | تست | نتیجه | # | تست | نتیجه |
|---|---|---|---|---|---|
| 1 | POST بدون token | 401 | 20 | GET /me (5 پروژه + شمارش skills/roles) | 200 |
| 2 | PUT بدون token | 401 | 20b | /me برای SPECIALIST / ADMIN | 403 / 403 |
| 3 | SPECIALIST ساخت | 403 | 21 | pagination (page=2,size=1) + page=0 + pageSize=500 | 200 / 422 / 422 |
| 4 | ADMIN ساخت | 403 | 22 | جزئیات (مالک) + SPECIALIST→DRAFT | 200 / 404 |
| 5 | CLIENT ساخت کامل (با clientId/status جعلی در body) | **201** مالک=خودش، status=DRAFT | 22b | SPECIALIST→SUBMITTED | 200 |
| 6 | عنوان کوتاه | 422 | 23 | پروژه nonexistent | 404 |
| 7 | شرح کوتاه | 422 | 23b | UUID نامعتبر در param | 422 |
| 8 | بودجه منفی | 422 | 24 | owner update | 200 |
| 9 | min>max | 422 | 25 | non-owner update (body معتبر) | 404 |
| 10 | skillId با فرمت غلط | 422 | 26 | status با PUT | تغییرنکرد ✓ |
| 11 | skillId ناموجود | 404 | 27 | clientId با PUT | بی‌اثر ✓ |
| 12 | quantity=0 | 422 | 28 | skills replace (2→1) | 200 ✓ |
| 13 | فرمت deadline غلط | 422 | 29 | roles replace | 200 ✓ |
| 14 | تاریخ ناموجود 2026-02-30 | 422 (بعد از رفع باگ round-trip) | 30 | submit ناقص (با جزئیات نقص‌ها) | 422 |
| 15 | clientId جعلی در POST | بی‌اثر ✓ | 30b | deadline گذشته | 422 |
| 16 | status در PUT | بی‌اثر ✓ | 31 | submit کامل → SUBMITTED | 200 |
| 17 | clientId در PUT | بی‌اثر ✓ | 32 | submit غیرمالک | 404 |
| 18 | IDOR (GET/PUT/DELETE/submit) | 404 (PUT با body معتبر → 404) | 33 | submit دوباره | 409 |
| 18b | DRAFT توسط غیرمالک/specialist | 404 / 404 (مالک 200) | 34 | حذف DRAFT توسط مالک | 200 |
| 19 | passwordHash در پاسخ‌ها | 0 مورد ✓ | 35 | حذف غیرمالک | 404 |
| — | — | — | 36 | حذف SUBMITTED | 409 |
| — | — | — | 37 | حذف nonexistent | 404 |

## ۸) Build / Database

`npm run build` → exit=0 · `prisma validate` → valid · `migrate status` → up to date · `migrate diff` → **No difference detected** · migrations فقط `20260904163053_init` · `/health` و `/health/db` → 200

## ۹) باقی‌مانده برای Milestoneهای بعد

- `SUBMITTED → MATCHING` و اجرای موتور تطبیق (M07) — این ماژول دقیقاً روی `SUBMITTED` آماده ورود است
- انتقال `SUBMITTED → CANCELLED` (لغو توسط کارفرما) — طبق scope این مرحله پیاده نشد
- صف بررسی ادمین و APIهای مدیریت وضعیت (M07/M08)
- ویرایش پروژه بعد از MATCHING (فعلاً 409 — در صورت نیاز سیاست جدید مستند شود)
