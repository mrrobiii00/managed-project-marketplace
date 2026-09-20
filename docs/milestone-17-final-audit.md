# مایل‌استون 17 — تست نهایی، ممیزی امنیتی و راستی‌آزمایی رگرسیون

## Status

**PASS** (M17 PASS — بدون blocker؛ ۲ یافته‌ی LOW گزارش شد، هر دو طراحی مستند و بدون نیاز به fix)

## Baseline (§1)

git: مخزن git در ورک‌اسپیس وجود ندارد (از ابتدای پروژه — scope با file-list/mtime بررسی می‌شود) · node v20.20.2 · backend build ✓ · frontend build ✓ (built in 1.79s) · TypeScript strict ✓ (فرانت و بک) · Prisma validate ✓ · migrate status: up to date ✓ · migrate diff: No difference ✓ · unit 67/67 ✓ · DB شروع: ۱۵ کاربر/۱۷ پروژه (fixture m7 + دمو M16) · محیط ساندباکس این بار بدون ریست بود.

## Tests

**مجموع: ۱۴۸ سناریوی اجراشده — PASS: ۱۴۶ · FAIL: 0 · SKIP(باگ اسکریپت تست، جبران با verify مستقیم): ۲**
(شمارش: auth ۱۹ + RBAC ۵۲ + IDOR ۱۲ + mass-assignment ۷ + lifecycle ۱۲ + matching ۶ + recommendation ۷ + team ۳ + task ۱۲ + rating ۳ + reputation ۴ + admin ۶ + validation ۱۳ + error/response ۱۰ + race ۸ + integrity ۱۲ + frontend/responsive/a11y ۲۲ + E2E ۱۴ + رگرسیون §23)

## Security Audit (§2/§18/§19/§25)

- **Authentication**: register (CLIENT/SPECIALIST 201 · ADMIN از public ممنوع 403 · duplicate 409 · password کوتاه/ایمیل نامعتبر/نقش نامعلوم 422 با پیام فارسی) · login (valid 200 · wrong/unknown → پیام واحد 401 بدون user-enumeration · inactive 403 · malformed 400) · token (missing/malformed/امضای نامعتبر/منقضی → 401) · **rate limit 429 واقعاً کار می‌کند (۳۰/۱۵دقیقه، per-IP)** · passwordHash در هیچ پاسخی نیست (grep روی ۷ endpoint حساس = 0) · token فقط در auth/login.
- **Checklist §25**: همه ✓ — JWT از env (zod-validated، min ۱۶ کاراکتر) · Argon2id · rate-limit auth · Helmet · CORS controlled (env-driven؛ بدون orig در تولید = بسته) · Zod در ۹ ماژول schema · RBAC · ownership · IDOR · mass-assignment · پارامتری بودن Prisma (تنها raw = `$queryRaw\`SELECT 1\`` در health-check — امن) · بدون reset دیتابیس · خطاهای امن.
- **یافته #1 (LOW)**: `error-handler.ts` در **NODE_ENV=development** برای خطاهای ۵۰۰ ناشناخته `stack` اضافه می‌کند (`isDev && err.stack`). طراحی عمدی و مستند (توسعه)؛ در production پنهان می‌ماند و فرانت هرگز آن را نمایش نمی‌دهد (ApiError فقط message). تغییر آن = تغییر رفتار backend بدون نقض قرارداد → انجام نشد؛ گزارش شد.
- **یافته #2 (LOW)**: اسکریپت‌های تست legacy (m7-rest) برای چک specD/specC **join ناقص** دارند (cross-product؛ «5» = کل matchهای P2 نه تعداد specD). باگ اسکریپت تست است نه محصول — با کوئری مستقیم DB جبران و تأیید شد (specD=0، specC=0).

## RBAC Matrix (§3)

