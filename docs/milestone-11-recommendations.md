# مایل‌استون ۱۱ — لایه‌ی «پروژه‌های پیشنهادی متخصص» (Recommendations)

> وضعیت: ✅ تحویل‌شده و کاملاً تست‌شده — ۲۲ سناریوی الزامی اسپک (۲۵ assertions) + رگرسیون کامل M07–M10 سبز
>
> اصل معماری: این ماژول یک **لایه‌ی فقط-خواندنی روی جدول `matches` موجود (M07)** است. هیچ موتور امتیازدهی، وزن، وضعیت یا Match جدیدی بازنویسی/ایجاد نشده است.

---

## ۱) شرح دامنه (Scope)

| قابلیت | وضعیت |
|---|---|
| خواندن matchهای موجود برای متخصص با فیلتر DB | ✅ پیاده‌سازی شد |
| ایجاد/تغییر match یا score | ❌ ممنوع — رعایت شد (هیچ endpoint نوشتاری وجود ندارد) |
| بازمحاسبه‌ی هر عدد | ❌ ممنوع — رعایت شد (اعداد عیناً از DB خوانده می‌شوند) |
| Auto-assignment / پیشنهاد خودکار تیم | ❌ خارج از دامنه |
| Cache / Redis / Job پس‌زمینه | ❌ خارج از دامنه |
| React / چت / پرداخت / درخواست عضویت / قرارداد / اطلاع‌رسانی | ❌ خارج از دامنه |

توصیه صرفاً «نمایش» است؛ به استخدام یا عضویت تیم هیچ ارتباطی ندارد و متخصص نمی‌تواند امتیاز یا وضعیت خود را تغییر دهد.

## ۲) فایل‌های جدید/تغییر‌یافته

| فایل | نقش |
|---|---|
| `backend/src/modules/recommendations/recommendations.types.ts` | نوع `RecommendationDto` + دو ثابت: `VISIBLE_MATCH_STATUSES = [RECOMMENDED, NEEDS_REVIEW]` و `ACTIVE_PROJECT_STATUSES` (شش وضعیت DRAFT تا IN_PROGRESS) |
| `backend/src/modules/recommendations/recommendations.schema.ts` | Zod: لیست = `paginationSchema` موجود (page≥1، pageSize 1..100)؛ پارامتر مسیر = `z.string().uuid()` |
| `backend/src/modules/recommendations/recommendations.service.ts` | کل منطق: `baseWhere` (specialistId + دو فیلتر وضعیت)، `orderBy` چهارکلیدی، `findUnique` با کلید مرکب `projectId_specialistId`، `countMyRecommendations` |
| `backend/src/modules/recommendations/recommendations.controller.ts` | کنترلر نازک — فقط parse/فراخوانی سرویس/پاسخ استاندارد |
| `backend/src/modules/recommendations/recommendations.routes.ts` | `router.use(requireAuth, requireRole('SPECIALIST'))`؛ مسیر `count` **قبل از** `/:projectId` ثبت شده |
| `backend/src/app.ts` | سوارکردن روتر روی `/api/v1/specialists` (بلافاصله بعد از specialistsRouter) |

**بدون تغییر** در اسکیما، مایگریشن، ماژولهای M07/M08/M09/M10.

## ۳) قرارداد API

### GET `/api/v1/specialists/me/recommended-projects` (فقط SPECIALIST)

کوئری: `page` (پیش‌فرض ۱) و `pageSize` (پیش‌فرض ۲۰، سقف ۱۰۰) — همان ابزار صفحه‌بندی عمومی پروژه.

```json
{
  "success": true,
  "message": "پروژه‌های پیشنهادی شما",
  "data": {
    "items": [
      {
        "project": { "id": "…", "title": "طراحی فروشگاه اینترنتی", "description": "…",
                      "minBudget": "50000000", "maxBudget": "80000000",
                      "deadline": "2027-10-15", "status": "IN_PROGRESS" },
        "match": { "status": "RECOMMENDED",
                   "skillScore": 100, "experienceScore": 100, "projectScore": 100,
                   "ratingScore": 100, "availabilityScore": 100, "budgetScore": 50,
                   "totalScore": 97.5, "trustScore": 100 }
      }
    ],
    "page": 1, "pageSize": 20, "total": 1, "totalPages": 1
  }
}
```

### GET `…/recommended-projects/:projectId` — جزئیات + توضیح‌پذیری
همان ساختار `items[0]` را برمی‌گرداند؛ همه‌ی اعداد **عین سطر `matches` در DB** هستند (صفر بازمحاسبه). برای هر حالت نامعتبر (بدون match، match با REJECTED، پروژه‌ی CANCELLED/COMPLETED/RATED، uuid ناموجود، match متعلق به متخصص دیگر) پاسخ یکسان **404 با `RECOMMENDATION_NOT_FOUND`** است.

### GET `…/recommended-projects/count` — `{ "data": { "count": N } }`

### خطاها
| وضعیت | کد |
|---|---|
| بدون توکن | 401 (قرارداد عمومی) |
| نقش CLIENT یا ADMIN | 403 |
| هر detail نامعتبر | 404 + `RECOMMENDATION_NOT_FOUND` |
| page/pageSize نامعتبر | 422 (Zod) |

## ۴) منطق فیلتر — کاملاً در دیتابیس

