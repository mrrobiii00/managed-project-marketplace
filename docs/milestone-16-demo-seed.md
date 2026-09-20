# مایل‌استون 16 — داده و دموی End-to-End قابل تکرار

> وضعیت: ✅ Complete — بدون تغییر در بک‌اند/اسکیما/مایگریشن/فرانت‌اند

## ۱) Status

**Complete.** Seed دمو idempotent ساخته و سه‌بار اجرا شد (۳۲ ایجاد / ۰ / ۰)؛ کل چرخه‌ی پروژه‌ها از **workflow واقعی API** عبور کرده؛ ۳۵/۳۵ تست §30 پاس.

## ۲) Seed Files

**جدید (۲):** `scripts/demo-seed.ts` (فقط فایل seed دمو — کاربران با Prisma+Argon2id، همه‌ی پروژه‌ها/تیم‌ها/تسک‌ها/ارزیابی‌ها از API واقعی) · `scripts/demo-clean.ts` (حذف فقط رکوردهای دمو با Cascade)
**تغییر (۳):** `package.json` (+`db:seed:demo` / `db:seed:demo:clean`) · `README.md` (جدید — وجود نداشت؛ بخش دمو + راه‌اندازی) · `docs/demo.md` (جدید — راهنمای کامل ارائه)
Seed موجود (`prisma/seed.ts` — مهارت‌ها) دست‌نخورده و به‌عنوان پیش‌نیاز استفاده شد (§33).

## ۳) Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| کارفرما | demo.client@example.com | Demo12345! |
| متخصص فرانت‌اند | demo.frontend@example.com | Demo12345! |
| متخصص بک‌اند | demo.backend@example.com | Demo12345! |
| مدیر سیستم | demo.admin@example.com | Demo12345! |

Argon2id (همان کانفیگ auth.service) — فرمت `$argon2id$…` در DB تأیید شد؛ plaintext فقط ورودی seed.

## ۴) Demo Data (شمارش نهایی)

کاربران ۴ · پروفایل ۴ · user_skills ۱۰ (۴ فرانت‌اند + ۶ بک‌اند) · پروژه ۳ · matches ۶ (مربوط به پروژه‌های دمو) · تیم ۲ · اعضای تیم ۴ · تسک ۵ · ارزیابی ۴.
(+ در وضعیت coexistence با fixture m7: کاربران ۱۵، پروژه‌ها ۱۷ — داده‌ی m7 دست‌نخورده ماند.)

## ۵) Demo Projects

| پروژه | وضعیت | تیم | تسک‌ها | ارزیابی |
| --- | --- | --- | --- | --- |
| الف — طراحی و توسعه فروشگاه اینترنتی | **IN_PROGRESS** | ACTIVE؛ امتیاز تیم ۷۵.۸۴؛ اعضا با matchScore واقعی ۷۷.۵ / ۷۴.۱۷ | TODO + IN_PROGRESS + DONE (Progress: ۱ از ۳) | — |
| ب — اپلیکیشن مدیریت تیم ریموت | **MATCHING** | — | — | پیشنهادها: فرانت‌اند **RECOMMENDED ۸۸.۵ (trust ۸۲)** · بک‌اند NEEDS_REVIEW ۸۱.۵ |
| ج — طراحی وب‌سایت آموزش برنامه‌نویسی | **COMPLETED** | COMPLETED — ۲ عضو | ۲ تسک، هر دو DONE | ۴ ارزیابی واقعی (۵★/۴★ دوطرفه) |

**انحراف مستند از §9:** پرامپت وضعیت SUBMITTED برای پروژه‌ی «ب» خواسته بود؛ اما پیشنهادها فقط پس از اجرای موتور تطبیق وجود دارند که پروژه را به MATCHING می‌برد — workflow واقعی مبناست (§25) و بدون bypass رعایت شد.

## ۶) End-to-End Flow

سناریوی کامل ۱۸ مرحله‌ای (§13) در `docs/demo.md` مستند و از طریق API قابل اجرا است: ورود کارفرما → داشبورد → پروژه‌ها → Workspace الف (تیم/تسک/پیشرفت) → پروژه‌ی ج (ارزیابی‌ها) → ورود متخصص → داشبورد → پیشنهادها → جزئیات (MatchBreakdown) → Workspace → پروفایل (Reputation: میانگین ۵، trust ۸۲) → ورود مدیر → داشبورد ۴ بخشی.

