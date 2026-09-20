# مایل‌استون 14-D — پروفایل متخصص در فرانت‌اند

> وضعیت: ✅ تکمیل‌شده — فقط فرانت‌اند؛ صفر تغییر محتوایی در بک‌اند/اسکیما/مایگریشن

## ۱) قرارداد بک‌اند (استخراج‌شده از source واقعی M05)

| Endpoint | Auth/RBAC | قرارداد |
|---|---|---|
| `GET /profile/me` | requireAuth (هر نقش) | 200 → `{userId, fullName\|null, bio\|null, jobTitle\|null, yearsOfExperience\|null, availability\|null(AVAILABLE/BUSY/UNAVAILABLE), avatarUrl\|null, hourlyRate(string\|null!), createdAt, updatedAt}` · **پروفایل نبود → 404** «پروفایلی برای شما ثبت نشده است» |
| `PUT /profile/me` | requireAuth | upsert؛ فیلدهای اختیاری: fullName(2..100)، bio(≤2000)، jobTitle(≤100)، yearsOfExperience(int 0..60)، availability(enum)، avatarUrl(http/https ≤500)، **hourlyRate(number 0..1e9، ≤2 اعشار)** — فیلد ارسال‌نشده تغییر نمی‌کند؛ کلیدهای ناشناخته دور ریخته می‌شوند → پاسخ: پروفایل کامل |
| `GET /profile/me/skills` | requireAuth | `{items:[{skillId, level(BEGINNER/INTERMEDIATE/ADVANCED/EXPERT), yearsOfExperience, skill:{id,name,category}}]}` مرتب بر اساس نام |
| `POST /profile/me/skills` | requireAuth | `{skillId:uuid, level:enum, yearsOfExperience:int 0..60}` → 201 · تکراری → **409** «این مهارت قبلاً در پروفایل شما ثبت شده است» · skillId ناموجود → 404 |
| `PUT /profile/me/skills/:skillId` | requireAuth | `{level?, yearsOfExperience?}` (حداقل یکی) → 200 |
| `DELETE /profile/me/skills/:skillId` | requireAuth | 200 بدون data · ثبت‌نشده → 404 «این مهارت در پروفایل شما ثبت نشده است» |
| `GET /skills` | عمومی | کاتالوگ ۲۰ مهارت (سرویس موجود M14-B) |
| `GET /specialists/:id` | requireAuth | DTO عمومی متخصص — **استفاده نشد (بند ۱۴؛ دلیل پایین)** |

**تصمیم بند ۱۴ (پروفایل عمومی):** endpoint واقعی وجود دارد، اما در UX فعلی هیچ نقطه‌ای به پروفایل متخصصِ دیگر لینک نمی‌دهد (Team/Matching UI هنوز در فرانت‌اند نیست) → طبق قید «فقط در صورتی که از نظر UX لازم باشد» صفحه‌ی `/specialist/profile/:id` ساخته نشد تا مسیر مرده ایجاد نشود؛ با UI تیم/تطبیق در مایل‌استون‌های بعدی اضافه می‌شود.

## ۲) فایل‌ها

**جدید (۳):** `types/profile.ts` (ProfileDto/ProfileUpdatePayload/UserSkillDto/AddSkillPayload/UpdateSkillPayload/Skill/دو enum)، `services/profile.service.ts` (۶ تابع typed)، `pages/specialist/SpecialistProfilePage.tsx`
**تغییر (۳):** `utils/status.ts` (+نگاشت فارسی availability و سطح مهارت)، `routes/AppRoutes.tsx` (+`/specialist/profile` زیر RoleGuard SPECIALIST)، `layouts/DashboardLayout.tsx` (فعال‌سازی «پروفایل» فقط برای SPECIALIST)

## ۳) پیاده‌سازی

- **پروفایل**: نمای فعلی (کارت خواندنی) + فرم ویرایش populate‌شده از GET واقعی؛ حالت ۴۰۴ = «هنوز ساخته نشده» → فرم تبدیل به «ساخت» می‌شود (upsert بک‌اند)؛ فقط فیلدهای پرشده ارسال می‌شوند (خالی = بدون تغییر)؛ validation آینه‌ی zod (۲..۱۰۰/≤۲۰۰۰/int ۰..۶۰/enum/URL/≤2 اعشار)؛ feedback موفقیت سبز + همگام‌سازی UI با پاسخ واقعی.
- **مهارت‌ها**: لیست واقعی (نام/دسته/سطح فارسی/سال) + ویرایش درجا (Select سطح + سال) + حذف با ConfirmDialog + افزودن از کاتالوگ واقعی با **جست‌وجو، گروه‌بندی دسته‌ای، chip های keyboard-friendly**؛ مهارت‌های ثبت‌شده از گزینه‌ها حذف می‌شوند (کنترل duplicate در UI؛ بک‌اند همچنان 409 می‌دهد).
- **امنیت**: هیچ userId/specialistId در هیچ درخواستی ارسال نمی‌شود (مالکیت از توکن)؛ system field ها در payload نیستند؛ بدون نمایش password/token؛ userId خود کاربر فقط در type قراردادی است و در UI رندر نمی‌شود؛ 401 → ابطال نشست سراسری M14-A.
- **حالت‌ها**: Loading/ErrorState+Retry برای هر دو بارگذاری اولیه؛ دکمه‌ها هنگام submit با loading غیرفعال (ضد double-submit).