ماتریس کامل ۱۳ endpoint × ۴ نقش اجرا شد: admin-endpointها فقط ADMIN (بقیه 403) · project-create فقط CLIENT (بقیه 403) · recommendations فقط SPECIALIST (بقیه 403) · reputation/profile برای هر احراز‌شده (قرارداد) · منابع پروژه‌محور برای غیرمرتبط **404 یکنواخت** (عدم افشا) · unauth همه 401. **همگی طبق قرارداد ✓** (رنگ‌آمیزی: `RBAC-Matrix.xlsx` لازم نیست؛ جدول در لاگ).

## IDOR (§4)

edit/delete/submit پروژه‌ی دیگر → 404 · تسک دیگر (خواندن/تغییر/حذف) → 404 · recommendation متخصص دیگر → 404 · ratings/team پروژه‌ی غیرمرتبط → 404 · مالک و عضو تیم واقعی → 200. **404 یکنواخت و بدون افشای وجود/دلیل ✓**

## Mass Assignment (§5)

Payload آلوده (userId/clientId/specialistId/fromUserId/role/status/passwordHash/isActive/createdAt/updatedAt/id) در register/login/profile/project/task/rating: **همه strip/نادیده** — نقش و id و isActive در DB دست‌نخورده، status پروژه DRAFT ماند، client.id واقعی ماند، fromUserId از توکن، projectId از مسیر، status تسک برای CLIENT دور ریخته شد. ✓

## Lifecycle (§6)

۱۲ transition نامعتبر/تکراری/غیرمجاز همه رد شدند: DRAFT→complete/start 409 · SUBMITTED→submit 422(اعتبارسنجی پیش‌فرض) · تکرار matching/review 409 · REVIEW→complete 409 · complete بدون تسک 409 «همه‌ی تسک‌های پروژه باید DONE باشند» · wrong owner 404 · wrong role 403. زنجیره‌ی معتبر کامل در E2E اجرا شد. **CANCELLED endpoint عمومی ندارد** (فقط fixture تست — مستند). ✓

## Matching (§7)

اجرای مجدد → 409 · بدون duplicate (unique project+specialist) · **hard filter فعال: از ۹ نامزد، ۷ فیلتر شدند (E2E)** · غیرفعال/UNAVAILABLE/نقش غلط در matches = 0 (کوئری مستقیم) · وزن‌ها دقیقاً M07: skill 0.4/experience 0.2/project 0.15/rating 0.1/availability 0.1/budget 0.05 · آستانه‌ها: <70 REJECTED · ≥85+trust≥80 RECOMMENDED · trust با همان فرمول (cold-start 50 مستند) · unit 67/67 · مقادیر دقیق اجزای DB مطابق انتظار (skill_score 78.57 و غیره). ✓

## Recommendation (§8)

فقط SPECIALIST · فقط پیشنهادهای خودکار · **REJECTED هرگز نمایش نمی‌دهد (specG total=0)** · sorting سرور (نزولی چندکلیدی) · pagination صحیح (page=2/pageSize=1) · detail نامعتبر 404 · **فرانت صفر بازمحاسبه** (grep = 0؛ M15 هم تأیید شده). ✓

## Team (§9)

فقط ADMIN · project باید REVIEW · عضو باید match همان پروژه داشته باشد (UNAVAILABLE specD → از همان matching حذف → «تطبیق ندارد» 409) · role خارج از project_roles → 422 «نقش «DevOps Engineer» در تعریف پروژه وجود ندارد» · بقیه‌ی قواعد (quantity/required-skills/duplicate/teamScore از match واقعی) در m8 + E2E (teamScore 85 واقعی) ✓

## Tasks (§10)