## ۷) Idempotency

| اجرا | ایجاد | موجود (skip) | داده‌ی نهایی |
| --- | --- | --- | --- |
| اول (DB تمیز) | ۳۲ | ۰ | ۳ پروژه / ۶ match / ۲ تیم / ۵ تسک / ۴ rating |
| دوم | **۰** | ۲۸ | یکسان — بدون هیچ duplicate |
| سوم (پس از رگرسیون، روی fixture m7) | ۳۲ | ۰ | همان مقادیر + coexistence |
| چهارم | **۰** | ۲۸ | یکسان |

منطق skip: email (users) · profile存在 · GET skills قبل از POST · clientId+title (پروژه‌ها) · GET team قبل از ساخت · title (تسک‌ها) · 409 (rating) · وضعیت جاری پروژه برای هر step چرخه.

## ۸) Database Verification

users=15 (۴ دمو + ۱۱ m7) · profiles=15 · skills=20 · user_skills دمو=10 · projects=17 · teams=9 · tasks=8 · ratings=8 · matches=18 — بدون duplicate (همه‌ی uniqueها برقرار؛ شمارش دقیق دمو در §4).

## ۹) API Verification (§22)

- **Auth:** login هر ۴ حساب دمو ✓ (token معتبر)
- **Client:** `projects/me` = ۳ پروژه با وضعیت‌های درست ✓ · detail الف (skills/roles/client) ✓ · team (ACTIVE، امتیاز اعضا) ✓ · tasks (TODO/IN_PROGRESS/DONE) ✓
- **Specialist:** recommendations = ۲ (RECOMMENDED + NEEDS_REVIEW مرتب‌شده) ✓ · detail با شش مؤلفه‌ی توضیح‌پذیری ✓ · profile ✓ · reputation (avg 5/count 1/completed 1/trust 82) ✓ · workspace (project/team از دید متخصص) ✓
- **Admin:** summary (users 15/projects 17) ✓ · recent ✓ · attention ✓ · match-summary (18 total) ✓
- **Ratings:** ۴ ارزیابی پروژه‌ی ج با from/to/score/review ✓

## ۱۰) Tests (§30)

| # | سناریو | نتیجه | روش |
|---|---|---|---|
| 1 | seed اول (۳۲ ایجاد) | PASS | اجرا |
| 2 | seed دوم (۰ ایجاد / ۲۸ skip) | PASS | اجرا |
| 3 | بدون duplicate کاربر (۴ دمو) | PASS | SQL |
| 4 | بدون duplicate پروفایل (۴) | PASS | SQL |
| 5 | بدون duplicate مهارت catalog (۲۰) | PASS | SQL |
| 6 | بدون duplicate user_skills (۴+۶) | PASS | SQL |
| 7 | بدون duplicate پروژه (۳) | PASS | SQL |
| 8 | بدون duplicate تیم (۲) | PASS | SQL |
| 9 | بدون duplicate عضو تیم (۲+۲) | PASS | SQL |
| 10 | بدون duplicate ارزیابی (۴) | PASS | SQL |
| 11 | password hash — Argon2id در DB + login موفق | PASS | SQL+CURL |
| 12-14 | login کارفرما/متخصص/مدیر دمو | PASS | CURL |
| 15 | لیست پروژه‌های کارفرما (۳) | PASS | CURL |
| 16 | جزئیات پروژه‌ی اصلی (IN_PROGRESS) | PASS | CURL |
| 17 | تیم پروژه‌ی اصلی (۲ عضو + matchScore) | PASS | CURL |
| 18 | تسک‌ها (TODO/IN_PROGRESS/DONE) | PASS | CURL |
| 19 | پیشنهادهای متخصص (۲؛ شامل RECOMMENDED 88.5) | PASS | CURL |
| 20 | جزئیات پیشنهاد + توضیح‌پذیری | PASS | CURL |
| 21 | reputation متخصص (5/1/1/82) | PASS | CURL |
| 22 | admin summary | PASS | CURL |
| 23 | admin recent projects | PASS | CURL |
| 24 | admin attention | PASS | CURL |
| 25 | admin match summary | PASS | CURL |
| 26 | ارزیابی‌های پروژه‌ی تکمیل‌شده (۴) | PASS | CURL |
| 27 | هیچ passwordHash در پاسخ‌های API | PASS | CURL+grep |
| 28 | بدون reset دیتابیس (فقط create؛ clean فقط دمو) | PASS | CODE |
| 29 | frontend build ✓ | PASS | اجرا |
| 30 | TypeScript strict ✓ (فرانت دست‌نخورده) | PASS | اجرا |
| 31 | backend build ✓ | PASS | اجرا |
| 32 | unit 67/67 ✓ | PASS | اجرا |
| 33 | prisma validate ✓ | PASS | اجرا |
| 34 | migrate status: up to date ✓ | PASS | اجرا |
| 35 | migrate diff: No difference ✓ | PASS | اجرا |