```ts
where: {
  specialistId,                                    // مالکیت
  status: { in: [RECOMMENDED, NEEDS_REVIEW] },     // REJECTED هرگز
  project: { status: { in: ACTIVE_PROJECT_STATUSES } } // CANCELLED/COMPLETED/RATED هرگز
}
```

- **مالکیت در detail با کلید مرکب** `findUnique({ where: { projectId_specialistId } })` اعمال می‌شود (تأییدشده در اسکیما: `@@unique([projectId, specialistId])`) — نه با فیلتر JS.
- **مرتب‌سازی قطعیِ چهارکلیدی**: `totalScore DESC → trustScore DESC → project.createdAt DESC → project.id ASC` (آخرین کلید برای شکستن تساوی کامل uuidهای هم‌زمان).
- بودجه به‌صورت string و deadline به‌صورت `YYYY-MM-DD` (قرارداد M08). هیچ فیلد حساسی (email/passwordHash) در select نیست.

## ۵) امنیت

- IDOR → 404 بدون افشای دلیل (متخصص دیگر، REJECTED، پروژه‌ی غیرفعال — همه یک شکل).
- فیلتر وضعیت پروژه در **SQL** اعمال شد؛ تغییر مستقیم DB (FLIP به CANCELLED/COMPLETED) بلافاصله در پاسخها منعکس می‌شود (تست ۹ و ۱۰) — یعنی هیچ state ای در حافظه‌ی سرور کش نمی‌شود.
- «limit» در اسپک به `pageSize` موجود نگاشت شد (قرارداد جاری پروژه مقدم است؛ تغییر نام پارامتر به‌تنهایی سازگاری API را می‌شکست).

## ۶) تست‌ها — `scripts/m11-tests.sh` (پیش‌نیاز: `m10-setup.sh`)

| گروه | تست‌ها | نتیجه |
|---|---|---|
| کنترل دسترسی | ۱) بدون توکن ۴۰۱ · ۲) CLIENT ۴۰۳ · ۳) ADMIN ۴۰۳ · ۴) SPECIALIST ۲۰۰ | ✅ |
| فیلتر DB | ۵) فقط matchهای خود متخصص، RECOMMENDED 97.5 · ۶) specB می‌بیند 72.5 نه 97.5 · ۷) REJECTED مخفی (total=0) · ۸) NEEDS_REVIEW نمایش 73.5 · ۹) SQL→CANCELLED: لیست ۰/جزئیات ۴۰۴ · ۱۰) SQL→COMPLETED: لیست ۰/جزئیات ۴۰۴ · ۱۱) بدون match → چیزی برنمی‌گردد | ✅ |
| IDOR | ۱۲) match دیگران ۴۰۴ · ۱۳) REJECTED ۴۰۴ · ۱۴) uuid تصادفی ۴۰۴ · ۱۵) پروژه‌ی فعال بدون match ۴۰۴ | ✅ |
| توضیح‌پذیری | ۱۶) هفت مؤلفه + total + trust عیناً برابر psql (بدون بازمحاسبه) · ۱۷) دقیقاً ۷ فیلد project، بدون email/passwordHash · ۱۸) لیست هم بدون فیلد حساس · ۱۹) specJ: 70/NEEDS_REVIEW عین DB | ✅ |
| صفحه‌بندی | ۲۰) metadata مطابق قرارداد + pageSize=2/صفحه‌ی ۲ · ۲۱) page=0/pageSize=0/101 → ۴۲۲ · ۲۲) مرتب‌سازی چهارکلیدی در هر دو سطح: createdAt-DESC و tie کامل → id ASC | ✅ |

**نتیجه‌ی نهایی از محیط تازه: `PASS=25 FAIL=0 — ALL M11 TESTS PASSED ✓`**

برای گروه مرتب‌سازی، دو match آزمایشی با SQL برای specA seed شد (تساوی کامل total/trust با P2 + ردیف سوم ۶۰) تا هر چهار کلید ترتیب عملاً ارزیابی شود.

## ۷) رگرسیون و سلامت کلی (همه از همین چرخه)

| بررسی | نتیجه |
|---|---|
| تست‌های unit (سه فایل M07/M09/M10) | ✅ 67/67 |
| `m10-setup.sh` → `m10-hotfix-verify.sh` | ✅ ۵/۵ |
| `m10-setup.sh` → `m10-tests.sh` (اجرا‌ی تازه) | ✅ بدون خطا، M10 COMPLETE |
| `m10-setup.sh` → `m11-tests.sh` (اجرا‌ی تازه) | ✅ 25/25 |
| `npm run build` | ✅ |
| `prisma validate` | ✅ valid |
| `prisma migrate status` | ✅ up to date (تنها مایگریشن init) |
| `prisma migrate diff` | ✅ **No difference detected** |

## ۸) نکات اجرایی

- `m11-tests.sh` مثل `m10-tests.sh` **مصرف‌کننده‌ی state** است؛ همیشه بلافاصله بعد از `m10-setup.sh` اجرا شود (نه بعد از m10-tests که P2 را COMPLETED می‌کند).
- محدودیت نرخ لاگین (حدود ۳۰ درخواست در ۱۵ دقیقه، در حافظه) پس از چند setup پیاپی فعال می‌شود؛ ری‌استارت سرور کافی است.
