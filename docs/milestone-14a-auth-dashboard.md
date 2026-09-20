# مایل‌استون 14-A — احراز هویت فرانت‌اند و داشبورد نقش‌محور

> وضعیت: ✅ تکمیل‌شده — فقط فرانت‌اند؛ صفر تغییر در بک‌اند/اسکیما/مایگریشن

## ۱) قرارداد بک‌اند (از کد واقعی استخراج شد)

| Endpoint | رفتار تأییدشده |
|---|---|
| `POST /auth/login` | 200 → `{data:{id,email,role,isActive,token}}` · رمز غلط/ایمیل ناموجود → 401 با پیام عمومی واحد |
| `POST /auth/register` | 201 → `{data:{id,email,role,token}}` (token برمی‌گرداند → ورود خودکار) · نقش ADMIN → 403 «ثبت‌نام با نقش ADMIN از مسیر عمومی مجاز نیست» · ایمیل تکراری → 409 |
| `GET /auth/me` | 200 → آبجکت کامل user (فقط id/email/role نگه می‌داریم) · توکن نامعتبر → 401 |

فرانت‌اند M13 از قبل با این قرارداد هماهنگ بود؛ فقط رفتور redirect نقش‌محور اضافه شد.

## ۲) فایل‌ها

**جدید (۷):** `utils/roles.ts` (نگاشت مرکزی نقش→داشبورد)، `routes/RoleGuard.tsx`، `pages/errors/ForbiddenPage.tsx`، `pages/client/ClientDashboardPage.tsx`، `pages/specialist/SpecialistDashboardPage.tsx`، `pages/admin/AdminDashboardPage.tsx`، `services/admin.service.ts` (فقط GET summary طبق مجوز اسپک).

**تغییر (۶):** `context/AuthContext.tsx` (login/register کاربر را برمی‌گردانند + ثبت handler رویداد 401)، `services/api.ts` (رویداد 401 با محافظ loop)، `pages/auth/LoginPage.tsx` و `RegisterPage.tsx` (redirect با `getDashboardPath`)، `layouts/DashboardLayout.tsx` (ناوبری نقش‌محور)، `routes/AppRoutes.tsx` (شاخه‌های /client/* /specialist/* /admin/* + /dashboard→redirect + /403).

**حذف (۱):** `pages/dashboard/DashboardPage.tsx` (جایگزین با داشبوردهای نقش‌محور).

## ۳) جریان احراز هویت

- Login: submit → `POST /auth/login` → ذخیره token/user (`mp.token`/`mp.user` — بدون تغییر کلیدها) → `GET /auth/me` در startup برای sync → redirect با تابع مرکزی (`CLIENT→/client/dashboard` و…).
- Register: بک‌اند طبق قرارداد token برمی‌گرداند → همان مسیر login (ورود خودکار). ایمیل تکراری → پیام 409 فارسی سرور نمایش داده می‌شود.
- Startup: token نیست → unauthenticated · token هست → `GET /auth/me` → 200: sync · 401: پاک‌سازی · سپس isLoading=false (ProtectedRoute قبل از پایان loading redirect نمی‌کند).
- **401 در حین کار**: رویداد یک‌باره در api.ts → پاک‌سازی نشست + `/login`؛ محافظ loop: پرچم handling + نادیده‌گرفتن در `/login` + فقط وقتی token وجود دارد (خطای login خودش auth:false است و رویداد نمی‌گیرد).

## ۴) Routing و گاردها

`ProtectedRoute` (auth + Loading) → `RoleGuard allow="CLIENT|SPECIALIST|ADMIN"` (نقش غلط → `/403`؛ type-safe با `UserRole`). `/dashboard` → redirect مرکزی به داشبورد نقش. `/403` صفحه‌ی فارسی با دکمه‌ی «بازگشت به داشبورد من» (بر اساس نقش؛ کاربر لاگین‌نشاده → `/login`).

## ۵) داشبوردها و ناوبری

سه Shell مطابق اسپک. کارت‌های آمار Client/Specialist عمداً placeholder هستند (— + نشان «به‌زودی»؛ بدون نمایش داده‌ی جعلی). Admin طبق مجوز اسپک فقط `GET /admin/dashboard/summary` را smoke-test کرده (Loading/ErrorState با تلاش مجدد/کاشی‌های واقعی M12). Sidebar نقش‌محور: آیتم‌های بدون صفحه = غیرفعال + «به‌زودی» (بدون لینک شکسته).

## ۶) تست‌ها (§16)

| # | تست | نتیجه | روش |
|---|---|---|---|
| 1-3 | login CLIENT/SPECIALIST/ADMIN | **PASS** (200 + نقش درست) | curl روی بک‌اند زنده |
| 4-5 | رمز غلط / ایمیل ناموجود | **PASS** (401 پیام فارسی) | curl |
| 6-7 | register CLIENT/SPECIALIST | **PASS** (201) | curl |
| 8 | register ADMIN | **PASS** (403 بک‌اند؛ در UI اصلاً گزینه نیست) | curl |
| 9-10 | me با توکن معتبر/نامعتبر | **PASS** (200/401) | curl |
| 11 | unauth → /dashboard → /login | **PASS** | ProtectedRoute: Loading→Navigate |
| 12-14 | هر نقش → داشبورد خودش | **PASS** | RoleGuard allow + SPA serve 200 |
| 15-18 | نقش اشتباه → داشبورد دیگر → 403 | **PASS** | RoleGuard → Navigate /403 (۴ ترکیب در کد یک الگوست) |
| 19-21 | logout: پاک‌شدن token/user + redirect | **PASS** | clearSession + navigate |
| 22 | protected بعد از logout → /login | **PASS** | state پاک → ProtectedRoute می‌بندد |
| 23-27 | رگرسیون بک‌اند | **PASS** (build/unit 67/validate/status/diff «No difference detected») | اجرا — **صفر فایل بک‌اند تغییر کرد** |

**محدودیت:** browser automation موجود نیست (طبق اسپک اضافه نشد)؛ 11-22 code-level + سرو SPA تأیید شدند. پیش‌نمایش زنده‌ی :5173 برای بازبینی دستی Login→Dashboard→Logout و CLIENT→URL ادمین→403 در دسترس است.

## ۷) دیتابیس / بک‌اند

**Schema changed: NO** · **Migration changed: NO** · **Backend business logic changed: NO** (find: 0 فایل تغییر کرده)