## ۱۱) Regression

| مورد | نتیجه |
| --- | --- |
| M11 | **25/25** (canonical — DB تمیز + m10-setup، قبل از داده‌ی دمو) |
| M12 | **32/32** (canonical) |
| M14-B…G، M15 | فرانت‌اند صفر تغییر در این مایل‌استون؛ build/tsc سبز و routeهای SPA همه 200 |
| Backend unit | 67/67 |
| Prisma | validate ✓ · up to date ✓ · No difference ✓ |

نکته: assertionهای M11/M12 به fixture اختصاصی m7 گره‌اند (شمارش دقیق)؛ برای همین روی DB تمیز اجرا شدند و سپس seed دمو به‌عنوان coexistence روی همان DB افزوده شد (داده‌ی m7 دست‌نخورده: ۱۱ کاربر / ۷ پروژه).

## ۱۲) Security

- password فقط Argon2id در DB (تأیید فرمت) — plaintext فقط ورودی اسکریپت.
- هیچ passwordHash در هیچ پاسخ API (grep روی auth/me، recommendations، ratings).
- credentialها فقط در docs/demo.md (دموی دانشگاهی).
- هیچ token ذخیره نمی‌شود؛ seed فقط در حین اجرا login می‌کند.
- شناسه‌های ثابت فقط برای ۴ کاربر دمو؛ هیچ UUID کاربر دیگر overwrite نشد (id موجود m7 در coexistence دست‌نخورده).

## ۱۳) Scope Guard (§32)

**Backend business logic changed: NO · Schema changed: NO · Migration changed: NO · Matching/Trust/Recommendation/Team/Task/Rating/Lifecycle changed: NO · Frontend business feature: NO · Payment/Chat/AI/Redis/WebSocket/Redux/Zustand/React Query: NO · Database reset: NO**
فایل‌های تغییرکرده: فقط `scripts/demo-seed.ts`، `scripts/demo-clean.ts`، `package.json` (اسکریپت‌های npm)، `README.md`، `docs/demo.md` (find -newermt: صفر فایل بک‌اند/اسکیما/مایگریشن/فرانت).

## ۱۴) Known Limitations

1. seed دمو به سرور در حال اجرا نیاز دارد (چون workflow واقعی را از API عبور می‌دهد) — در docs مستند شده.
2. مهارت «Prisma» در catalog وجود ندارد؛ طبق §5 مهارت جدید ساخته نشد و از مجموعه‌ی موجود (React/TS/JS/Node/Express/PostgreSQL/Git) استفاده شد. همچنین هر دو متخصص دمو مهارت‌های الزامی مشترک پروژه‌ها را دارند (الزام hard-filter موتور M07 برای عضویت در تیم — «مثلاً» §6 با محدودیت واقعی موتور تعبیر شد).
3. rate-limit ورود (۳۰/۱۵دقیقه): اجراهای متوالی seed/تست ممکن است به آن بخورد — ری‌استارت سرور یا چند دقیقه صبر (مستند در docs/demo.md).
4. m11/m12 تک‌اجرایی‌اند و assertionهایشان به fixture اختصاصی وابسته است (الگوی شناخته‌شده از M14-G/M15) — ترتیب canonical در گزارش §11 آمده.

## ۱۵) Demo Instructions

مسیر دقیق ارائه در **`docs/demo.md`**: راه‌اندازی (۵ گام) → جدول حساب‌ها → سناریوی ۱۸ مرحله‌ای End-to-End (کارفرما → متخصص → مدیر) + جدول سه پروژه‌ی دمو با وضعیت‌ها.
پیش‌نمایش زنده: backend :4000 · frontend :5173.
