# Milestone 07 — Matching Engine + Milestone 08 — Admin Review & Team Formation

> وضعیت: ✅ هر دو تکمیل — ۲۶ unit test موفق · ۳۸ تست integration م۷ · ۴۹ تست integration م۸
> بدون تغییر `prisma/schema.prisma` (validate ✔ · migrate diff → «No difference detected») · بدون Migration جدید

---

## M07 — Matching Engine

### APIها

| متد | مسیر | حفاظت |
|---|---|---|
| POST | `/api/v1/projects/:id/matching` | CLIENT مالک (غیرمالک 404) |
| GET | `/api/v1/projects/:id/matches` | مالک یا ADMIN (specialist/غیرمالک → 404) |
| GET | `/api/v1/projects/:id/matches/:specialistId` | مالک یا ADMIN |

### Hard Filter (قبل از scoring)

1. `role = SPECIALIST` و `isActive = true` (پیش‌فیلتر DB)
2. `availability ≠ UNAVAILABLE` (در حافظه)
3. داشتن **همه‌ی** مهارت‌های `isRequired=true` (غیر از این → اصلاً Match ذخیره نمی‌شود)

### فرمول‌های Scoring (توابع خالص در `matching.engine.ts`)

| جزء | وزن | فرمول deterministic |
|---|---|---|
| Skill | ۴۰٪ | میانگین وزنی سطوح (BEGINNER=25…EXPERT=100) روی کل مهارت‌های پروژه؛ وزن الزادی=۳، اختیاری=۱؛ مهارت غایب سهم ۰ با وزن در مخرج؛ بدون مهارت در پروژه → ۵۰ |
| Experience | ۲۰٪ | 0-1→20 · 2-3→40 · 4-5→60 · 6-8→80 · 9+→100 (null→20) |
| Previous Projects | ۱۵٪ | 0→0 · 1→40 · 2→70 · 3→90 · 4+→100 — منبع واقعی: عضویت در تیم‌های COMPLETED پلتفرم |
| Rating | ۱۰٪ | میانگین ستاره × ۲۰ — بدون رتبه (cold-start) → ۵۰ |
| Availability | ۱۰٪ | AVAILABLE→100 · BUSY→50 · نامشخص→50 |
| Budget | ۵٪ | همیشه ۵۰ — **محدودیت مستند**: بودجه‌ی پروژه کل است و نرخ، ساعتی؛ بدون برآورد ساعت، مقایسه فرض پنهانی می‌شد |
| **Total** | ۱۰۰٪ | Σ جزء×وزن (round2، بازه 0..100) |

### Trust Score (جدا از Match)

`Trust = 70% Rating + 30% CompletedProjects` — ساده‌شده‌ی MVP طبق تصمیم؛ cold-start (بدون رتبه و پروژه) → ۵۰. بخش‌های OnTimeRate/Verification چون data source ندارند اعمال نشدند (داده جعل نشد).

### آستانه‌های پیشنهاد (ترتیب ارزیابی قطعی)

- `total < 70` → **REJECTED**
- `total ≥ 85 && trust ≥ 80` → **RECOMMENDED**
- بقیه → **NEEDS_REVIEW**

### Explainability

هر Match در response دارای breakdown کامل + `explanation` فارسی است:
`مهارت‌ها: 100 | تجربه: 100 | پروژه‌های قبلی: 100 | امتیاز: 100 | دسترس‌بودن: 100 | بودجه: 50 » امتیاز نهایی: 97.5 | اعتماد: 100 | وضعیت: RECOMMENDED`

### Persistence

ذخیره در `matches` با unique `(project_id, specialist_id)` · اجرای مجدد → 409 (فقط از SUBMITTED؛ پروژه در MATCHING می‌ماند تا Admin Review) · transition اتمیک با `updateMany` شرطی · aggregateهای rating/completed به‌صورت batch (groupBy) بدون N+1.

**NO TEAM / NO AUTO ASSIGNMENT** — تطبیق فقط recommendation تولید می‌کند.

---

## M08 — Admin Review + Team Formation

### APIها

| متد | مسیر | حفاظت |
|---|---|---|
| POST | `/api/v1/admin/projects/:id/review` | ADMIN — MATCHING→REVIEW اتمیک |
| GET | `/api/v1/admin/projects/:id/matches` | ADMIN — نمای کامل با پروفایل عمومی |
| PUT | `/api/v1/admin/projects/:projectId/matches/:specialistId` | ADMIN — decision: APPROVE/REJECT |
| POST | `/api/v1/admin/projects/:projectId/team` | ADMIN — فقط در REVIEW |
| PUT | `/api/v1/admin/projects/:projectId/team` | ADMIN — فقط تیم PROPOSED |
| GET | `/api/v1/projects/:projectId/team` | ADMIN یا مالک یا عضو تیم (بقیه 404) |

### ماتریس Authorization (تست‌شده)

| عمل | Client مالک | Specialist | Admin |
|---|---|---|---|
| Start Matching | ✅ (M07) | ❌ 403 | ❌ 403 |
| Review Project | ❌ 403 | ❌ 403 | ✅ |
| View All Matches | ✅ (مسیر خودش) | ❌ 404 | ✅ |
| Approve/Reject Match | ❌ 403 | ❌ 403 | ✅ |
| Create/Update Team | ❌ 403 | ❌ 403 | ✅ |
| View Team | ✅ مالک | فقط عضو ✅ / بی‌ربط 404 | ✅ |