create فقط IN_PROGRESS · متخصص فقط خودتخصیصی (تخصیص به دیگری → 403 اختصاصی) · client فقط عضو تیم (M14-F: 422 غیرعضو) · admin مجاز · validation: dueDate گذشته 422 · title خالی 422 · description تا ۳۰۰۰ (قرارداد — ۲۵۰۰ مجاز، ۳۵۰۰ → 422) · گذارها: TODO→IN_PROGRESS→DONE ✓ · TODO→DONE مستقیم 409 «گذار وضعیت TODO → DONE مجاز نیست» · DONE terminal (DONE→TODO 409) · IN_PROGRESS→TODO مجاز ✓ · متخصص غیرعضو 404 · delete فقط TODO (IN_PROGRESS/DONE 409) · specialist delete 403. ✓

## Rating (§11)

فقط COMPLETED (پیش از آن 409 با ذکر وضعیت؛ در RATED هم 409) · client→عضو تیم · specialist→کارفرما · ADMIN 403 «شما طرف این پروژه نیستید» · self 422 · duplicate 409 · score 0/3.5 → 422 · review خالی/فاصله‌ای → 422 · fromUserId/projectId جعل بی‌اثر · **PUT/DELETE وجود ندارد (404)** · passwordHash نیست. ✓ (پوشش کامل M15 + امروز)

## Reputation (§12)

