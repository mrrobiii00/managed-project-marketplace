# مایل‌استون 14-G — یکپارچه‌سازی Cross-Role و Polish تجربه‌ی کاربری

> وضعیت: ✅ Complete — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) Status

**Complete.** همه‌ی ۵۷ تست §25 پاس شدند؛ رگرسیون کامل سبز (M11 25/25، M12 32/32، unit 67/67).

## ۲) Changed Files

**جدید (۱):** `frontend/src/utils/navigation.ts` — منبع واحد ناوبری نقش‌محور (NAV_BY_ROLE)
**تغییر (۹):**
- `layouts/DashboardLayout.tsx` — ناوبری از util مرکزی (حذف تعریف درون‌کامپوننتی)
- `pages/client/ClientDashboardPage.tsx` — بازنویسی: داده‌ی واقعی از GET /projects/me (آمار + پروژه‌های اخیر + CTA)
- `pages/specialist/SpecialistDashboardPage.tsx` — بازنویسی: count + لیست M11 + بهترین تطبیق + لینک پروفایل
- `pages/admin/AdminDashboardPage.tsx` — ادغام کامل ۴ endpoint م12 (summary/recent/attention/match-summary) با retry مستقل هر بخش
- `services/admin.service.ts` — +getRecentProjects/getAttentionProjects/getMatchSummary + DTOهای دقیقاً منطبق با بک‌اند
- `pages/specialist/SpecialistRecommendationDetailPage.tsx` — +لینک «ورود به Workspace پروژه»
- `pages/specialist/SpecialistProjectWorkspacePage.tsx` — +لینک بازگشت به داشبورد + labelهای فیلتر از mapping مرکزی
- `pages/client/ClientProjectDetailPage.tsx` — +لینک بازگشت به پروژه‌های من
- `components/tasks/ClientTasksSection.tsx` — labelهای فیلتر وضعیت/اولویت از mapping مرکزی

**بک‌اند/Prisma/scripts: صفر فایل** (تأیید mtime: هیچ فایلی بعد از restore محیط تغییر نکرده).

## ۳) Cross-Role Navigation

| مسیر | وضعیت |
|---|---|
| داشبورد کارفرما → پروژه‌های من → جزئیات/Workspace → تیم/کارها | ✅ کامل (لینک بازگشت به هدر Workspace اضافه شد) |
| Workspace → ویرایش/ارسال/حذف (طبق status) | ✅ از M14-B/F حفظ شد |
| داشبورد متخصص → پیشنهادها → جزئیات پیشنهاد → **Workspace** | ✅ لینک Workspace اضافه شد؛ Workspace → تسک‌ها از M14-E |
| Workspace متخصص ⇄ داشبورد | ✅ لینک بازگشت اضافه شد |
| جزئیات پیشنهاد → پروفایل | ✅ از طریق سایدبار + CTA داشبورد |
| داشبورد ادمین → ۴ بخش M12 | ✅ همه در همان صفحه (خواندنی) |
| آیتم‌های بدون صفحه/endpoint (پروفایل کارفرما، پروژه‌های منِ متخصص، مدیریت‌های ادمین) | ⛔ عمداً غیرفعال با نشان «به‌زودی» — لینک جعلی ساخته نشد (§3) |

**بازرسی لینک‌ها (§5):** هر ۱۶ مقصد `to=` به route واقعی موجود map می‌شود؛ هیچ href بی‌مقصدی نیست.

## ۴) Dashboard Improvements

- **CLIENT**: حذف placeholderها؛ آمار واقعی (کل/در حال اجرا/در چرخه‌ی بررسی — شمارش presentation-only از یک fetch با pageSize=100)، ۵ پروژه‌ی اخیر (ترتیب سرور createdAt DESC) با Badge وضعیت، CTA «ایجاد پروژه» و «پروژه‌های من».
- **SPECIALIST**: شمارش واقعی از endpoint count م11، «بهترین تطبیق» (امتیاز خام بک‌اند)، ۳ پیشنهاد برتر با لینک به جزئیات، CTA پروفایل. دو endpoint با Promise.allSettled — شکست count، لیست را نمی‌شکند.
- **ADMIN**: summary (از قبل) + «پروژه‌های اخیر» + «نیازمند بررسی» (SUBMITTED/REVIEW/TEAM_PROPOSED) + «خلاصه‌ی تطبیق‌ها» (total/توصیه‌شده/بازبینی/ردشده) — هر بخش Loading/Empty/Error/Retry مستقل.

