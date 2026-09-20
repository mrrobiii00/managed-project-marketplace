# مایل‌استون 14-C — پیشنهادهای متخصص در فرانت‌اند

> وضعیت: ✅ تکمیل‌شده — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) قرارداد بک‌اند (استخراج‌شده از کد واقعی M11)

| Endpoint | RBAC | قرارداد |
|---|---|---|
| `GET /specialists/me/recommended-projects?page&pageSize` | فقط SPECIALIST | query: page≥1، pageSize 1..100 (پیش‌فرض 1/20) → `{items:[{project:{id,title,description,minBudget,maxBudget(string\|null),deadline,status}, match:{status, ۷ عدد}}], page,pageSize,total,totalPages}` — REJECTED و پروژه‌های غیرفعال در DB فیلتر شده‌اند |
| `GET …/count` | فقط SPECIALIST | `{count}` — موجود و استفاده می‌شود |
| `GET …/:projectId` | فقط SPECIALIST | همان `{project, match}` واحد؛ هر حالت نامعتبر → **404 واحد بدون افشای دلیل** |

sort در بک‌اند: `totalScore DESC → trustScore DESC → createdAt DESC → id ASC` — فرانت فقط نمایش می‌دهد.
skills/roles جزء DTO نسخه‌ی M11 نیست؛ در Detail از endpoint موجود M06 (`GET /projects/:id` — مجاز برای کاربران احراز‌شده) به‌صورت ثانویه و با degrade آرام خوانده شد (شکست آن بخش را مخفی می‌کند، نه صفحه را).

## ۲) فایل‌ها

**جدید (۶):** `types/recommendation.ts` (ListItem/Detail/MatchComponents/PaginationMetadata جدا)، `services/recommendation.service.ts`، `components/recommendations/RecommendationCard.tsx`، `components/recommendations/MatchBreakdown.tsx`، `pages/specialist/SpecialistRecommendedPage.tsx`، `pages/specialist/SpecialistRecommendationDetailPage.tsx`
**تغییر (۳):** `utils/status.ts` (+`formatFaScore`، نگاشت وضعیت پیشنهاد — بدون mapping دوم برای وضعیت پروژه)، `routes/AppRoutes.tsx` (۲ مسیر زیر RoleGuard SPECIALIST)، `layouts/DashboardLayout.tsx` (فعال‌سازی «پروژه‌های پیشنهادی»)

## ۳) پیاده‌سازی

- **لیست**: کارت‌های گرید (lg:2 ستون) با عنوان/وضعیت پروژه (mapping مرکزی M14-B)/وضعیت پیشنهاد/بودجه/مهلت + دو نوار امتیاز تطبیق و اعتبار؛ صفحه‌بندی قبلی/بعدی (اول: قبل disabled — آخر: بعد disabled)؛ ترتیب API دست‌نخورده؛ Loading/Empty («در حال حاضر پروژه پیشنهادی برای شما وجود ندارد.»)/Error+Retry.
- **کارت reusable**: «مشاهده جزئیات و دلیل تطبیق» → لینک واقعی.
- **Detail**: اطلاعات پروژه (شرح/بودجه/مهلت/وضعیت + skills/roles از M06) + کارت «چرا این پروژه به شما پیشنهاد شد؟» با `MatchBreakdown`: دو امتیاز کل برجسته (تطبیق/اعتبار) + شش مؤلفه با نوار — همه مقادیر خام API، **صفر بازمحاسبه** (تست 26).
- **وضعیت پیشنهاد**: فقط نمایش؛ هیچ Approve/Reject/Apply/Accept ای وجود ندارد (endpoint هم ندارد).
- **امنیت**: specialistId هرگز ارسال نمی‌شود (هویت از توکن)؛ 404 واحد بدون افشای دلیل؛ بدون هیچ فیلد حساسی در typeها؛ 401 → ابطال نشست طبق M14-A.