## ۴) تست‌ها (TEST | RESULT | METHOD)

| # | سناریو | نتیجه | روش |
|---|---|---|---|
| 1 | SPECIALIST → صفحه پروفایل (API 200 + RoleGuard اجازه) | PASS | CURL + CODE |
| 2 | CLIENT → `/specialist/profile` → 403 (RoleGuard صفحه) | PASS | CODE |
| 3 | ADMIN → `/specialist/profile` → 403 | PASS | CODE |
| 4 | unauth → redirect به login | PASS | CURL(401) + CODE |
| 5 | GET واقعی پروفایل | PASS | CURL |
| 6 | فیلدها رندر می‌شوند (نمای فعلی + فرم populate) | PASS | CURL + CODE |
| 7 | ویرایش با داده‌ی معتبر → 200 «پروفایل ذخیره شد» | PASS | CURL |
| 8 | داده‌ی نامعتبر (fullName کوتاه/سال ۶۱/نرخ ۳ اعشار/URL غیرhttp/enum غلط → هر ۵ حالت 422) | PASS | CURL |
| 9 | ذخیره‌ی موفق + همگام‌سازی UI با پاسخ (years 10 / rate 550000.5) | PASS | CURL + CODE |
| 10 | خطای ذخیره (پیام فارسی سرور در بنر) | PASS | CURL + CODE |
| 11 | Loading state | PASS | CODE |
| 12 | Retry | PASS | CODE |
| 13 | GET کاتالوگ واقعی (۲۰ مهارت) | PASS | CURL |
| 14 | مهارت‌های فعلی نمایش (Figma/Node.js/React با سطح و سال) | PASS | CURL |
| 15 | افزودن DevOps → 201 | PASS | CURL |
| 16 | تکراری → 409 با پیام سرور (+ حذف از گزینه‌ها در UI) | PASS | CURL + CODE |
| 17 | ویرایش مهارت (PUT → ADVANCED/6) — endpoint موجود است و استفاده شد | PASS | CURL |
| 18 | حذف → 200 + sync مجدد | PASS | CURL |
| 19 | تأیید حذف (ConfirmDialog) | PASS | CODE |
| 20 | خطای API (حذف ثبت‌نشده → 404 فارسی) | PASS | CURL |
| 21 | بدون فیلد حساس در پاسخ‌ها (grep = 0) | PASS | CURL |
| 22 | بدون userId در payload (grep سرویس فقط کامنت) | PASS | CODE |
| 23 | بدون specialistId در `/profile/me` | PASS | CODE |
| 24 | 401 → ابطال نشست (مکانیزم M14-A) | PASS | CURL + CODE |
| 25-27 | موبایل/دسکتاپ/بدون overflow (گرید→تک‌ستون، chips جمع‌شونده) | PASS | CODE |
| 28-30 | کیبورد/label واقعی/پیام خطای قابل درک | PASS | CODE |
| 31 | frontend build | PASS | اجرا |
| 32 | TypeScript strict | PASS | اجرا |
| 33 | backend build | PASS | اجرا |
| 34 | backend unit 67/67 | PASS | اجرا |
| 35 | prisma validate | PASS | اجرا |
| 36 | migrate status (up to date) | PASS | اجرا |
| 37 | migrate diff «No difference detected» | PASS | اجرا |

**محدودیت:** browser automation موجود نیست (طبق §24 اضافه نشد)؛ موارد CODE با بازبینی کد/بیلد.

## ۵) Scope Verification

```
Backend files changed: 0 (۴ فایل prisma فقط mtime بازسازی محیط داشتند؛ محتوا دست‌نخورده — diff تأیید)
Prisma schema changed: 0
Migration files changed: 0
Matching/Trust/Recommendation/Team/Task/Rating logic changed: 0
```

**Schema changed: NO · Migration changed: NO · Backend business logic changed: NO** — بدون Apply/Accept، Team/Task/Rating UI، Chat/Payment/Notification/AI/Upload/Resume، React Query/Redux/Zustand/WebSocket.