### رفتار Match Decision

- **APPROVE**: وضعیت RECOMMENDED/NEEDS_REVIEW **حفظ می‌شود** (Schema فیلد approved ندارد — تصمیم مدیریتی از Team Membership مشخص می‌شود؛ مستند). REJECTED → 409. **Approve هیچ عضویتی نمی‌سازد** (تست شد: پس از ۲ approve، اعضای تیم = 0).
- **REJECT**: → REJECTED؛ تکرار → 409.
- تصمیم‌ها فقط در MATCHING/REVIEW (بعد از TEAM_PROPOSED قفل → 409).

### اعتبارسنجی Team (به‌ترتیب)

وجود پروژه → وضعیت REVIEW → (Zod: حداقل یک عضو، بدون تکرار، UUID) → وجود کاربر (404) → نقش SPECIALIST (422) → فعال (422) → Match همین پروژه (409) → Match ردنشده (409) → نقش در project_roles (422) → ظرفیت هر نقش ≤ quantity (422) → **پوشش همه‌ی مهارت‌های الزادی توسط اعضا** (422).

### Team Score

`میانگین(matchScoreهای واقعی Matchها)` با ریاضی صحیح سنت‌ها — 88.5,77.5,90 → **85.33** (مطابق مثال مشخصات) · matchScore ذخیره‌شده = همان totalScore مچ، بدون تولید score جدید.

### Transaction

Create: `team + teamMembers + REVIEW→TEAM_PROPOSED` با گارد updateMany (همه یا هیچ) · Update: `deleteMany + createMany + teamScore` اتمیک · پس از همه‌ی سناریوهای شکست: تیم=0/اعضا=0/وضعیت REVIEW (بدون وضعیت ناقص) · رکورد یتیم = 0.

**TEAM_PROPOSED ≠ اجرای پروژه** — هیچ IN_PROGRESS/Tasks/Rating در این مرحله وجود ندارد.

---

## نتایج تست‌ها (خلاصه)

### M07 (38+ سناریو)
Basic 1-7 همه مطابق انتظار (401/403/404/404/422/409/موفق با ۵ match) · Hard Filter: specC (فاقد required) و specD (UNAVAILABLE) و specE (غیرفعال) حذف؛ فقط SPECIALIST فعال در استخر · امتیازهای DB دقیقاً برابر محاسبه دستی: specA = 100/100/100/100/100/50 → **97.50** trust 100 (RECOMMENDED) · specG با مهارت اختیاری → skill=**78.57** (بدون آن 64.29) · specJ → total=**70** دقیقاً روی آستانه (NEEDS_REVIEW) · بازه 0..100 بدون تخلف · fallbackها: cold-start trust=50، بدون‌رتبه rating=50 · RECOMMENDED/NEEDS_REVIEW/REJECTED همگی تأیید · یکتایی matches · Read: مالک/ادمین 200، غیرمالک و specialist → 404 · جزئیات بدون email/passwordHash + explanation فارسی · ترتیب deterministic (total desc → trust desc → id asc) · اجرای دوباره → 409.

### M08 (49 سناریو)
Review 1-8 ✔ · Decision 9-16 ✔ (شامل approve≠membership) · Team failure 18-29 ✔ (409/403/404/422×5) · پوشش مهارت الزادی (422 «Docker پوشش داده نشده») · Success 17/31-35 ✔ (teamScore=85.00، matchScoreهای واقعی، TEAM_PROPOSED) · Read 38-43 ✔ (عضو 200، بی‌ربط 404، بدون داده حساس) · Update 44-49 ✔ (جایگزینی اتمی، teamScore=83.75، ACTIVE/COMPLETED → 409، غیرادمین 403).

### Unit (بدون DB): ۲۶/۲۶ موفق — `npm run test:unit`

## Build / Database

`npm run build` exit=0 · `prisma validate` valid · `migrate status` up to date · `migrate diff` → **No difference detected** · فقط `20260904163053_init` · health ×۲ = 200

## محدودیت‌ها (مستند)

1. Budget Score ثابت ۵۰ — مقایسه‌ی کل/ساعتی بدون برآورد ساعت صادقانه نیست
2. PreviousProjects از تیم‌های COMPLETED پلتفرم (منبع واقعی ولی جوان) — متخصصان جدید ۰ می‌گیرند
3. Trust ساده‌شده (بدون OnTime/Verification — فیلد ندارد؛ داده جعل نشد)
4. FLAGGED در enum هست ولی منطق تولید آن در MVP تعریف نشد (فقط در اعتبارسنجی تیم مهار می‌شود)
5. Approve وضعیت match را عوض نمی‌کند (فقط عضویت در تیم ملاک است)

## باقی‌مانده برای Milestoneهای بعد

`TEAM_PROPOSED → IN_PROGRESS` + کانبان Taskها · اطلاع‌رسانی به اعضا · Rating پس از اتمام · SUBMITTED→CANCELLED · API مرور پیشنهادهای کاری برای متخصص
