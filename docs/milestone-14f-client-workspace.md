# مایل‌استون 14-F — Workspace پروژه‌ی کارفرما در فرانت‌اند

> وضعیت: ✅ تکمیل‌شده — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) قرارداد بک‌اند (استخراج‌شده از source واقعی M06–M10)

| حوزه | قرارداد واقعی |
|---|---|
| Project | `GET/PUT/submit/DELETE` مطابق M06 (ویرایش DRAFT\|SUBMITTED؛ submit/delete فقط DRAFT؛ بودجه string در پاسخ) |
| Team | `GET /projects/:id/team` (M08) — DTO با name/teamScore/status/members{userId,fullName,jobTitle,role,matchScore,joinedAt}؛ بدون تیم یا غیرمرتبط → 404 |
| Tasks | `GET list (فیلتر status/priority/assignedTo + pagination؛ sort سرور) · GET detail` (M09) |
| Task mutations | **CLIENT مالک**: create ✓ (assignedTo اختیاری — باید عضو تیم باشد وگرنه 422) · edit فقط `title/description/priority/dueDate/assignedTo` — **status توسط سرور برای CLIENT دور ریخته می‌شود (no-op؛ تست شد)** · delete ✓ فقط TODO (غیر آن → 409) · همه‌ی تغییرات فقط در پروژه‌ی IN_PROGRESS؛ ویرایش DONE → 409 |
| Lifecycle | کارفرما فقط `submit` دارد؛ start/complete/cancel فقط ADMIN (M09/M10) → هیچ دکمه‌ای برای این‌ها ساخته نشد |
| Rating | `POST/GET /projects/:id/ratings` واقعی است (M10) — **تصمیم §28 پایین** |

**رفتار واقعی پروژه‌ی دیگری (تست ۲):** clientB روی P2 → project 200 (non-DRAFT) ولی team/tasks → 404 — دقیقاً همین در Workspace بازتاب می‌شود.

## ۲) فایل‌ها

**جدید (۲):** `components/teams/TeamSummaryCard.tsx` (کارت فقط‌خواندنی تیم — قابل استفاده‌ی مجدد)، `components/tasks/ClientTasksSection.tsx`
**تغییر (۳):** `pages/client/ClientProjectDetailPage.tsx` (تبدیل به Workspace کامل — همان مسیر M14-B، بدون route جدید)، `services/task.service.ts` (+`deleteTask` با مستندسازی مجوز واقعی)، `types/task.ts` (+`assignedTo` در UpdateTaskPayload طبق قرارداد PUT)

Typeهای Project/Task/Team و serviceهای موجود M14-B/M14-E عیناً reuse شدند (بدون duplicate).

## ۳) Workspace کارفرما

چیدمان §21: هدر (عنوان/وضعیت/تاریخ‌ها) → اقدامات (Edit/Submit/Delete طبق قواعد M06 با ConfirmDialog و loading/ضد double-submit — از M14-B) → اطلاعات پروژه (شرح/بودجه فرمت‌شده/مهلت/skills/roles) ‖ تیم فقط‌خواندنی (نام/وضعیت/امتیاز/اعضا با نقش و امتیاز تطبیق؛ Empty State «هنوز تیمی برای این پروژه تشکیل نشده است.») → کارها + پیشرفت.

## ۴) کارها و پیشرفت

- لیست با فیلتر وضعیت + pagination واقعی؛ هر کار: عنوان/شرح/اولویت/وضعیت/مسئول/مهلت/ایجاد/به‌روزرسانی (detail در همان کارت — route اضافی نساخته شد).
- **ایجاد/ویرایش** فقط در IN_PROGRESS؛ فرم مشترک با انتخاب مسئول از اعضای تیم (قید بک‌اند)؛ **status هرگز در payload نیست**.
- **حذف** فقط TODO با ConfirmDialog؛ خطاها (409/422) با پیام فارسی سرور.
- **پیشرفت**: صرفاً presentation از داده‌ی واقعی — نوار + «X از Y کار انجام شده (Z٪)» + aria-valuenow؛ هیچ تصمیم/ارسالی بر پایه‌ی آن نیست (§15 رعایت شد).

## ۵) تصمیم Rating (§28)

Endpointهای M10 واقعی و کامل‌اند، اما برای جلوگیری از scope creep (Workspace + Task CRUD + Progress در این مرحله)، **Rating UI به مایل‌استون بعدی منتقل شد**. هیچ منطق ratingای در فرانت نوشته نشد. در وضعیت COMPLETED/RATED کارها و اطلاعات پروژه فقط‌خواندنی نمایش داده می‌شوند.

## ۶) امنیت

projectId از route؛ clientId/userId/role هرگز ارسال نمی‌شوند؛ ownership کاملاً از بک‌اند (clientB → team/tasks 404)؛ بدون action تیم/lifecycle برای کارفرما (grep = 0)؛ 401 → ابطال نشست M14-A؛ پیام‌های 403/404/409/422 فارسی و بدون جزئیات داخلی.