## ۵) UX Improvements

- Loading/Empty/Error/Retry در **۱۰/۱۰** صفحه/بخش داده‌محور (جدول تأیید در تست ۴۳).
- Empty stateهای فارسی و متمایز از ErrorState («هنوز پروژه‌ای ثبت نکرده‌اید»، «در حال حاضر پروژه پیشنهادی وجود ندارد»، «هنوز تیمی تشکیل نشده»، «هنوز کاری ثبت نشده»، ...).
- Double-submit: ۱۸ گیت disabled/busy در mutationها.
- Responsive: گریدهای sm/md/lg، کارت موبایل جای جدول (md:hidden)، min-w-0/truncate در ۲۳ نقطه، overflow-x-auto جدول، max-w کانتینر.
- Accessibility: سایدبار drawer با Escape + aria-modal، ConfirmDialog با role=alertdialog + فوکوس روی لغو، Loading با role=status/aria-live، aria-label دکمه‌های آیکونی، رنگ تنها وسیله‌ی تشخیص status نیست (Badge = رنگ + متن).
- RTL: `dir="rtl"` سراسری؛ اعداد فارسی (toLocaleString('fa-IR'))، بودجه/تاریخ/امتیاز با فرمت‌های مرکزی formatFaBudget/formatFaDate/formatFaScore.

## ۶) API Contract Audit (§19)

سرویس‌های بازرسی‌شده — همه فقط endpointهای واقعی: auth (register/login/me)، profile (GET/PUT me + skills)، skills (list)، projects (me/CRUD/submit)، tasks (list/detail/CRUD)، team (get)، recommendations (list/count/detail)، admin (summary/recent/attention/match-summary). method/path/query/body دقیقاً مطابق بک‌اند؛ **هیچ userId/clientId/specialistId/role در body ارسال نمی‌شود** (تنها استثنا: `role` در register که قرارداد صریح بک‌اند است). Budgetها به‌صورت string دریافت و فقط برای نمایش format می‌شوند — هیچ محاسبه‌ی عددی روی Decimal در فرانت انجام نمی‌شود.

## ۷) Security Audit (§20)

- 401 → ابطال نشست مرکزی (setUnauthorizedHandler در AuthContext؛ پرچم ضد-loop) — بدون duplicate (§10).
- 403 → RoleGuard در SPA (Navigate /403) + requireRole بک‌اند (هر ۶ ترکیب نقشی تست شد: 403) — فرانت صرفاً برای UX دکمه‌ها را می‌پوشاند، نه authorization.
- 404 → پیام واحد فارسی بدون افشای دلیل (پروژه/تسک/پیشنهاد تست شد).
- grep: بدون password/token در UI، بدون UUID هاردکد، بدون fake/mock data، بدون امتیاز جعلی. (تست ۲۷ در M14-F هم تاریخچه دارد: status توسط سرور برای CLIENT دور ریخته می‌شود.)

## ۸) Tests (§25)

