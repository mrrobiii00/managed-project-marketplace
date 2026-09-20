# مایل‌استون ۱۲ — Admin Dashboard API + نمای عملیاتی

> وضعیت: ✅ تحویل‌شده و کاملاً تست‌شده — ۳۲ سناریوی الزامی اسپک + رگرسیون کامل M07–M11 سبز
>
> اصل معماری: چهار endpoint **فقط-خواندنی و فقط-ADMIN** روی داده‌های موجود؛ همه‌ی شمارش‌ها با aggregate های DB (`groupBy`/`count`)، بدون بارگذاری رکورد و شمارش در JavaScript. هیچ business rule ای از M07–M11 تغییر نکرده است.

---

## ۱) دامنه (Scope)

| قابلیت | وضعیت |
|---|---|
| Dashboard Summary (users/projects/matches/teams/tasks) | ✅ |
| Recent Projects (صفحه‌بندی + sort قطعی) | ✅ |
| Attention Projects (SUBMITTED/REVIEW/TEAM_PROPOSED) | ✅ |
| Match Review Summary | ✅ |
| Project Status Summary | ✅ داخل همان `summary` (بلوک projects) — endpoint جدا ساخته نشد طبق اسپک |
| React / UI | ❌ این milestone — فقط API برای Dashboard آینده |
| business rule جدید / تغییر lifecycle | ❌ هیچ |

## ۲) فایل‌های تغییر‌یافته — توسعه‌ی ماژول admin موجود (بدون duplicate)

| فایل | تغییر |
|---|---|
| `backend/src/modules/admin/admin.types.ts` | **جدید** — انواع DTO داشبورد (بدون منطق) |
| `backend/src/modules/admin/admin.service.ts` | توسعه‌ی همان فایل: `getDashboardSummary`، `getMatchSummary`، `listRecentProjects`، `listAttentionProjects` + select مشترک Dashboard |
| `backend/src/modules/admin/admin.controller.ts` | ۴ کنترلر نازک جدید |
| `backend/src/modules/admin/admin.routes.ts` | ۴ مسیر `GET /dashboard/*` زیر همان گارد `requireAuth + requireRole('ADMIN')` موجود ماژول |
| `backend/src/modules/admin/admin.schema.ts` | `dashboardPaginationSchema` — همان `paginationSchema` مشترک با پیش‌فرض `pageSize=10` طبق قرارداد M12 |
| `scripts/m12-tests.sh` | **جدید** — ۳۲ سناریوی یکپارچگی |
| `docs/milestone-12-admin-dashboard.md` | همین سند |

`app.ts` **تغییر نکرد** (adminRouter از قبل روی `/api/v1/admin` سوار بود). اسکیما و مایگریشن **بدون تغییر**.

## ۳) قرارداد API

| # | Method | Path | Auth | Role | Query | خطاها |
|---|---|---|---|---|---|---|
| ۱ | GET | `/api/v1/admin/dashboard/summary` | Bearer | ADMIN | — | 401 / 403 |
| ۲ | GET | `/api/v1/admin/dashboard/recent-projects` | Bearer | ADMIN | page≥1، pageSize 1..100 (default 10) | 401 / 403 / 422 |
| ۳ | GET | `/api/v1/admin/dashboard/attention` | Bearer | ADMIN | page≥1، pageSize 1..100 (default 10) | 401 / 403 / 422 |
| ۴ | GET | `/api/v1/admin/dashboard/match-summary` | Bearer | ADMIN | — | 401 / 403 |

**۱) summary** → `{users:{total,clients,specialists,admins,active,inactive}, projects:{total + هر ۹ وضعیت camelCase}, matches:{recommended,needsReview,rejected}, teams:{proposed,active,completed}, tasks:{todo,inProgress,done}}`

**۲) recent-projects** → `{items:[{id,title,status,minBudget,maxBudget,deadline,createdAt,client:{id,fullName}}], page,pageSize,total,totalPages}` — sort: `createdAt DESC, id ASC`

**۳) attention** → همان شکل آیتم؛ فقط سه وضعیت هدف؛ sort: اولویت وضعیت (`SUBMITTED→REVIEW→TEAM_PROPOSED`) سپس `createdAt ASC` (قدیمی‌تر اول) سپس `id ASC` — **تماماً در DB**

**۴) match-summary** → `{recommended,needsReview,rejected,total}` — `total` = `count(*)` واقعی کل جدول

بودجه → string، deadline → `YYYY-MM-DD`، createdAt → ISO — مطابق DTO های موجود پروژه.

## ۴) دیتابیس و Performance

- **Schema تغییر نکرد. مایگریشن ساخته نشد** — مدل‌های موجود کاملاً کافی بودند (`migrate diff`: «No difference detected»).
- شمارش‌ها: ۶ کوئری `groupBy` (بدون load رکورد)؛ `total` ها = جمع همان aggregate ها یا `count()`.
- صفحه‌بندی recent/attention: `findMany` با `select` + `skip/take` — فقط رکوردهای همان صفحه.
- **N+1 وجود ندارد**: relation `client` با `select` تو در تو (join واحد) گرفته می‌شود؛ هیچ حلقه‌ای روی آیتم‌ها کوئری اضافه نمی‌زند.
- ترفند sort اولویت در attention: ترتیب تعریف enum `ProjectStatus` در Postgres همان ترتیب اولویت است ⇒ `status ASC` بدون CASE/کد JS.

