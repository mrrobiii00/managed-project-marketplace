# مایل‌استون 14-E — Workspace پروژه و مدیریت Task متخصص

> وضعیت: ✅ تکمیل‌شده — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) قرارداد بک‌اند (استخراج‌شده از source واقعی M06/M08/M09)

| Endpoint | RBAC | قرارداد کلیدی |
|---|---|---|
| `GET /projects/:projectId` | requireAuth | DTO کامل M06؛ غیرمرتبط فقط برای DRAFT محدود است (پروژه‌ی non-DRAFT برای هر احراز‌شده‌ای قابل مشاهده) |
| `GET /projects/:projectId/team` | requireAuth | DTO: `{id, projectId, name, teamScore:number, status, project:{id,title,status}, members:[{userId, fullName\|null, jobTitle\|null, role, matchScore:number, joinedAt}], …}` · بدون تیم یا غیرمرتبط (غیر admin/مالک/عضو) → **404** «تیمی برای این پروژه یافت نشد» |
| `GET /projects/:projectId/tasks` | requireAuth | فیلترهای واقعی: `status`/`priority`/`assignedTo` + page/pageSize(≤100)؛ sort: `createdAt DESC, id ASC`؛ غیرمرتبط → **404** |
| `GET …/tasks/:taskId` | requireAuth | DTO: `{id, projectId, teamId, title, description\|null, priority, status, dueDate\|null, assignedTo:{id,fullName}\|null, createdAt, updatedAt}` |
| `POST …/tasks` | requireAuth | SPECIALIST مجاز است اما **فقط با assignedTo=خودش** (ارسالِ دیگری → 403؛ حذف فیلد → بک‌اند خودش تخصیص می‌دهد)؛ dueDate گذشته → 422؛ تسکِ تیم‌دار در پروژه‌ی IN_PROGRESS → 201 |
| `PUT …/tasks/:taskId` | requireAuth | SPECIALIST: **فقط `{status}`** (فیلدهای دیگر → 403) و **فقط تسک خودش** (403)؛ گذار نامعتبر → 409؛ DONE پایانی → 409؛ پروژه باید IN_PROGRESS باشد |
| `DELETE …/tasks/:taskId` | requireAuth | **SPECIALIST → 403 «حذف تسک برای متخصص مجاز نیست»** → هیچ UI حذفی ساخته نشد |

**گذارهای واقعی (task.rules.ts M09):** `TODO→IN_PROGRESS` · `IN_PROGRESS→DONE` · `IN_PROGRESS→TODO` · `DONE→ هیچ` — UI دقیقاً همین سه دکمه را در سه وضعیت ارائه می‌کند.
**رفتار واقعی غیرعضو:** project → 200 (چون پروژه non-DRAFT است) اما team/tasks → 404 — همین رفتار در Workspace منعکس می‌شود (بخش پروژه دیده می‌شود، تیم/کارها پیام 404 بک‌اند را نشان می‌دهند).

## ۲) فایل‌ها

**جدید (۷):** `types/task.ts`، `types/team.ts`، `services/task.service.ts` (بدون delete — دلیل بالا)، `services/team.service.ts`، `components/tasks/TaskCard.tsx`، `pages/specialist/SpecialistProjectWorkspacePage.tsx`، `pages/specialist/SpecialistTaskDetailPage.tsx`
**تغییر (۲):** `utils/status.ts` (+نگاشت متمرکز وضعیت/اولویت تسک و وضعیت تیم — یک‌بار)، `routes/AppRoutes.tsx` (۲ مسیر زیر RoleGuard SPECIALIST)

## ۳) Workspace / Team / Tasks / مجوزها

- **چیدمان §20**: هدر پروژه → اطلاعات پروژه | تیم (فقط‌خواندنی: نام، وضعیت، امتیاز تیم، اعضا با نقش و امتیاز تطبیق، «(شما)») → خلاصه/فیلر کارها → لیست کارت‌ها (موبایل: تک‌ستون).
- **کارها**: فیلتر وضعیت (پشتیبانی‌شده‌ی بک‌اند) + pagination واقعی؛ کارت با عنوان/اولویت/وضعیت/مسئول/مهلت/تاریخ؛ لینک به صفحه‌ی جزئیات.
- **ایجاد کار**: فقط وقتی پروژه IN_PROGRESS است (آینه‌ی قاعده‌ی بک‌اند)؛ فرم عنوان/شرح/اولویت/مهلت — **assignedTo ارسال نمی‌شود** (خودتخصیصی بک‌اند، تست‌شده: 201 با مسئول=آرش).
- **گذار وضعیت**: دکمه‌ها فقط روی تسکِ خودِ متخصص + پروژه‌ی IN_PROGRESS + گذار مجاز (TODO→شروع کار / IN_PROGRESS→تکمیل کار + بازگشت / DONE→ هیچ)؛ payload همیشه فقط `{status}`.
- **حذف**: هیچ دکمه/سرویسی برای متخصص وجود ندارد (403 بک‌اند تأیید شد).
- **بدون هیچ action تیم/چرخه‌ی پروژه**: نه عضو افزودن/حذف، نه approve، نه start/complete/cancel.
- **امنیت**: projectId/taskId فقط از route؛ بدون projectId/taskId/system field در body؛ membership هرگز در فرانت محاسبه‌ی نهایی نمی‌شود (فقط آینه‌ی UX دکمه‌ها؛ بک‌اند مجوز نهایی)؛ 401 → ابطال نشست M14-A؛ 403/404/409/422 با پیام فارسی سرور.