| # | سناریو | نتیجه | روش |
|---|---|---|---|
| 1-3 | login/me هر سه نقش (CLIENT/SPECIALIST/ADMIN) | PASS | CURL |
| 4 | توکن نامعتبر → 401 | PASS | CURL |
| 5 | logout (پاک‌سازی نشست + هدایت به login) | PASS | CODE |
| 6 | داشبورد کارفرما = داده‌ی واقعی /projects/me | PASS | CURL+CODE |
| 7 | لیست پروژه‌ها (total/badge/لینک) | PASS | CURL |
| 8 | ایجاد پروژه (201 DRAFT) | PASS | CURL |
| 9 | جزئیات پروژه | PASS | CURL |
| 10 | ویرایش DRAFT → 200 | PASS | CURL |
| 11 | ویرایش SUBMITTED → 200 (و اعتبارسنجی ۲۰ کاراکتری شرح → 422 فارسی) | PASS | CURL |
| 12(اضافی) | ویرایش IN_PROGRESS → 409 فارسی | PASS | CURL |
| 13 | submit (DRAFT→SUBMITTED) | PASS | CURL |
| 14 | delete DRAFT → 200 | PASS | CURL |
| 15 | Workspace (project/team/tasks = 200) | PASS | CURL |
| 16 | تیم (ACTIVE، ۲ عضو، امتیاز واقعی) | PASS | CURL |
| 17 | لیست کارها | PASS | CURL |
| 18 | ایجاد تسک توسط کارفرما | PASS | CURL |
| 19 | ویرایش تسک (فیلدهای مجاز CLIENT) | PASS | CURL |
| 20 | حذف تسک TODO → 200 | PASS | CURL |
| 21 | داشبورد متخصص (count=3 از endpoint واقعی M11) | PASS | CURL+CODE |
| 22 | لیست پیشنهادها (مرتب‌شده توسط سرور) | PASS | CURL |
| 23 | جزئیات پیشنهاد (97.5 RECOMMENDED + MatchBreakdown) | PASS | CURL |
| 24 | پروفایل متخصص → 200 | PASS | CURL |
| 25 | Workspace متخصص (عضو تیم P2) | PASS | CURL |
| 26 | تیم از دید متخصص | PASS | CURL |
| 27 | انتقال وضعیت تسک توسط متخصص (IN_PROGRESS→DONE) | PASS | CURL |
| 28 | admin summary | PASS | CURL |
| 29 | admin recent-projects | PASS | CURL |
| 30 | admin attention (فقط SUBMITTED/REVIEW/TEAM_PROPOSED) | PASS | CURL |
| 31 | admin match-summary | PASS | CURL |
| 32 | متخصص→کارفرما: API 403 + RoleGuard→/403 | PASS | CURL+CODE |
| 33 | ادمین→کارفرما: 403 | PASS | CURL+CODE |
| 34 | کارفرما→متخصص: 403 (هر دو endpoint) | PASS | CURL+CODE |
| 35 | متخصص→ادمین: 403 | PASS | CURL+CODE |
| 36 | کارفرما→ادمین: 403 | PASS | CURL+CODE |
| 37 | پروژه‌ی نامعتبر → 404 «پروژه موردنظر یافت نشد» | PASS | CURL |
| 38 | تسک نامعتبر → 404 | PASS | CURL |
| 39 | پیشنهاد نامعتبر → 404 | PASS | CURL |
| 40 | 401 → ابطال نشست/هدایت (بدون loop) | PASS | CODE |
| 41 | 409 → پیام فارسی | PASS | CURL |
| 42 | 422 → پیام فارسی («شرح پروژه باید حداقل ۲۰ کاراکتر باشد») | PASS | CURL |
| 43 | Loading در ۱۰/۱۰ بخش داده‌محور | PASS | CODE |
| 44 | Empty stateهای فارسی متمایز از Error | PASS | CODE |
| 45 | Retry (۱۳ کامپوننت) | PASS | CODE |
| 46 | Double-submit (۱۸ گیت disabled/busy) | PASS | CODE |
| 47 | Responsive (گرید/کارت موبایل/جدول) | PASS | CODE |
| 48 | Keyboard (Escape + فوکوس) | PASS | CODE |
| 49 | RTL + اعداد فارسی | PASS | CODE |
| 50 | بدون overflow افقی | PASS | CODE |
| 51 | frontend build ✓ | PASS | اجرا |
| 52 | TypeScript strict ✓ | PASS | اجرا |
| 53 | backend build ✓ | PASS | اجرا |
| 54 | unit 67/67 ✓ | PASS | اجرا |
| 55 | prisma validate ✓ | PASS | اجرا |
| 56 | migrate status: up to date ✓ | PASS | اجرا |
| 57 | migrate diff: No difference ✓ | PASS | اجرا |

