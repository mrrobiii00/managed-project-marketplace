# Milestone 05 — Users + Specialist Profiles + Skills

> وضعیت: ✅ تکمیل — build موفق، هر ۱۸ سناریوی تست (+ تست‌های تکمیلی IDOR/404) موفق
> بدون تغییر `prisma/schema.prisma` (migrate diff → «No difference detected») · بدون Migration جدید

---

## ۱) APIهای جدید

| متد | مسیر | حفاظت | توضیح |
|---|---|---|---|
| GET | `/api/v1/profile/me` | requireAuth | پروفایل کاربر جاری — اگر نبود **404** «پروفایلی برای شما ثبت نشده است» (رفتار مستند) |
| PUT | `/api/v1/profile/me` | requireAuth | ایجاد/ویرایش (upsert) پروفایل خود کاربر |
| GET | `/api/v1/profile/me/skills` | requireAuth | مهارت‌های کاربر جاری |
| POST | `/api/v1/profile/me/skills` | requireAuth | افزودن مهارت (skillId باید در DB باشد وگرنه 404؛ تکراری 409) |
| PUT | `/api/v1/profile/me/skills/:skillId` | requireAuth | تغییر level / yearsOfExperience (404 اگر در پروفایل نباشد) |
| DELETE | `/api/v1/profile/me/skills/:skillId` | requireAuth | حذف مهارت خود کاربر |
| GET | `/api/v1/skills` | **عمومی** (تصمیم مستند: کاتالوگ Skill داده‌ی مرجع غیرحساس است) | لیست + `?search=` + `?category=` + صفحه‌بندی |
| GET | `/api/v1/specialists` | requireAuth (تصمیم مستند: داده‌ی درون‌سکویی برای Client و Matching) | فقط SPECIALISTهای فعال + پروفایل + مهارت‌ها |
| GET | `/api/v1/specialists/:id` | requireAuth | جزئیات یک متخصص — اگر نبود یا SPECIALIST نبود → 404 |

## ۲) ساختار

`modules/profile/` (schema·service·controller·routes) · `modules/skills/` · `modules/specialists/` (بدون schema — فقط pagination) · `utils/pagination.ts` مشترک · `prisma/seed.ts` (idempotent با skipDuplicates — اجرای دوم: «۰ جدید»)

## ۳) Validation Rules (Zod)

- `fullName`: trim · 2..100 کاراکتر · `bio` ≤2000 · `jobTitle` ≤100
- `yearsOfExperience`: عدد صحیح 0..60
- `availability`: فقط AVAILABLE | BUSY | UNAVAILABLE
- `avatarUrl`: فقط URL معتبر http/https (بدون upload واقعی)
- `hourlyRate`: عدد ≥ 0 · حداکثر دو رقم اعشار (`Math.round(v*100) === v*100`)
- `level`: فقط BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
- `skillId`/`:id`: UUID معتبر RFC + بررسی وجود در DB (UUID ناموجود → 404)
- صفحه‌بندی: `page` ≥1 · `pageSize` 1..100

## ۴) Security / Ownership

- **ضد IDOR:** مالکیت در تمام مسیرهای `/me` فقط از `req.user.id` (توکن)؛ `userId` در body دور ریخته می‌شود و بی‌اثر است (تست 17 ✓)
- **ضد Mass Assignment:** schema فقط ۷ فیلد پروفایل را می‌پذیرد؛ کلیدهای ناشناخته (`role`, `email`, ...) با `.parse` به‌صورت پیش‌فرض strip می‌شوند → تغییر Role از Profile API غیرممکن است (تست 18 ✓)
- کلید مرکب `userId_skillId` در UPDATE/DELETE تضمین می‌کند فقط رکورد خود کاربر تغییر کند
- `passwordHash` و `email` هرگز در خروجی specialists نیست (select صریح — تست: `email در پاسخ؟ false`)
- فقط کاربران `isActive` در دایرکتوری نمایش داده می‌شوند

## ۵) نتایج تست واقعی (خلاصه)

| سناریو | کد | سناریو | کد |
|---|---|---|---|
| ۱ ساخت Profile (PUT) | 200 | ۱۲ حذف مهارت / افزودن مجدد | 200 / 201 |
| ۲ GET پروفایل | 200 | ۱۳ لیست مهارت‌های من | 200 (Node, React) |
| ۳ ویرایش | 200 | ۱۴ specialists | 200 (total=2) |
| ۴ سال تجربه 500 و -1 | 422 / 422 | 14b بدون توکن | 401 |
| ۵ نرخ -50 و 12.345 | 422 / 422 | ۱۵ جزئیات متخصص | 200 (بدون email) |
| ۶ availability غلط | 422 | 15b CLIENT به‌عنوان متخصص / UUID جعلی | 404 / 404 |
| ۸ skills + search/category | 200 | ۱۶ /profile/me بدون توکن | 401 |
| ۹ افزودن مهارت | 201 | ۱۷ userId جعلی در body | بی‌اثر ✓ |
| 9b skillId ناموجود | 404 | ۱۸ role:ADMIN در body | SPECIALIST ماند ✓ |
| ۱۰ تکراری | 409 | Health ×۲ | 200 / 200 |
| ۱۱ تغییر مهارت | 200 | build / seed×2 / schema-diff | ✔ / 0 جدید / No diff |

## ۶) خطاهای محتمل

| علامت | علت | رفع |
|---|---|---|
| 404 «پروفایلی ثبت نشده» | GET قبل از PUT | اول `PUT /profile/me` |
| 422 شناسه نامعتبر | UUID با فرمت غلط (مثل all-1s که RFC نیست) | UUID واقعی از `GET /skills` بگیرید |
| 409 هنگام افزودن مهارت | مهارت قبلاً ثبت شده | `PUT /profile/me/skills/:id` برای تغییر |
| Decimal به‌صورت رشته در JSON | Prisma Decimal → string | طبیعی است؛ Frontend با `Number()` می‌خواند |
| 401 روی specialists | توکن ارسال نشده | Bearer token لازم است (عمومی نیست) |

## ۷) چک‌لیست Milestone 05

- [x] فقط از جداول موجود (users/profiles/skills/user_skills) استفاده شد — Schema و Migration دست‌نخورده
- [x] Profile CRUD با PUT/GET و رفتار 404 مستند برای پروفایلِ نبوده
- [x] UserSkill افزودن/تغییر/حذف با 409 تکراری و 404 ناموجود
- [x] لیست skills با search/category/صفحه‌بندی ساده
- [x] دایرکتوری specialists + جزئیات (بدون هیچ داده‌ی حساس)
- [x] IDOR و Mass Assignment و تغییر Role آزمایش و رد شد
- [x] seed idempotent (۲۰ مهارت؛ اجرای دوم: ۰ جدید)
- [x] build بدون خطا · health سالم · اتصال به همان DB قبلی