## ۵) امنیت

- گارد یکجا: `router.use(requireAuth, requireRole('ADMIN'))` ماژول admin — هر ۴ مسیر ADMIN-only؛ SPECIALIST/CLIENT با هر URL → 403 (تست‌شده روی هر ۴ endpoint).
- آیتم‌های پروژه فقط ۸ فیلد Dashboards؛ client فقط `{id, fullName}` — بدون email/passwordHash/JWT/secret (تست ۱۹/۲۰ شامل regex روی کل body).
- همه‌ی query ها پارامتری Prisma؛ ورودی‌ها Zod (uuid/page/pageSize) → 422.
- Dashboard کل سیستم است؛ ownership پروژه موضوعیت ندارد (طبق اسپک) و هیچ مسیر نوشتاری اضافه نشد.

## ۶) تست‌ها — `scripts/m12-tests.sh` (پیش‌نیاز: `m10-setup.sh`)

| گروه | سناریوها | نتیجه |
|---|---|---|
| RBAC (۱-۴) | ماتریس ۴×۴: بدون‌توکن ۴۰۱ / CLIENT ۴۰۳ / SPECIALIST ۴۰۳ / ADMIN ۲۰۰ برای **هر ۴ endpoint** | ✅ |
| Summary (۵-۱۴) | users.total/clients/specialists/admins/active-inactive؛ هر ۹ وضعیت project + total؛ matches ۳گانه؛ teams ۳گانه؛ tasks ۳گانه — همه عیناً برابر psql؛ سازگاری total با جمع اجزا | ✅ |
| Recent (۱۵-۲۰) | page=2/pageSize=5؛ default=10 و سقف ۱۰۰ (۱۰۱ و ۰ → 422)؛ createdAt DESC؛ tie-break با FLIP دو created_at برابر → id ASC؛ دقیقاً ۸ فیلد؛ بدون فیلد حساس | ✅ |
| Attention (۲۱-۲۷) | فقط ۳ وضعیت (با درج SQL سه پروژه‌ی REVIEW/TEAM_PROPOSED/SUBMITTED)؛ CANCELLED با FLIP مستقیم DB برنمی‌گردد؛ COMPLETED/IN_PROGRESS هم نه؛ اولویت SUBMITTED→REVIEW→TEAM_PROPOSED؛ داخل وضعیت createdAt ASC؛ صفحه‌بندی بدون هم‌پوشانی | ✅ |
| Match-Summary (۲۸-۳۲) | هر ۳ وضعیت + total = `count(*)`؛ FLIP مستقیم DB یک NEEDS_REVIEW→REJECTED بلافاصله در پاسخ منعکس شد (total ثابت) | ✅ |

**نتیجه‌ی چرخه‌ی تازه: `M12 RESULT: PASS=32 FAIL=0 — ALL M12 TESTS PASSED ✓`**

## ۷) رگرسیون و سلامت کلی (همه از همین نشست)

| بررسی | نتیجه |
|---|---|
| unit (سه فایل M07/M09/M10) | ✅ 67/67 |
| `m10-setup` → `m12-tests` | ✅ 32/32 |
| `m10-setup` → `m10-hotfix-verify` | ✅ 5/5 |
| `m10-setup` → `m10-tests` | ✅ exit 0 — M10 COMPLETE |
| `m10-setup` → `m11-tests` | ✅ 25/25 |
| `npm run build` | ✅ |
| `prisma validate` | ✅ |
| `prisma migrate status` | ✅ up to date — تنها مایگریشن init |
| `prisma migrate diff` | ✅ «No difference detected» |

## ۸) Manual Verification (داده‌ی واقعی)

- **A)** summary در برابر psql: users 11 (2C/8S/1A، 10 فعال/1 غیرفعال)، matches 2/4/1، teams 2/1/6، tasks 0/1/2 — همه برابر ✓
- **B)** recent-projects: دو پروژه‌ی واقعی (`m10-proposed-team` IN_PROGRESS و `m9-empty-team` TEAM_PROPOSED) با client «کارفرمای الف»، total=11 ✓
- **C)** attention: «پروژه چهارم تست» (SUBMITTED) و `m9-empty-team` (TEAM_PROPOSED) ✓
- **D)** توکن SPECIALIST روی همان مسیر → 403 ✓

## ۹) Scope Guard — تأیید صریح

Matching Engine تغییری نکرد • Score ها عین DB خوانده می‌شوند (بدون بازمحاسبه) • Trust Score دست‌نخورده • Recommendation M11 دست‌نخورده • lifecycle پروژه/تیم/تسک/امتیاز دست‌نخورده • هیچ Match/Team/Task/Rating جدیدی توسط M12 ایجاد نشد (درج‌های تستی فقط داخل `m12-tests.sh` برای سناریوهای sort و بعد از آن‌ها فقط خواندن) • بدون Payment/Chat/Notification/React/Redis/Job.

**یادداشت شفاف‌سازی (بدون قرارداد جدید):** enum وضعیت match یک مقدار چهارم `FLAGGED` دارد که در قرارداد M12 نیست؛ در بلوک `matches` فقط سه کلید اسپیک برمی‌گردد و `total` در match-summary شمارش واقعی کل رکوردهاست (FLAGGED در آن لحاظ می‌شود؛ در داده‌ی فعلی صفر است).