**محدودیت (§24):** browser automation نصب نشد — موارد CODE با بازبینی کد/بیلد/tsc و پیش‌نمایش زنده‌ی :5173 (SPA routeهای کلیدی همگی 200).

## ۹) Regression

| مورد | نتیجه |
|---|---|
| M11 recommendation tests | **PASS=25 FAIL=0** (اجرای canonical روی fixture تازه) |
| M12 admin dashboard tests | **PASS=32 FAIL=0** |
| Backend unit (matching/task/rating rules) | 67/67 ✓ |
| M14-B/C/D/E/F فرانت‌اند | سبز — صفحات دست‌نخورده یا فقط لینک/label افزوده؛ tsc+build پاس یعنی قرارداد سرویس‌ها سالم |
| Prisma validate/status/diff | ✓ / up to date / No difference |

**نکته‌ی تست‌ harness:** `m11-tests.sh` تک‌اجرایی است — بخش «صفحه‌بندی» خودش دو match نمونه برای specA درج می‌کند و پاک‌ نمی‌کند؛ اجرای مجدد آن روی fixture آلوده TEST-5/9/10 را می‌شکند (رفتار مشاهده‌شده، علت کد نیست). ترتیب canonical: `m10-setup → m11 → m12`.

## ۱۰) Build / TypeScript / Prisma

```
frontend build  ✓ built in 2.18s (281.95 kB js / 21.75 kB css)
tsc --noEmit    ✓ (strict + noUnusedLocals)
backend build   ✓ dist/server.js
unit            ✓ 67/67 (exit 0)
prisma validate ✓ "The schema at prisma/schema.prisma is valid 🚀"
migrate status  ✓ "Database schema is up to date"
migrate diff    ✓ "No difference detected."
```

## ۱۱) Scope Guard (§27/§28)

| مورد | نتیجه |
|---|---|
| Backend changed | **NO** (find -newermt پس از restore = ۰ فایل؛ فقط frontend/src و docs تغییر کردند) |
| Schema changed | **NO** |
| Migration changed | **NO** |
| Matching/Trust/Recommendation/Team/Task/Rating/Lifecycle logic | **NO** |
| Payment / Chat / AI / Redis / WebSocket | NO |
| Redux/Zustand/React Query | NO |

مخزن git در ورک‌اسپیس موجود نیست (محیط از ابتدا بدون .git) → بررسی scope با mtime + فهرست فایل‌های ویرایش‌شده انجام شد؛ خروجی در بخش ۲ کامل است.

## ۱۲) Known Limitations

1. بدون browser automation (§24) — بررسی‌های بصری/کیبورد از طریق کد + پیش‌نمایش دستی.
2. m11-tests.sh تک‌اجرایی (توضیح در بخش ۹).
3. شمارش وضعیت‌ها در داشبورد کارفرما presentation-only از یک fetch است (سقف pageSize=100 بک‌اند) — برای مقیاس دمو کافی؛ در صورت >۱۰۰ پروژه عدد «همه» از total واقعی API می‌آید.
4. روز جراحی تست‌ها (§25) چند رکورد دمو (یک پروژه‌ی SUBMITTED و یک تسک DONE) ایجاد شد؛ برای وضعیت پایانی، DB با اسکریپت canonical بازسازی شد و fixture تمیز است.

## ۱۳) Deferred (عمداً خارج از scope)

- **Rating UI** — طبق §23 و تصمیم M14-F؛ endpointهای M10 آماده‌اند.
- **صفحه‌ی پروفایل کارفرما** — route/page وجود ندارد؛ آیتم سایدبار «به‌زودی».
- **«پروژه‌های من»/«وظایف» متخصص** — endpoint فهرست در بک‌اند وجود ندارد؛ لینک ساخته نشد.
- **صفحات مدیریت ادمین** (بررسی Matching/تیم‌ها/کاربران/پروژه‌ها) — داشبورد M12 فقط‌خواندنی است؛ Actionهای ادمین در فرانت ساخته نشد.
- Payment/Wallet/Chat/Notification/AI/Upload/i18n/... — طبق §1 ممنوع.
