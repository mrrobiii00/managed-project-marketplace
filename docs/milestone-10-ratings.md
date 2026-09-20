# Milestone 10 — Rating + Reputation System

> وضعیت: ✅ تکمیل — ۶۷ unit test (26+23+18) · ۴۳+ integration test (شامل چرخه‌ی E2E کامل) · regression سبز
> **Schema تغییر نکرد · Migration ساخته نشد** (مدل `ratings` از M01 با unique لازم موجود بود — `migrate diff` → «No difference detected»)

---

## ۱) بررسی قبل از پیاده‌سازی

مدل `Rating` موجود: id/projectId/fromUserId/toUserId/score/review/createdAt + **`@@unique([projectId, fromUserId, toUserId])`** (از M01) → کافی؛ بدون گزارش کمبود. middlewareها/قرارداد خطا بازاستفاده شد.

## ۲) APIهای جدید

| متد | مسیر | دسترسی |
|---|---|---|
| POST | `/api/v1/admin/projects/:projectId/complete` | فقط ADMIN — IN_PROGRESS→COMPLETED |
| POST | `/api/v1/projects/:projectId/ratings` | فقط طرف پروژه (مالک/عضو تیم) پس از COMPLETED |
| GET | `/api/v1/projects/:projectId/ratings` | مالک · عضو تیم · ADMIN (غیرمرتبط 404) |
| GET | `/api/v1/users/:userId/reputation` | هر کاربر احراز هویت‌شده (عمومی) |

## ۳) Project Completion (اتمیک)

شرط‌ها به‌ترتیب: وجود (404) → IN_PROGRESS (409) → تیم باشد (409 TEAM_NOT_FOUND) → ≥۱ عضو (409 TEAM_EMPTY) → تیم **ACTIVE** (409 TEAM_NOT_ACTIVE — تیم PROPOSED رد می‌شود) → ≥۱ تسک (409 NO_TASKS) → همه DONE (409 INCOMPLETE_TASKS) → سپس در یک transaction: `Project→COMPLETED` + `Team→COMPLETED` (updateMany شرطی؛ rollback کامل).

**تصمیم مستند (تناقض spec):** spec از یک سو «Team ACTIVE/PROPOSED → COMPLETED» و از سوی دیگر «تیم PROPOSED → 409» و تست ۸ را می‌خواست. راه‌حل: endpoint «start» (M09) حالا در همان transactionِ TEAM_PROPOSED→IN_PROGRESS، تیم را هم PROPOSED→ACTIVE می‌کند؛ بنابراین در Complete فقط ACTIVE پذیرفته می‌شود (تست ۸ ✓). این تنها تغییر رفتاری M09 است و هیچ regressionی نساخت (تست‌های M09 تیم را بعد از start بررسی نمی‌کردند؛ prohibition مربوط به خود M09 بود).

## ۴) Rating — قوانین

- فقط بعد از COMPLETED (وگرنه 409 PROJECT_NOT_COMPLETABLE)
- CLIENT مالک ← اعضای تیم · SPECIALIST عضو ← مالک پروژه · ADMIN طرف نیست (403)
- Self-rating → 422 · تکراری → 409 (unique موجود DB) · score صحیح 1..5 (422) · review تریم 1..2000 (خالی → 422)
- fromUserId فقط از توکن · projectId فقط از مسیر (spoof در body نادیده گرفته شد — تست شد)
- بدون PUT/DELETE عمومی (ویرایش‌ناپذیر)
- هویت عمومی فقط (id + fullName) — بدون email/passwordHash

## ۵) Reputation — از داده‌ی واقعی

`averageRating = SUM/COUNT` (round2، null اگر هیچ) · `ratingCount` · `completedProjects = عضویت در تیم‌های COMPLETED` · `trustScore` با همان توابع M07 (`calculateTrustScore` از `matching.engine` — بدون duplicate logic و بدون تغییر رفتار M07):
`Trust = 0.7×RatingScore + 0.3×CompletedProjectsScore` · RatingScore = avg×20 (بدون رتبه → 50) · CompletedProjectsScore = mapping موتور (0→0 · 1→40 · 2→70 · 3→90 · 4+→100)

**انحراف مستند:** بخش «Trust Score» در spec یک mapping جدید (0→50 · 1-2→60 · 3-5→80 · 6+→100) نوشته بود که با قید قویتر «فرمول M07 حفظ شود + تست‌های M07 پاس بمانند» در تناقض بود (تغییر mapping، تست‌های unit M07 را می‌شکست). منطق مشترک M07 حفظ شد.

