# مایل‌استون 15 — Rating & Reputation فرانت‌اند

> وضعیت: ✅ Complete — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) Status

**Complete.** هر ۴۸ سناریوی §30 پاس شد؛ رگرسیون سبز (M11 25/25 canonical، M12 32/32 حتی با fixture کامل M15، unit 67/67).

## ۲) Backend Contract (استخراج‌شده از source واقعی M10)

| Endpoint | قرارداد واقعی |
|---|---|
| `POST /api/v1/projects/:projectId/ratings` | requireAuth؛ body دقیقاً `{toUserId: uuid, score: int 1..5, review?: string (trim, 1..2000)}` — کلیدهای ناشناخته strip؛ **fromUserId فقط از توکن، projectId فقط از مسیر**؛ پاسخ 201 با RatingDto |
| `GET /api/v1/projects/:projectId/ratings` | requireAuth؛ فقط طرف‌های پروژه + ADMIN (غیرمرتبط → 404 یکنواخت «پروژه موردنظر یافت نشد»)؛ پاسخ `{items: RatingDto[]}` مرتب createdAt DESC, id ASC |
| `GET /api/v1/users/:userId/reputation` | requireAuth؛ ReputationDto خام؛ کاربر نامعتبر → 404 |

**RatingDto:** `{id, projectId, fromUser: {id, fullName|null}, toUser: {id, fullName|null}, score, review|null, createdAt}` — فقط هویت عمومی.
**ReputationDto:** `{userId, averageRating: number|null (گرد تا ۲ رقم), ratingCount, completedProjects, trustScore}` — Trust با همان فرمول M07 در بک‌اند محاسبه می‌شود.

**قواعد واقعی (rating.service/rules.ts):** ثبت فقط در `COMPLETED` (در RATED → 409 «ارزیابی فقط پس از تکمیل پروژه ممکن است»)؛ CLIENT مالک ← اعضای تیم | SPECIALIST عضو تیم ← مالک پروژه | **ADMIN → 403 «شما طرف این پروژه نیستید…»**؛ خودارزیابی → 422 «ارزیابی خود مجاز نیست»؛ تکراری (unique project+from+to) → 409 «ارزیابی شما برای این کاربر در این پروژه قبلاً ثبت شده است»؛ هدف نامجاز → 403 پیام اختصاصی هر نقش؛ score/review نامعتبر → 422 فارسی.

## ۳) Changed Files

**جدید (۷):** `types/rating.ts` · `services/rating.service.ts` · `components/ratings/StarRating.tsx` · `components/ratings/RatingForm.tsx` · `components/ratings/RatingCard.tsx` · `components/ratings/ReputationCard.tsx` · `components/ratings/ProjectRatingsSection.tsx`
**تغییر (۴):** `pages/client/ClientProjectDetailPage.tsx` (+بخش ارزیابی) · `pages/specialist/SpecialistProjectWorkspacePage.tsx` (+بخش ارزیابی) · `pages/specialist/SpecialistProfilePage.tsx` (+ReputationCard با user.id واقعی) · `utils/status.ts` (+`formatFaNumber` — عدد فارسی بدون پسوند، §24)
**بک‌اند/Prisma/scripts: صفر فایل** (find -newermt از شروع M15 = ۰).

## ۴) Rating UI

- **کارفرما** (Workspace، فقط COMPLETED/RATED): بخش «ارزیابی پروژه» با توضیح «چه کسی را می‌توانم ارزیابی کنم» → یک فرم مستقل برای هر عضو تیم (targets از GET team موجود؛ بدون request اضافه).
- **متخصص** (Workspace): target = کارفرمای پروژه (از `ProjectDto.client` موجود)؛ فقط برای عضو تیم (آینه‌ی داده؛ eligibility نهایی بک‌اند).
- **RatingForm**: انتخاب امتیاز ۱ تا ۵ با radio group بومی — پیمایش با فلش‌ها/Space، aria-checked خودکار، متن همیشه‌فعال «امتیاز: ۴ از ۵» با aria-live (رنگ تنها indicator نیست)؛ دیدگاه textarea با label و validation آینه‌ی بک‌اند (حداکثر ۲۰۰۰، اختیاری)؛ submit با loading/disabled/aria-busy؛ خطا فارسی با role=alert؛ رشته‌ی خالی بعد از trim ارسال نمی‌شود (optional).
- **ثبت‌شده قبلاً**: کارت «ارزیابی شما» به جای فرم — بدون Edit/Delete (بک‌اند امکانش را ندارد؛ §13).
- **پس از POST موفق**: بازخوانی کامل ratings — فرم جای کارت را می‌گیرد؛ هیچ fake success نیست.

