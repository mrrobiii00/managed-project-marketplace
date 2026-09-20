# Milestone 01 — Database Schema (Prisma + PostgreSQL)

> وضعیت: ✅ تکمیل و اعتبارسنجی‌شده
> فایل اصلی: [`prisma/schema.prisma`](../prisma/schema.prisma)
> اعتبارسنجی: `prisma validate` ✔ · `prisma generate` ✔ · `prisma migrate diff` (DDL کامل) ✔

---

## ۱) نمای کلی ساختار

دوازده جدول MVP در شش دامنه‌ی مفهومی گروه‌بندی می‌شوند:

| دامنه | جدول‌ها | نقش |
|---|---|---|
| هویت و دسترسی | `users`, `profiles` | احراز هویت، RBAC، مشخصات حرفه‌ای |
| مهارت‌ها | `skills`, `user_skills` | دیکشنری مرکزی مهارت + سطح تسلط هر کاربر |
| پروژه | `projects`, `project_skills`, `project_roles` | تعریف پروژه، مهارت‌های موردنیاز، نقش‌های تیم |
| موتور تطبیق | `matches` | نتیجه الگوریتم Matching برای هر جفت (پروژه، متخصص) با شکست امتیاز قابل‌توضیح |
| تیم | `teams`, `team_members` | حداکثر یک تیم اصلی per پروژه + اعضا با نقش |
| اجرا و ارزیابی | `tasks`, `ratings` | برد Kanban پروژه + امتیازدهی همتا پس از پایان |

جریان اصلی داده:

```
Project → ProjectSkills/ProjectRoles → Match (scores) → Team → TeamMembers → Tasks → Ratings
```

## ۲) روابط (۱۴ رابطه)

| # | از | به | نوع | نام رابطه در Prisma | onDelete |
|---|---|---|---|---|---|
| 1 | users | profiles | 1 → 0..1 | پیش‌فرض | Cascade |
| 2 | users | user_skills | 1 → N | پیش‌فرض | Cascade |
| 3 | skills | user_skills | 1 → N | پیش‌فرض | Cascade |
| 4 | users (client) | projects | 1 → N | `"ClientProjects"` | Cascade |
| 5 | projects | project_skills | 1 → N | پیش‌فرض | Cascade |
| 6 | skills | project_skills | 1 → N | پیش‌فرض | Cascade |
| 7 | projects | project_roles | 1 → N | پیش‌فرض | Cascade |
| 8 | projects | matches | 1 → N | پیش‌فرض | Cascade |
| 9 | users (specialist) | matches | 1 → N | `"SpecialistMatches"` | Cascade |
| 10 | projects | teams | 1 → 0..1 | پیش‌فرض | Cascade |
| 11 | teams | team_members | 1 → N | پیش‌فرض | Cascade |
| 12 | users | team_members | 1 → N | پیش‌فرض | Cascade |
| 13 | projects / teams / users | tasks | N → 1 ×۳ | `"AssignedTasks"` | Cascade / Cascade / **SetNull** |
| 14 | projects / from_user / to_user | ratings | N → 1 ×۳ | `"RatingGiver"` / `"RatingReceiver"` | Cascade ×۳ |

نکته‌ی مهم: هر پنج رابطه‌ی چندگانه به `users` صریحاً نام‌گذاری شده‌اند تا Prisma Client API بدون ابهام باشد:
`clientProjects` · `specialistMatches` · `assignedTasks` · `ratingsGiven` · `ratingsReceived`

## ۳) Enumها (۸ عدد)

| Enum (DB type) | مقادیر |
|---|---|
| `user_role` | CLIENT · SPECIALIST · ADMIN |
| `availability_status` | AVAILABLE · BUSY · UNAVAILABLE |
| `skill_level` | BEGINNER · INTERMEDIATE · ADVANCED · EXPERT |
| `project_status` | DRAFT · SUBMITTED · MATCHING · REVIEW · TEAM_PROPOSED · IN_PROGRESS · COMPLETED · RATED · CANCELLED |
| `match_status` | RECOMMENDED · NEEDS_REVIEW · REJECTED · FLAGGED |
| `team_status` | PROPOSED · ACTIVE · COMPLETED |
| `task_priority` | LOW · MEDIUM · HIGH |
| `task_status` | TODO · IN_PROGRESS · DONE |

## ۴) قیدهای یکپارچگی

**Unique:**
- `users.email`
- `profiles.user_id` (تضمین رابطه 1:1)
- `skills.name`
- `(user_id, skill_id)` در user_skills — هر مهارت برای هر کاربر فقط یک‌بار
- `(project_id, skill_id)` در project_skills
- `(project_id, specialist_id)` در matches — بدون تطبیق تکراری
- `teams.project_id` — حداکثر یک تیم اصلی برای هر پروژه
- `(team_id, user_id)` در team_members
- `(project_id, from_user_id, to_user_id)` در ratings — **افزوده‌ی فراتر از شرح وظیفه**: هر ارزیاب برای هر فرد، در هر پروژه فقط یک امتیاز (جلوگیری از Rating Abuse)

**قوانین نرم (در لایه اپلیکیشن با Zod + SQL اختیاری):**
Prisma از CHECK constraint پشتیبانی نمی‌کند؛ چهار قانون زیر در Backend اعمال می‌شوند و در صورت نیاز با SQL دستی به migration اضافه می‌گردند:

```sql
ALTER TABLE project_roles ADD CONSTRAINT chk_quantity_positive   CHECK (quantity > 0);
ALTER TABLE ratings      ADD CONSTRAINT chk_score_range          CHECK (score BETWEEN 1 AND 5);
ALTER TABLE ratings      ADD CONSTRAINT chk_no_self_rating       CHECK (from_user_id <> to_user_id);
ALTER TABLE projects     ADD CONSTRAINT chk_budget_order         CHECK (min_budget IS NULL OR max_budget IS NULL OR max_budget >= min_budget);
```

**سیاست حذف (onDelete):** برای MVP، حذف سخت‌افزاری با Cascade زنجیره‌ای (مثلاً حذف پروژه → حذف matches/tasks/ratings آن). تنها استثنا: حذف کاربرِ مسئولِ تسک → `SetNull` (تسک بی‌مسئول می‌ماند تا دوباره تخصیص یابد). Soft-delete / بی‌نام‌سازی در فاز بعدی MVP بررسی می‌شود.

## ۵) ایندکس‌های ایجادشده و دلیل

| ایندکس | پرس‌وجوی هدف |
|---|---|
| `projects(status, created_at)` | داشبورد ادمین / صف بررسی / لیست پروژه‌های عمومی |
| `projects(client_id)` | «پروژه‌های من» برای کارفرما |
| `user_skills(skill_id)` | جست‌وجوی معکوس: کدام متخصصان مهارت X را دارند (ورودی موتور Matching) |
| `project_skills(skill_id)` | کدام پروژه‌ها به مهارت X نیاز دارند |
| `matches(project_id, total_score DESC)` | لیست رتبه‌بندی‌شده‌ی نامزدهای هر پروژه (هات‌ترین کوئری) |
| `matches(status)` | صف‌های Triage ادمین (NEEDS_REVIEW / FLAGGED) |
| `matches(specialist_id)` | «پیشنهادهای کاری من» برای متخصص |
| `tasks(project_id, status)` | ستون‌های برد Kanban |
| `tasks(assigned_to, status)` | داشبورد «تسک‌های من» |
| `team_members(user_id)` | عضویت‌های کاربر در تیم‌ها |
| `ratings(to_user_id)` | محاسبه‌ی Reputation/Trust هر کاربر (کوئری داغ) |
| `ratings(from_user_id)` | «امتیازهایی که دادم» |

## ۶) تصمیم‌های طراحی

1. **UUID PK** با `@default(uuid())` — تولید در سمت Prisma Client؛ جایگزین: `gen_random_uuid()` سمت دیتابیس.
2. **امتیازها `Decimal(5,2)`** (بازه 0–100 با دو رقم اعشار) — دقت ثابت و بدون خطای گرد کردن Float در تجمیع. **بودجه `Decimal(14,2)`** — مناسب مبالغ ریالی/تومانی بزرگ.
3. **نام‌گذاری**: فیلدهای camelCase در Prisma → ستون‌ها/جدول‌های snake_case در PostgreSQL با `@map`/`@@map` (سازگار با شرح وظیفه). enum typeها هم snake_case مپ شده‌اند.
4. **`assigned_to` در tasks اختیاری (nullable)** — تسک می‌تواند ابتدا بی‌مسئول باشد و با حذف کاربر، با `SetNull` زنده بماند.
5. **`matches.status` پیش‌فرض NEEDS_REVIEW** — هیچ تطبیقی بدون بازبینی انسانی به‌صورت خودکار «پیشنهاد» نمی‌شود (اصل Human Oversight).
6. **Prisma 6.19** به‌جای 7 — نسخه‌ی ۷ الگوی جدید `prisma.config.ts` + Driver Adapter را الزامی می‌کند که برای مرحله‌ی «فقط Schema» پیچیدگی زائد دارد؛ 6.19 پایدار، کاملاً پشتیبانی‌شده و با الگوی استاندارد `env("DATABASE_URL")` است. ارتقا در پایان MVP ممکن است.

## ۷) نحوه‌ی اجرا

```bash
npm install                       # نصب وابستگی‌ها (prisma + @prisma/client)
cp .env.example .env              # DATABASE_URL را به PostgreSQL خود تنظیم کنید
npx prisma migrate dev --name init  # ساخت migration اولیه + اعمال روی دیتابیس
npx prisma generate               # تولید Prisma Client
npx prisma studio                 # مشاهده‌ی دیتابیس در مرورگر
```

خروجی اعتبارسنجی انجام‌شده در محیط توسعه:
- `prisma validate` → «The schema is valid» ✔
- `prisma generate` → تولید موفق Prisma Client v6.19.3 ✔
- `prisma migrate diff --from-empty` → DDL کامل: **12 CREATE TABLE، 8 CREATE TYPE، 23 ایندکس (9 unique + 14 معمولی)، 18 FK** ✔

## ۸) تغییرات بازبینی‌شده (Review Round 1)

- `Project.deadline` → `DateTime? @db.Date` (فقط تاریخ، بدون ساعت)
- `Task.dueDate` → `DateTime? @map("due_date") @db.Date`
- `Profile.hourlyRate` → `Decimal? @map("hourly_rate") @db.Decimal(12, 2)` — ورودی محاسبه‌ی Budget Match در موتور Matching
- Trust Score همچنان فقط محاسباتی است و صرفاً snapshot آن در `Match.trustScore` ذخیره می‌شود
- قیدهای عددی (`quantity > 0`، `score ∈ [1,5]`، امتیازهای Match در بازه [0,100]) در لایه‌ی Backend/Validation اعمال می‌شوند — بدون ساختار جدید
- هیچ جدول، Enum، رابطه یا ایندسی اضافه/حذف نشد؛ تمام relation nameها و unique constraintها دست‌نخورده‌اند