## ۴) تست‌ها (TEST | RESULT | METHOD)

| # | تست | نتیجه | روش |
|---|---|---|---|
| 1 | SPECIALIST → 200 (۳ پیشنهاد واقعی) | PASS | CURL |
| 2 | CLIENT → 403 | PASS | CURL |
| 3 | ADMIN → 403 | PASS | CURL |
| 4 | unauth → 401 (redirect در UI طبق M14-A) | PASS | CURL + CODE |
| 5 | fetch واقعی لیست | PASS | CURL |
| 6 | صفحه‌بندی (pageSize=2 → ۲ صفحه) | PASS | CURL |
| 7 | صفحه‌ی اول → قبلی disabled | PASS | CODE + CURL |
| 8 | صفحه‌ی آخر → بعدی disabled | PASS | CODE + CURL |
| 9 | empty (specC: total=0) | PASS | CURL |
| 10 | error + retry (توکن نامعتبر → 401) | PASS | CURL + CODE |
| 11 | REJECTED مخفی (specG: total=0) | PASS | CURL |
| 12 | ترتیب API عیناً نمایش داده شد (97.5/trust100/new → 97.5/trust100/قدیمی‌تر → 60) | PASS | CURL |
| 13 | detail معتبر → 200 | PASS | CURL |
| 14 | uuid نامعتبر → 422 (طبق بک‌اند) | PASS | CURL |
| 15 | پیشنهادِ متعلق به دیگری → 404 | PASS | CURL |
| 16 | پیشنهاد REJECTED → 404 | PASS | CURL |
| 17 | پروژه‌ی غیرفعال (FLIP مستقیم CANCELLED) → detail 404 + list مخفی؛ بازگشت → 200 | PASS | CURL |
| 18-25 | هر ۸ مقدار (total/trust/۶ مؤلفه) **EXACT** برابر psql | PASS | CURL |
| 26 | هیچ score calculation در فرانت (grep محاسبات/وزن‌ها = 0) | PASS | CODE |
| 27 | لیست ریسپانسیو (گرید→کارت تک‌ستون، بدون overflow) | PASS | CODE |
| 28 | Detail ریسپانسیو (lg:2 ستون → تک‌ستون) | PASS | CODE |
| 29 | Loading | PASS | CODE |
| 30 | Empty با پیام دقیق اسپک | PASS | CODE |
| 31 | ErrorState | PASS | CODE |
| 32 | دسترس‌پذیری (semantic/aria/scoreها با متن نه فقط رنگ) | PASS | CODE |
| 33 | frontend build | PASS | اجرا |
| 34 | TypeScript strict | PASS | اجرا |
| 35 | backend build | PASS | اجرا |
| 36 | backend unit 67/67 | PASS | اجرا |
| 37 | prisma validate | PASS | اجرا |
| 38 | migrate status (up to date) | PASS | اجرا |
| 39 | migrate diff «No difference detected» | PASS | اجرا |

**محدودیت:** browser automation موجود نیست (طبق §26 اضافه نشد)؛ موارد CODE با بازبینی کد/بیلد. پیش‌نمایش زنده‌ی :5173 برای flow دستی (SPECIALIST login → پیشنهادها → detail → breakdown → logout؛ و CLIENT → مسیر متخصص → 403) آماده است.
**نکته‌ی تست:** seedهای آزمایشی صفحه‌بندی/مرتب‌سازی پس از تست‌ها پاک شدند (بازگشت به state واقعی). توکن‌های طولانی مایل‌استون قبل به‌علت انقضای ۱ ساعته JWT با لاگین مجدد نو شدند.

## ۵) Guard

**Schema changed: NO · Migration changed: NO · Backend business logic changed: NO** (find: 0 فایل). بدون Apply/Accept workflow، بدون تغییر Matching/Trust/Team/Task/Rating، بدون Payment/Chat/Notification/AI/Upload/React Query/Redux.