## ۵) Reputation UI

`ReputationCard` (در پروفایل متخصص، با user id همان کاربر لاگین‌شده): میانگین امتیاز (ستاره + «۵ از ۵»؛ null → «هنوز امتیازی ثبت نشده است.»)، تعداد ارزیابی‌ها، پروژه‌های تکمیل‌شده، امتیاز اعتماد «۱۰۰ از ۱۰۰». **همه‌ی مقادیر خام از GET /users/:userId/reputation — صفر بازمحاسبه** (grep انتساب trust/average/completed در فرانت = ۰؛ تنها match یک مقایسه‌ی `=== null` بود).

## ۶) Workspace Integration

- بخش ارزیابی فقط در `COMPLETED`/`RATED` رندر می‌شود (§21)؛ در وضعیت‌های دیگر اصلاً وجود ندارد.
- در `RATED` (پس از بسته شدن چرخه): فقط نمایش لیست؛ برای targetهای ثبت‌نشده پیام «امکان‌پذیر نیست» — دقیقاً mirror قرارداد (POST در RATED → 409).
- Task mutation در COMPLETED/RATED از قبل gating شده بود (فقط IN_PROGRESS) — §20 حفظ شد؛ اقدامات پروژه طبق mapping مرکزی M06 بدون تغییر.
- Empty stateها (§22): «هنوز ارزیابی‌ای برای این پروژه ثبت نشده است.» / «در حال حاضر شخصی برای ارزیابی در دسترس نیست.» (+علت نقش‌محور).

## ۷) Security

- **401** → ابطال نشست مرکزی M14-A (بدون duplicate).
- **403** → ADMIN/هدف نامجاز؛ پیام فارسی سرور عیناً نمایش داده می‌شود.
- **404** → غیرمرتبط/ناموجود با پیام واحد (بدون افشای دلیل).
- **409/422** → فارسی و قابل‌فهم؛ بدون stack trace.
- **Identity**: فرانت فقط `toUserId/score/review` می‌فرستد؛ fromUserId/projectId هرگز ارسال نمی‌شوند (§28 ✓).
- **Audit (§27)**: بدون hardcoded UUID، بدون password/token در UI جدید، بدون fake rating/reputation/trust.

## ۸) Tests (§30)

| # | سناریو | نتیجه | روش |
|---|---|---|---|
| 1 | ورود کارفرما | PASS | CURL |
| 2-3 | Workspace پروژه‌ی COMPLETED + بخش ارزیابی (GET 200) | PASS | CURL+CODE |
| 4 | اعضای تیم به‌عنوان target (جواد/آرش از تیم واقعی) | PASS | CURL |
| 5 | score=1 → 201 | PASS | CURL |
| 6 | score=5 → 201 (بدون review → review=null) | PASS | CURL |
| 7 | review معتبر (متن فارسی) | PASS | CURL |
| 8 | POST → 201 با RatingDto کامل | PASS | CURL |
| 9 | پس از ثبت، GET دو rating برمی‌گرداند | PASS | CURL |
| 10 | تکراری → 409 «قبلاً ثبت شده است» | PASS | CURL |
| 11 | قبل از COMPLETED (IN_PROGRESS) → 409 با ذکر وضعیت | PASS | CURL |
| 12 | خودارزیابی → 422 «ارزیابی خود مجاز نیست» | PASS | CURL |
| 13 | score=0 → 422 «امتیاز حداقل ۱ است» · score=3.5 → 422 | PASS | CURL |
| 14 | review فقط فاصله → 422 «دیدگاه نمی‌تواند خالی باشد» | PASS | CURL |
| 15-16 | ورود متخصص + Workspace COMPLETED (GET 200) | PASS | CURL |
| 17 | target کارفرما (ProjectDto.client) | PASS | CURL |
| 18 | POST توسط عضو تیم → 201 (جواد → کارفرمای الف، 4) | PASS | CURL |
| 19 | تکراری → 409 | PASS | CURL |
| 20 | خودارزیابی متخصص → 422 · عضو→عضو دیگر → 403 اختصاصی | PASS | CURL |
| 21-22 | GET لیست مرتب‌شده‌ی سرور (۳ rating با from/to/score/review/date) | PASS | CURL |
| 23 | پروژه بدون rating → items=[] → empty state فارسی | PASS | CURL |
| 24 | GET reputation متخصص | PASS | CURL |
| 25 | میانگین دقیق بک‌اند (مثلاً 3.67) | PASS | CURL |
| 26 | ratingCount دقیق | PASS | CURL |
| 27 | completedProjects دقیق | PASS | CURL |
| 28 | trustScore خام (81.38 / 97 / 100) | PASS | CURL |
| 29 | صفر بازمحاسبه در فرانت (grep) | PASS | CODE |
| 30 | unauth → 401 (هر سه endpoint) | PASS | CURL |
| 31 | غیرمرتبط (clientB) → 404 یکنواخت | PASS | CURL |
| 32 | متخصص غیرعضو → 404 | PASS | CURL |
| 33 | ADMIN: POST → 403 · GET (مشاهده) → 200 | PASS | CURL |
| 34 | Loading (بخش ارزیابی + reputation) | PASS | CODE |
| 35-36 | Error + Retry | PASS | CODE |
| 37 | double-submit (loading + disabled + fieldset-disabled) | PASS | CODE |
| 38 | Keyboard (radio بومی + aria-live + role=alert + legend/label) | PASS | CODE |
| 39 | Responsive (گرید ۴→۲→۱ ستون، textarea w-full، کارت‌های wrap) | PASS | CODE |
| 40 | RTL + اعداد فارسی (formatFaNumber؛ dir=ltr فقط برای ردیف ستاره‌ها) | PASS | CODE |
| 41 | Empty stateها (§22/§23) | PASS | CODE |
| 42 | frontend build ✓ | PASS | اجرا |
| 43 | TypeScript strict ✓ | PASS | اجرا |
| 44 | backend build ✓ | PASS | اجرا |
| 45 | unit 67/67 ✓ | PASS | اجرا |
| 46 | prisma validate ✓ | PASS | اجرا |
| 47 | migrate status: up to date ✓ | PASS | اجرا |
| 48 | migrate diff: No difference ✓ | PASS | اجرا |