## ۷) تست‌ها (TEST | RESULT | METHOD)

| # | سناریو | نتیجه | روش |
|---|---|---|---|
| 1 | clientA→پروژه‌ی خودش: project/team/tasks = 200 | PASS | CURL |
| 2 | clientB→پروژه‌ی دیگری: project 200 / team+tasks 404 (رفتار واقعی) | PASS | CURL |
| 3 | SPECIALIST→مسیر client → 403 (RoleGuard) | PASS | CODE |
| 4 | ADMIN→مسیر client → 403 (RoleGuard) | PASS | CODE |
| 5 | unauth → 401 → login (M14-A) | PASS | CURL + CODE |
| 6-10 | فیلدهای واقعی: status IN_PROGRESS، ۳ مهارت، ۲ نقش، بودجه، رندر با mapping مرکزی | PASS | CURL + CODE |
| 11 | ویرایش مجاز (SUBMITTED مال خود) → 200 | PASS | CURL |
| 12 | ویرایش ممنوع (IN_PROGRESS) → 409 فارسی | PASS | CURL |
| 13 | submit مجاز (DRAFT کامل‌شده) → 200 SUBMITTED | PASS | CURL |
| 14 | submit نامعتبر (SUBMITTED تکراری) → 409 | PASS | CURL |
| 15 | delete مجاز (DRAFT) → 200 | PASS | CURL |
| 16 | delete ممنوع (IN_PROGRESS) → 409 فارسی | PASS | CURL |
| 17-19 | تیم واقعی: اعضا/نقش/امتیاز تطبیق + وضعیت ACTIVE + امتیاز 83.75 | PASS | CURL |
| 20 | بدون action تیم (grep = 0) | PASS | CODE |
| 21 | بدون تیم → 404 → Empty State فارسی | PASS | CURL + CODE |
| 22 | لیست واقعی (total=4) | PASS | CURL |
| 23 | detail در کارت (route اضافی ساخته نشد) | PASS | CODE |
| 24 | فیلتر وضعیت + pagination (pageSize=2 → ۲ صفحه) | PASS | CURL |
| 25 | empty (P4 بدون تسک) | PASS | CURL |
| 26 | وضعیت‌ها با label فارسی + badge | PASS | CODE |
| 27 | مجوز واقعی CLIENT: ویرایش ۵ فیلد مجاز؛ status → no-op سرور (تست شد: status هنوز TODO)؛ UI هیچ status action ندارد | PASS | CURL + CODE |
| 28 | جهش غیرمجاز: clientB → tasks 404 | PASS | CURL |
| 29 | taskId نامعتبر → 404 | PASS | CURL |
| 30 | mismatch (تست M14-E پوشش داد؛ همین سرویس/قرارداد) | PASS | CURL |
| 31 | 401 (توکن نامعتبر) | PASS | CURL |
| 32 | 403 (حذف تسک توسط متخصص → «حذف تسک برای متخصص مجاز نیست») | PASS | CURL |
| 33 | 404 (تیم/تسک نامعتبر) | PASS | CURL |
| 34 | 409 (ویرایش DONE «تسک تکمیل‌شده قابل ویرایش نیست» / حذف غیرTODO / lifecycle) | PASS | CURL |
| 35 | 422 (مسئول غیرعضو تیم «عضو تیم این پروژه نیست» / dueDate گذشته / submit ناقص با جزئیات) | PASS | CURL |
| 36 | Retry (ErrorState همه‌ی بخش‌ها) | PASS | CODE |
| 37-38 | Loading + ضد double-submit (busy/disabled در همه‌ی mutationها) | PASS | CODE |
| 39-44 | Responsive (گرید→تک‌ستون) / بدون overflow / کیبورد / label / وضعیت و پیشرفت با متن عددی + aria | PASS | CODE |
| 45 | frontend build | PASS | اجرا |
| 46 | TypeScript strict | PASS | اجرا |
| 47 | backend build | PASS | اجرا |
| 48 | backend unit 67/67 | PASS | اجرا |
| 49 | prisma validate | PASS | اجرا |
| 50 | migrate status (up to date) | PASS | اجرا |
| 51 | migrate diff «No difference detected» | PASS | اجرا |

**محدودیت:** browser automation موجود نیست؛ موارد CODE با بازبینی کد/بیلد. پیش‌نمایش زنده‌ی :5173 برای flow دستی (Login کارفرما → پروژه‌های من → Workspace → تیم → کارها → ایجاد/ویرایش/حذف → خروج؛ و CLIENT/متخصص روی مسیر دیگری).

## ۸) Scope Guard

**Backend changed: NO (find = 0) · Schema changed: NO · Migration changed: NO · Business logic changed: NO** — Matching/Trust/Recommendation/Team/Task/Rating/lifecycle دست‌نخورده. بدون Payment/Chat/Notification/AI/Upload/Redux/Zustand/React Query/WebSocket.
