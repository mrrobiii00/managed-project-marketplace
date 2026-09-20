# مایل‌استون 14-B — مدیریت پروژه‌ی کارفرما در فرانت‌اند

> وضعیت: ✅ تکمیل‌شده — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) قرارداد بک‌اند (استخراج‌شده از کد واقعی M06)

| Endpoint | RBAC | قواعد کلیدی |
|---|---|---|
| `POST /projects` | CLIENT | body: title(3..200), description(20..10000), minBudget/maxBudget(number≥0, ≤2 اعشار), deadline(YYYY-MM-DD), skills[{skillId,isRequired?}]≤20 یکتا, roles[{roleName(2..100 یکتا), quantity(int 1..20)}]≤20 → 201 ProjectDto |
| `GET /projects/me?page&pageSize` | CLIENT | items: {id,title,status,minBudget/maxBudget(string\|null),deadline,createdAt,updatedAt,skillsCount,rolesCount} + metadata |
| `GET /projects/:id` | احراز هویت | DRAFT فقط مالک (404 غیرمالک)؛ بودجه string، deadline YYYY-MM-DD، client{id,fullName}، skills، roles |
| `PUT /projects/:id` | CLIENT | **فقط DRAFT\|SUBMITTED** — وگرنه 409 «قرو در وضعیت X قابل ویرایش نیست» |
| `POST /projects/:id/submit` | CLIENT | فقط DRAFT؛ ناقص → 422 «پروژه برای ارسال کامل نیست — …»؛ تکراری → 409 |
| `DELETE /projects/:id` | CLIENT | فقط DRAFT — وگرنه 409 (حفظ سوابق) |
| `GET /skills` | عمومی | {items:[{id,name,category}]} |

**نکته‌ی شفاف (تعارض اسپک↔بک‌اند):** §17 اسپک برای SUBMITTED «بدون Edit» نوشته؛ اما بک‌اند M06 ویرایش را در **DRAFT و SUBMITTED** مجاز می‌کند (سطر ۱۳ سرویس). طبق §12 خود اسپک («Backend منبع حقیقت») فرانت‌اند دکمه‌ی Edit را در SUBMITTED هم نشان می‌دهد؛ بک‌اند در هر PUT مجدداً enforce می‌کند (409 تأیید شد).

## ۲) فایل‌ها

**جدید (۹):** `types/project.ts`، `utils/status.ts` (نگاشت مرکزی فارسی + قواعد UI)، `services/project.service.ts`، `services/skill.service.ts`، `components/ui/ConfirmDialog.tsx`، `components/projects/ProjectForm.tsx` (مشترک Create/Edit)، `pages/client/ClientProjectsPage.tsx`، `ClientProjectNewPage.tsx`، `ClientProjectDetailPage.tsx`، `ClientProjectEditPage.tsx`
**تغییر (۳):** `routes/AppRoutes.tsx` (۴ مسیر جدید زیر RoleGuard CLIENT)، `layouts/DashboardLayout.tsx` (ناوبری CLIENT با لینک‌های واقعی + end)، `components/ui/Button.tsx` (forwardRef برای فوکوس دیالوگ)

## ۳) پیاده‌سازی

- **لیست**: کارت در موبایل / جدول در دسکتاپ؛ وضعیت/بودجه/تاریخ فارسی؛ صفحه‌بندی قبلی/بعدی؛ Loading/Empty(+ایجاد)/Error(+Retry) بدون داده‌ی جعلی.
- **فرم مشترک**: مهارت‌ها از `GET /skills` به‌صورت chip های گروه‌بندی‌شده بر اساس category با حالت selected و toggle «الزامی»؛ نقش‌ها با افزودن/حذف ردیف؛ validation آینه‌ی سبک zod (عدد بودجه، min≤max، یکتایی نقش‌ها، …) — سرور source of truth.
- **جزئیات**: اطلاعات اصلی + مهارت‌ها (با نشان الزامی/اختیاری) + نقش‌ها (× تعداد) + Actionهای وضعیت‌محور (Edit: DRAFT|SUBMITTED · Submit/Delete: فقط DRAFT) با ConfirmDialog دسترس‌پذیر (alertdialog/Escape/فوکوس).
- **ویرایش**: populate از GET واقعی؛ گارد UI بر اساس وضعیت خوانده‌شده از سرور + handle خطای 409 سرور در direct-URL.
- **ارسال/حذف**: تأیید → POST/DELETE → رفرش/هدایت؛ خطاهای 422/409 با پیام فارسی سرور نمایش داده می‌شوند.
- **امنیت**: projectId فقط از URL؛ clientId/status هرگز از فرانت ارسال نمی‌شود (zod بک‌اند دور می‌ریزد)؛ RBAC با RoleGuard موجود؛ 401 سراسری طبق M14-A.

