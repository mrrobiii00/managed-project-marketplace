# Milestone 09 — Project Execution + Task Management

> وضعیت: ✅ تکمیل — ۴۹ unit test (۲۶ موتور تطبیق + ۲۳ قوانین تسک) · ۵۱ integration test، همگی موفق
> **Schema تغییر نکرد · Migration جدید ساخته نشد** (مدل `tasks` از M01 کامل بود — `validate` ✔ · `migrate diff` → «No difference detected»)

---

## ۱) بررسی قبل از پیاده‌سازی (طبق قانون)

- مدل `Task` در `prisma/schema.prisma` موجود است با همه‌ی فیلدهای لازم (projectId, teamId, assignedTo, title, description, priority, status, dueDate, createdAt, updatedAt) → **کافی برای این Milestone**
- فقط یک migration موجود (`20260904163053_init`) — دست‌نخورده
- middlewareهای `requireAuth`/`requireRole` و `HttpError`/error-handler و helper صفحه‌بندی بازاستفاده شدند؛ هیچ بازنویسی‌ای انجام نشد

## ۲) APIهای جدید

| متد | مسیر | دسترسی |
|---|---|---|
| POST | `/api/v1/admin/projects/:projectId/start` | فقط ADMIN — TEAM_PROPOSED → IN_PROGRESS |
| POST | `/api/v1/projects/:projectId/tasks` | ADMIN · مالک · عضو تیم (متخصص فقط برای خودش) |
| GET | `/api/v1/projects/:projectId/tasks` | ADMIN · مالک · عضو تیم (غیرمرتبط 404) |
| GET | `/api/v1/projects/:projectId/tasks/:taskId` | همان List |
| PUT | `/api/v1/projects/:projectId/tasks/:taskId` | نقش‌محور (پایین) |
| DELETE | `/api/v1/projects/:projectId/tasks/:taskId` | ADMIN · مالک (فقط TODO) |

## ۳) Authorization (تست‌شده)

| عمل | ADMIN | CLIENT مالک | SPECIALIST عضو | غیرمرتبط |
|---|---|---|---|---|
| Create | ✅ (تخصیص به هر عضو) | ✅ (فقط عضو تیم) | ✅ فقط `assignedTo=خودش` | 404 |
| Read | ✅ | ✅ | ✅ | 404 |
| Update | ✅ همه‌ی فیلدها + status | title/description/priority/dueDate/assignedTo (status استریپ می‌شود) | **فقط status و فقط روی تسک خودش** (فیلد ممنوع → 403) | 404 |
| Delete | ✅ فقط TODO | ✅ فقط TODO | ❌ 403 | 404 |

## ۴) قوانین وضعیت

- پروژه: فقط `TEAM_PROPOSED → IN_PROGRESS` (اتمیک با `updateMany` شرطی؛ تیم باید باشد و ≥۱ عضو داشته باشد؛ تیم خودکار ACTIVE نمی‌شود) — repeat → 409
- تسک: `TODO→IN_PROGRESS` · `IN_PROGRESS→DONE` · `IN_PROGRESS→TODO` مجاز؛ `DONE` پایانی (هر گذار/ویرایش دیگر → 409) · حذف فقط TODO
- همه‌ی تغییرات تسک فقط روی پروژه‌ی IN_PROGRESS (خواندن در هر وضعیت مجاز)

## ۵) Validation

title تریم ۲..۱۵۰ · description ≤۳۰۰۰ · priority فقط enum · status فقط enum · dueDate سخت‌گیرانه `YYYY-MM-DD` (round-trip؛ `2026-02-30` رد؛ در Create نباید گذشته باشد) · assignedTo: UUID + وجود + SPECIALIST + فعال + **عضو همین تیم** (وگرنه 422) · pagination page≥1 / pageSize 1..100 · sort قطعی `createdAt DESC, id ASC` · فیلترهای status/priority/assignedTo

## ۶) امنیت

- **IDOR:** هر تسک با `findFirst({id, projectId})` — ترکیب ناهمخوان → 404؛ تسک باید به تیمِ همین پروژه متصل باشد (TASK_PROJECT_MISMATCH → 404)؛ غیرمرتبط‌ها در همه‌ی مسیرها 404
- **Mass Assignment:** Zod کلیدهای ناشناخته (id/projectId/teamId/createdAt/updatedAt) را استریپ می‌کند؛ نقش‌محور: متخصص فیلدهای ممنوعه → 403 (نه استریپ)
- Error codeهای ماشین‌خوان (اختیاری، additive در قرارداد فعلی): `PROJECT_NOT_IN_PROGRESS` · `PROJECT_NOT_TEAM_PROPOSED` · `TEAM_NOT_FOUND` · `TEAM_EMPTY` · `TASK_NOT_FOUND` · `TASK_PROJECT_MISMATCH` · `TASK_NOT_EDITABLE` · `TASK_ALREADY_DONE` · `INVALID_TASK_STATUS_TRANSITION` · `ASSIGNEE_NOT_TEAM_MEMBER` · `SPECIALIST_TASK_FORBIDDEN`
- بدون email/passwordHash در هیچ پاسخی

## ۷) ترتیب بررسی‌ها در Update/Delete (تصمیم مهم)

`context (404 غیرمرتبط) → تسکِ همین پروژه (404) → سازگاری تیم (404) → IN_PROGRESS (409) → قوانین نقش (403) → گذار وضعیت (409) → validate تخصیص (422)`
این ترتیب تضمین می‌کند ترکیب projectId/taskId ناهمخوان همیشه **404** بگیرد (نه 409) — در تست 44/51 پیدا و رفع شد.

## ۸) معماری

`modules/tasks/`: task.rules.ts (قوانین خالص) · task.schema.ts · task.types.ts · task.service.ts · task.controller.ts (نازک) · task.routes.ts — شروع پروژه در `modules/admin/` (startProject). بدون repository/CQRS.

## ۹) تست‌ها

- **Unit (بدون DB): ۴۹** — موتور تطبیق ۲۶ + قوانین تسک ۲۳ (گذارها، ماتریس فیلدها، تاریخ round-trip + کبیسه، ماتریس مجوزها)
- **Integration: ۵۱** — Start 1-10 ✔ (شامل team-missing و empty-team با 409 و پیام درست) · Create 11-25 ✔ (شامل 23b: متخصص برای دیگری → 403) · Read 26-33 ✔ (شامل فیلتر/صفحه‌بندی) · Update 34-45 ✔ (شامل همه‌ی 403های متخصص و گذارهای نامعتبر و استریپ projectId/teamId) · Delete 46-51 ✔

## ۱۰) Build / Database

`npm run build` exit=0 · `prisma validate` valid · `migrate status` up to date · `migrate diff` **No difference detected** · فقط `20260904163053_init` · health ×۲ = 200

## ۱۱) محدودیت‌ها

1. CLIENT ارسال `status` در PUT → بی‌اثر (استریپ) نه 403 — چون spec فقط برای متخصص 403 خواسته بود؛ رفتار مستند
2. در Create، `dueDate` گذشته رد می‌شود؛ در Update اجازه‌ی تاریخ گذشته داده شد («مگر در updateهای خاص»)
3. Spec نمونه‌ی error contract با `error.code` داد ولی گفت convention فعلی حفظ شود → شکل فعلی حفظ و فقط فیلد اختیاری `code` افزوده شد

## ۱۲) اجرای تست‌ها

```bash
npm run test:unit         # ۴۹ تست خالص (بدون DB)
npm run test:integration  # ۵۱ تست واقعی (نیازمند سرور در حال اجرا + PostgreSQL)
```