## ۶) تست‌ها

- **Unit: ۱۸** (جمع ۶۷ با M07/M09) — score validation · self-rating · ماتریس مجوز ارزیابی (resolveRaterType) · فرمول RatingScore/ProjectScore/Trust · computeReputation (cold-start=50، میانگین 4.33، trust=56/61/100)
- **Integration: ۴۳+** — Complete 1-14 ✔ (نه‌توکن/نقش‌ها/404/409×6/موفق/repeat + DB) · Rating 15-29 ✔ (شامل spoof ×2، self، duplicate، 422×4، admin-403، عدم وجود PUT/DELETE) · Read 30-35 ✔ (غیرمرتبط 404، IDOR 404، بدون فیلد حساس) · Reputation 36-43 ✔ (مقادیر دقیقاً برابر محاسبه‌ی مستقل از DB: clientA avg=4/count=2/completed=0/trust=56 · specA avg=5/count=3/completed=6/trust=100)
- **E2E Regression (زنده):** پروژه‌ی تازه از صفر: create→submit→matching (نخستین گزینه 97.5 RECOMMENDED)→review→team→start (تیم AUTO ACTIVE)→rating-روی-IN_PROGRESS (409)→تسک→DONE→complete (200؛ project+team COMPLETED)→rating متخصص→کارفرما (201) — کل زنجیره‌ی M06→M10 با کد فعلی سبز
- **Regression M07/M08/M09:** unit 67/67 + روی داده‌ی زنده: matches/admin-matches/team/tasks همه 200

## ۷) Build / Database

`npm run build` exit=0 · `prisma validate` valid · `migrate status` up to date · `migrate diff` **No difference detected** · فقط `20260904163053_init` · health 200

## ۸) محدودیت‌ها

1. mapping جدید CompletedProjects در spec اعمال نشد (توضیح بالا) — در صورت تمایل قابل تغییر با یک تصمیم صریح
2. تفاوت قالب‌بندی avg در مقایسه‌ی تست (عدد 4 در برابر «4.00») — داده یکسان
3. اصلاح rating اشتباه فقط از طریق عملیات DB (طبق spec، بدون API)
4. Review متن ارزیابی در خروجی لیست برمی‌گردد (عمومی برای طرفین پروژه)

## ۹) دستورات

```bash
npm run build && npm run start      # اجرا
npm run test:unit                   # ۶۷ تست خالص
bash scripts/m10-setup.sh           # بازسازی داده‌ی تست (بعد از reset)
npm run test:integration            # تست‌های M10 (نیازمند سرور در حال اجرا)
```

## ۱۰) Hotfix Verification — تصمیم رسمی Lifecycle تیم

> تصمیم رسمی (تأییدشده): `ADMIN START` در **یک transaction** → `Project: TEAM_PROPOSED→IN_PROGRESS` + `Team: PROPOSED→ACTIVE`؛ سپس `ADMIN COMPLETE` → هر دو `COMPLETED`.

- **بازبینی کد:** هر دو `updateMany` شرطی داخل همان `prisma.$transaction` — شکست هرکدام، کل transaction را rollback می‌کند (`admin.service.ts → startProjectExecution`)
- **تست‌های اختصاصی** (`scripts/m10-hotfix-verify.sh`):
  - TEST-1 ✓ بعد از start موفق: `project=IN_PROGRESS` + `team=ACTIVE` (ادعای صریح DB)
  - TEST-2 ✓ rollback: تیم خراب‌کاری‌شده (COMPLETED) → start با 409 و **پروژه در TEAM_PROPOSED ماند** (هیچ تغییر ناقصی ثبت نشد)
  - TEST-2b ✓ بازیابی: اصلاح تیم → start مجدد موفق
  - TEST-3 ✓ repeated start → 409 بدون تغییر وضعیت‌ها
  - TEST-4 ✓ زنجیره‌ی کامل رسمی: start → تسک DONE → complete → `project=COMPLETED` + `team=COMPLETED`
- Regression: ۶۷ unit ✔ · integration M10 کامل بدون خطا (exit=0) · build ✔ · validate ✔ · migrate status ✔ · diff «No difference detected» ✔ · بدون تغییر schema/migration/API