## ۴) تست‌ها (TEST | RESULT | METHOD)

| # | تست | نتیجه | روش |
|---|---|---|---|
| 1 | clientA فقط پروژه‌های خودش (total=4) | PASS | CURL |
| 2 | Loading لیست | PASS | CODE (Loading قبل از داده) |
| 3 | Empty state (m14a-client: total=0 + دکمه ایجاد) | PASS | CURL + CODE |
| 4 | Error + Retry (توکن نامعتبر → 401) | PASS | CURL + CODE |
| 5 | باز شدن فرم ایجاد | PASS | CODE + SPA 200 |
| 6 | validation فرم (عنوان/شرح/بودجه/…) | PASS | CODE (validateProjectForm) |
| 7 | skills واقعی (۲۰ آیتم از API) | PASS | CURL |
| 8 | افزودن/حذف نقش | PASS | CODE |
| 9 | 〃 | 〃 | 〃 |
| 10 | Create موفق → 201 → redirect detail | PASS | CURL + CODE |
| 11 | Create 422 (عنوان کوتاه) | PASS | CURL |
| 12 | Create 401 → logout flow | PASS | CURL + CODE (M14-A) |
| 13 | Detail واقعی (title/status/client) | PASS | CURL |
| 14 | Detail 404 (uuid معتبر ناموجود) | PASS | CURL |
| 15 | وضعیت فارسی | PASS | CODE (utils/status) |
| 16 | نمایش skills (+الزامی/اختیاری) | PASS | CURL |
| 17 | نمایش roles (×تعداد) | PASS | CURL |
| 18 | ویرایش DRAFT → 200 | PASS | CURL |
| 19 | دکمه‌ی edit فقط در DRAFT\|SUBMITTED | PASS | CODE |
| 20 | direct-URL روی IN_PROGRESS → 409 سرور + گارد UI | PASS | CURL + CODE |
| 21 | PUT موفق → بازگشت به detail | PASS | CURL + CODE |
| 22 | تأیید submit (ConfirmDialog) | PASS | CODE |
| 23 | submit موفق → SUBMITTED + رفرش | PASS | CURL |
| 24 | submit ناقص → 422 با پیام سرور | PASS | CURL |
| 25 | submit تکراری → 409 | PASS | CURL |
| 26 | تأیید حذف (ConfirmDialog) | PASS | CODE |
| 27 | delete DRAFT → 200 → لیست | PASS | CURL |
| 28 | delete SUBMITTED → 409 فارسی | PASS | CURL |
| 29 | SPECIALIST → /projects/me → 403 | PASS | CURL |
| 30 | ADMIN → /projects/me → 403 | PASS | CURL |
| 31 | frontend build | PASS | اجرا |
| 32 | TypeScript (strict) | PASS | اجرا |
| 33 | backend build | PASS | اجرا |
| 34 | backend unit 67/67 | PASS | اجرا |
| 35 | prisma validate | PASS | اجرا |
| 36 | migrate status (up to date) | PASS | اجرا |
| 37 | migrate diff «No difference detected» | PASS | اجرا |

**محدودیت:** browser automation موجود نیست (طبق §26 اضافه نشد)؛ موارد CODE با بازبینی کد/بیلد تأیید شدند. پیش‌نمایش زنده‌ی :5173 برای flow دستی Login→Projects→Create→Detail→Edit→Submit→Logout آماده است.

## ۵) Guard

**Schema changed: NO · Migration changed: NO · Backend business logic changed: NO** (find: 0 فایل بک‌اند تغییر کرده). بدون Matching/Team/Task/Rating/Recommendation UI، بدون Payment/Chat/Notification/Upload/AI/WebSocket/React Query/Redux.