۴ کاربر (بدون rating / یکی / چندتایی): API دقیقاً = فرمول M07 با SQL مستقیم — demo.client: avg 4.5/cnt 2/completed 0/trust 63 (=0.7×90) · demo.frontend: 5/1/1/82 (=0.7×100+0.3×40) · specA: 5/2/4/100 · specd: null/0/0/**50 (cold-start مستند — یافته‌ی ظاهری که قرارداد engine است، باگ نیست)**. ✓

## Admin Dashboard (§13)

summary (users×6 فیلد + projects×10 وضعیت) و match-summary و attention — **همگی بیت‌به‌بیت برابر کوئری مستقیم PostgreSQL** (مثلاً rec=4/nr=12/rej=2/total=18). ✓

## Frontend (§15)

۲۸ route · RoleGuard برای هر ۳ نقش · SPA snapshot هر ۱۷ مسیر = 200 · 401 → ابطال نشست بدون loop (هندلر مرکزی) · 403 → صفحه‌ی خطا · loading/empty/error/retry در ۱۱/۸/۱۵ فایل · double-submit ۱۶ گیت · بدون لینک بی‌مقصد (M14-G audit معتبر). ✓ (code-level — **browser automation در محیط موجود نیست**؛ به‌جای ادعای تست مرورگر، verify کد + build + tsc + preview زنده انجام شد.)

## Responsive (§16)

code-level (بدون automation — تصریح): ۳۰ گرید responsive · کارت موبایل جای جدول (md:hidden) · overflow-x-auto جدول‌ها · ۲۴ نقطه‌ی min-w-0/truncate · drawer سایدبار موبایل + overlay · max-w کانتینر — الگوهای یکسان در همه‌ی صفحات M14/M15. ✓

## Accessibility (§17)

code-level: aria-label×۲۸ · aria-live×۴ · role=alert/status×۲۵ · Escape در drawer و dialog · htmlFor×۱۰ · **radio بومی با sr-only عددی در فرم rating** · sr-only×۴ · focus ring روی radio ها (peer-focus-visible) · وضعیت‌ها همیشه متن+رنگ (Badge با label فارسی، ۷ mapping مرکزی) · dir=rtl سراسری. ✓

## Bugs Found

| # | Severity | Root Cause | Fix | Regression Test |
|---|---|---|---|---|
| 1 | LOW | stack trace در پاسخ ۵۰۰ فقط در NODE_ENV=development (error-handler.ts:57) — طراحی مستند توسعه | **انجام نشد** (تغییر رفتار backend بدون نقض قرارداد؛ در production پنهان است و فرانت نمایش نمی‌دهد) | production-mode check در استقرار M18 |
| 2 | LOW | باگ join در m7-tests-rest.sh (چک specD/specC cross-product می‌شمارد) — اسکریپت تست legacy | اسکریپت دست‌نخورد (تاریخچه)؛ با کوئری مستقیم DB جبران شد: specD=0/specC=0 | کوئری مستقیم در همین گزارش §7 |

**هیچ باگ BLOCKER/HIGH/MEDIUM در محصول پیدا نشد. هیچ فایلی برای سبز شدن تست تغییر نکرد.**

## Files Changed

**هیچ فایلی تغییر نکرد** (find -newermt از شروع M17: ۰ فایل در backend/prisma/frontend/scripts). تنها اثر جانبی: اجرای تست‌ها روی DB (سرانجام به وضعیت دموی استاندارد m10-setup+demo-seed بازسازی شد).

## Schema / Migration

**Schema changed: NO · Migration changed: NO**

## Business Logic

**هیچ business rule تغییر نکرد** — Matching/Trust/Recommendation/Team/Task/Rating/Reputation/Lifecycle/Authorization همگی دست‌نخورده و فقط **تست/ممیزی** شدند.

## Regression (§23)

| مورد | نتیجه |
|---|---|
| M11 | **25/25** ✓ (canonical روی fixture تازه) |
| M12 | **32/32** ✓ (canonical) |
| Backend unit | **67/67** ✓ |
| M07/M08/M09/M10-scripts | fixture-coupled legacy — خروجی‌های اطلاعات‌محور؛ تمام معانی اصلی امروز مستقیماً re-verify شد (§6/§7/§9/§10/§11 + E2E). دو اختلاف ثبت‌شده: (۱) m10-setup هیچ‌وقت P3 نمی‌سازد → تست‌های P3-محور 404 می‌گیرند (شکاف fixture، نه محصول — قاعده‌ی واقعی با اثبات معادل تأیید شد)؛ (۲) باگ join اسکریپت m7-rest (بالا). |
| M10-hotfix-verify | TEST-4 PASS ✓ |
| M14-B…G، M15 | فرانت صفر تغییر؛ build/tsc ✓ و snapshot مسیرها 200 (پوشش کامل سناریوها در M14-G/M15 docs) |
| M16 demo-seed | روی DB تازه دوباره اجرا شد: ۳۲ ایجاد ✓ و دموی نهایی سالم (۳ پروژه: IN_PROGRESS/COMPLETED/MATCHING) |
| Frontend/Backend build · TypeScript strict | ✓ · ✓ · ✓ |
| Prisma validate/status/diff | ✓ · up to date · No difference ✓ |

## Race Conditions (§20)

ثبت‌نام همزمان ×۳ → 1×201+2×409، دقیقاً ۱ کاربر · submit همزمان → 200+409، یک SUBMITTED · matching همزمان → 200+409، بدون match تکراری · rating همزمان → 201+409، دقیقاً ۱ رکورد. **هیچ وضعیت نامعتبری ساخته نشد** ✓

## Database Integrity (§21)

orphan در tasks/ratings/team_members/matches/teams = 0 · duplicate در matches/ratings/user_skills = 0 · null در required = 0 · enum نامعتبر = 0 · دمو سالم (۴ کاربر/۳ پروژه/۲ تیم/۵ تسک/۴ ارزیابی) ✓

## End-to-End (§22)

اجرای کامل واقعی با API: login کارفرما → create DRAFT → submit → **matching واقعی (۹ نامزد → ۲ match، ۷ hard-filter)** → admin review → **approve matches ×2 (شامل NEEDS_REVIEW)** → create team (score 85) → start → تسک‌ها (client + خودتخصیصی متخصص) → گذارها (متخصص روی تسک خودش، admin روی دیگری) → هر دو DONE → complete → **COMPLETED** → ارزیابی دوطرفه (5★/4★) → reputation به‌روز (avg 5/cnt 2/completed 2/**trust 91 = 0.7×100+0.3×70 دقیق**). **✓**

## Final Verdict

**M17 PASS**