## ۴) تست‌ها (TEST | RESULT | METHOD)

| # | سناریو | نتیجه | روش |
|---|---|---|---|
| 1 | عضو تیم (specA→P2) → workspace: project/team/tasks = 200 | PASS | CURL |
| 2 | غیرعضو (specC→P2): project 200 (رفتار واقعی non-DRAFT) ولی team/tasks → 404 | PASS | CURL |
| 3 | CLIENT → مسیر متخصص → 403 (RoleGuard صفحه؛ API مالک را می‌پذیرد — گارد فرانت مسیر را می‌بندد) | PASS | CODE |
| 4 | ADMIN → مسیر متخصص → 403 (RoleGuard) | PASS | CODE |
| 5 | unauth → 401 → login (M14-A) | PASS | CURL + CODE |
| 6-7 | دریافت/رندر فیلدهای واقعی پروژه (شرح/بودجه/مهلت/وضعیت/skills/roles) | PASS | CURL + CODE |
| 8 | پروژه‌ی ناموجود (uuid معتبر) → 404 | PASS | CURL |
| 9 | Error handling پروژه (ErrorState + Retry) | PASS | CODE |
| 10-12 | تیم واقعی: نام/وضعیت ACTIVE/امتیاز 83.75/اعضا با role و matchScore | PASS | CURL |
| 13 | غیرعضو → تیم 404 | PASS | CURL |
| 14 | هیچ team-management action در UI متخصص (grep=0) | PASS | CODE |
| 15 | لیست واقعی (total=3) | PASS | CURL |
| 16 | pagination (pageSize=2 → ۲ صفحه) | PASS | CURL |
| 17 | empty (P8: total=0، پیام «هنوز کاری ثبت نشده است.») | PASS | CURL |
| 18 | task detail واقعی → 200 | PASS | CURL |
| 19-21 | TODO (ایجادشده) / IN_PROGRESS / DONE — همه نمایش و رندر | PASS | CURL |
| 22 | گذار مجاز: TODO→IN_PROGRESS ✓ · IN_PROGRESS→TODO ✓ (بازگشت) → IN_PROGRESS→DONE ✓ | PASS | CURL |
| 23 | گذار ممنوع: TODO→DONE مستقیم 409 · DONE→IN_PROGRESS 409 «گذار مجاز نیست» | PASS | CURL |
| 24 | تسک دیگری (جواد) 403 «فقط وضعیت تسک خودش» · تسک بی‌مسئول 403 · فیلد title 403 | PASS | CURL |
| 25 | taskId نامعتبر → 404 | PASS | CURL |
| 26 | تسک پروژه‌ی دیگر زیر مسیر P2 → 404 TASK_PROJECT_MISMATCH | PASS | CURL |
| 27 | API 403 (سه حالت تست 24 + حذف) | PASS | CURL |
| 28 | API 404 (تست 2/25/26) | PASS | CURL |
| 29 | API 409 (گذارهای نامعتبر) | PASS | CURL |
| 30 | API 422 (dueDate گذشته «نمی‌تواند در گذشته باشد» · عنوان کوتاه) | PASS | CURL |
| 31 | create فقط طبق مجوز واقعی: SPECIALIST مجاز است (خودتخصیصی) → 201 | PASS | CURL |
| 32 | update = فقط status (قرارداد SPECIALIST) → 200 | PASS | CURL |
| 33 | delete: بک‌اند اجازه نمی‌دهد (403) → هیچ دکمه‌ای وجود ندارد | PASS | CURL + CODE |
| 34 | تأیید قبل از حذف: N/A — حذف برای متخصص وجود ندارد | N/A | — |
| 35 | loading / double-submit (busy state روی دکمه‌های گذار و submit) | PASS | CODE |
| 36-42 | responsive/بدون overflow/دسترس‌پذیری/label/کیبورد/وضعیت با متن (همه‌ی badgeها متن دارند) | PASS | CODE |
| 43 | frontend build | PASS | اجرا |
| 44 | TypeScript strict | PASS | اجرا |
| 45 | backend build | PASS | اجرا |
| 46 | backend unit 67/67 | PASS | اجرا |
| 47 | prisma validate | PASS | اجرا |
| 48 | migrate status (up to date) | PASS | اجرا |
| 49 | migrate diff «No difference detected» | PASS | اجرا |

**محدودیت:** browser automation موجود نیست (اضافه نشد)؛ موارد CODE با بازبینی کد/بیلد. داده‌ی آزمایشی پس از تست‌ها پاک شد (تسک DONE آزمایشی در P2 مطابق قاعده‌ی «حذف فقط TODO» قابل حذف نیست و به‌عنوان سوابق باقی می‌ماند).

## ۵) Scope Guard

**Backend changed: NO** (صفر نوشتن در backend/ — mtimes بازسازی محیط مربوط به snapshot-restore است، نه تغییر محتوا؛ diff/validate تأیید) · **Schema changed: NO** · **Migration changed: NO** · **Task business logic changed: NO** · **Project lifecycle changed: NO** — بدون UI مدیریت تیم، Rating/Apply/Accept، Payment/Chat/Notification/AI/Upload/React Query/Redux.