**محدودیت:** browser automation موجود نیست — موارد CODE با بازبینی کد/بیلد/tsc + پیش‌نمایش زنده‌ی :5173 (routeهای کلیدی 200).

## ۹) Regression

| مورد | نتیجه |
|---|---|
| M11 | **25/25** (canonical روی fixture تازه — ابتدای M15 و پس از rebuild مجدد) |
| M12 | **32/32** (هم روی fixture پایه و هم با fixture کامل M15) |
| M14-B/C/D/E/F/G | سبز — صفحات فقط بخش جدید گرفتند؛ tsc/build پاس یعنی قراردادها سالم؛ gating های قبلی دست‌نخورده |
| Backend unit | 67/67 |
| Prisma | validate ✓ · up to date ✓ · No difference ✓ |

## ۱۰) Build

```
frontend build  ✓ (292 kB js) · tsc --noEmit ✓ strict
backend build   ✓ · unit 67/67 · validate/status/diff ✓
```

## ۱۱) Scope Guard (§32/§33)

**Backend changed: NO · Schema changed: NO · Migration changed: NO · Business logic changed: NO** (Rating/Reputation/Trust/Matching/Recommendation/Team/Task/Lifecycle همه دست‌نخورده — find -newermt از شروع M15 = ۰ فایل بک‌اند)
Payment/Chat/AI/Redis/WebSocket/Redux/Zustand/React Query: **NO**
(محیط ورک‌اسپیس git ندارد — بررسی با file-list + mtime انجام شد؛ فهرست کامل در بخش ۳.)

## ۱۲) Known Limitations

1. محیط سندباکس ابتدای M15 کامل ریست شده بود — بازسازی استاندارد انجام شد (PostgreSQL + نصب وابستگی‌ها + migrate/seed + m10-setup)؛ baseline قبل از شروع کار تأیید شد.
2. `m11-tests.sh` تک‌اجرایی است (بخش صفحه‌بندی خودش match نمونه درج می‌کند) — اجرای دوم روی fixture آلوده TEST-5/9/10 را می‌شکند؛ الگوی شناخته‌شده و مستند در M14-G. ترتیب canonical: `m10-setup → m11 → m12`.
3. بک‌اند POST را فقط در COMPLETED می‌پذیرد (در RATED → 409) — UI دقیقاً همین را آینه می‌کند (فرم فقط در COMPLETED).
4. Reputation در TeamSummaryCard نمایش داده نشد (§18 — N+1 request برای هر عضو؛ فقط در پروفایل).

## ۱۳) Deferred

- **پروفایل کارفرما** (route جدید ممنوع طبق §19) — reputation کارفرما فقط در بستر ارزیابی دیده می‌شود.
- **Edit/Delete rating** — بک‌اند امکانش را ندارد (§13).
- **اعلان/نمایش reputation در جاهای دیگر** (کارت‌های تیم، لیست متخصصان) — نیاز به تصمیم UX جداگانه.
- Payment/Wallet/Chat/Notification/AI/... — طبق §1 ممنوع.
