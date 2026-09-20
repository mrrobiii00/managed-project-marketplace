# مایل‌استون ۱۳ — React Frontend Foundation

> وضعیت: ✅ تکمیل‌شده — فقط Foundation؛ بدون هیچ تغییری در بک‌اند، اسکیما یا مایگریشن

## ۱) وضعیت آغازین

- **Frontend از قبل وجود نداشت** — پوشه‌ی `frontend/` جدید ساخته شد (بک‌اند دست‌نخورده).
- هیچ فایل، قرارداد یا وابستگی‌ای از قبل وجود نداشت؛ همه‌چیز از صفر ولی منطبق با قراردادهای M01–M12.

## ۲) Stack و وابستگی‌ها

React 18 + TypeScript (strict) + Vite 5 + Tailwind CSS 3.4 + React Router 6 + Context API + fetch خالص.

**وابستگی‌های اضافه‌شده (همه ضروری):** `react`, `react-dom`, `react-router-dom` + devDeps: `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/react(-dom)`.

**اضافه نشد:** Redux/Zustand/React Query/Next.js/کتابخانه‌ی UI/کتابخانه‌ی HTTP/کتابخانه‌ی فونت (Vazirmatn فقط با لینک CDN + fallback سیستمی Tahoma).

## ۳) معماری و فایل‌ها (۲۸ فایل سورس)

```
frontend/
  index.html                  lang="fa" dir="rtl" + فونت وزیرمتن
  vite.config.ts              host 0.0.0.0:5173 + allowedHosts
  tailwind.config.js / postcss.config.js / tsconfig.json
  .env.example / .env         VITE_API_BASE_URL (بدون secret)
  src/
    main.tsx / App.tsx        BrowserRouter + AuthProvider + AppRoutes
    index.css                 پایه‌ی Tailwind + فوکوس‌رینگ + جلوگیری از overflow افقی
    types/                    auth.ts (AuthUser/UserRole/PublicRegisterRole)، api.ts (ApiEnvelope/ApiError)
    utils/cn.ts               الحاق شرطی کلاس (جایگزین بدون‌وابستگی clsx)
    services/api.ts           fetch + JSON + Bearer + پیام فارسی 401/403/404/422/429/5xx/شبکه
    services/auth.service.ts  login/register/getMe — دقیقاً endpointهای موجود بک‌اند
    context/AuthContext.tsx   user/token/isAuthenticated/isLoading + login/register/logout/refresh
    hooks/useAuth.ts
    components/ui/            Button, Input, Select, Card, Badge(+roleBadge), Loading, EmptyState, ErrorState
    layouts/                  PublicLayout, AuthLayout, DashboardLayout (سایدبار RTL + drawer موبایل)
    routes/                   AppRoutes.tsx, ProtectedRoute.tsx (نقطه‌ی توسعه‌ی RoleGuard ها)
    pages/                    public/LandingPage، auth/LoginPage، auth/RegisterPage،
                              dashboard/DashboardPage، errors/NotFoundPage
```

## ۴) احراز هویت

- `AuthContext`: state مینیمال (`user{id,email,role}`, `token`, `isAuthenticated`, `isLoading`)؛ توکن و کاربر در localStorage (`mp.token`/`mp.user`).
- در mount، توکن ذخیره‌شده با `GET /auth/me` اعتبارسنجی می‌شود؛ توکن بی‌اعتبار → پاک‌سازی خودکار.
- `ProtectedRoute`: ابتدا Loading (تا پایان بررسی اولیه — جلوگیری از redirect اشتباه)، سپس در صورت نبود احراز → `/login` با ذخیره‌ی مسیر مبدأ (`state.from`) برای بازگشت.
- `logout`: پاک‌سازی state + localStorage + هدایت به `/login`.
- معماری آماده‌ی `ClientRoute/SpecialistRoute/AdminRoute`: wrapper ساده روی همان الگو با شرط `user.role` (توضیح در کد ProtectedRoute).

## ۵) API

- Base URL فقط از `VITE_API_BASE_URL` (نمونه‌ی بدون secret در `.env.example`)؛ اثبات شد با بیلد با env سفارشی، آدرس سفارشی در باندل درج می‌شود.
- endpointهای متصل‌شده (واقعی و تست‌شده با curl روی بک‌اند زنده):
  - `POST /api/v1/auth/login` → 200 + token ✓ (رمز غلط → 401 با پیام فارسی ✓)
  - `POST /api/v1/auth/register` (CLIENT) → 201 ✓
  - `GET /api/v1/auth/me` (Bearer) → 200 ✓
- هیچ endpoint ساختگی ساخته نشد.

## ۶) RTL / Responsive / دسترس‌پذیری

- `lang="fa" dir="rtl"` در `index.html` (تست‌شده روی خروجی سرور)؛ فاصله‌ها فقط با utilityهای منطقی Tailwind (نه left/right هاردکد).
- DashboardLayout: دسکتاپ = سایدبار ثابت سمت راست؛ موبایل = drawer با overlay + بستن با Escape؛ `overflow-x: hidden` روی body.
- فرم‌ها label دار + `aria-invalid`/`aria-describedby`/`role="alert"`؛ دکمه‌های واقعی `<button>`؛ `aria-label` برای آیکون‌ها؛ فیلدهای لاتین با `direction:ltr` برای خوانایی.

## ۷) تست‌ها (§17)

| تست | نتیجه | روش |
|---|---|---|
| npm install / build | **PASS** | اجرا موفق، ۵۶ ماژول |
| TypeScript compile | **PASS** | `tsc --noEmit` بدون خطا (strict) |
| اجرای application | **PASS** | سرور dev روی :5173 فعال (preview زنده) |
| `/` باز شود | **PASS** | HTTP 200 |
| `/login` باز شود | **PASS** | HTTP 200 |
| `/register` باز شود | **PASS** | HTTP 200 |
| `/404` برای route نامعتبر | **PASS** | HTTP 200 + catch-all → `/404` در کد مسیرها |
| protected `/dashboard` → redirect به login | **PASS** (سطح کد) | منطق ProtectedRoute (Loading→redirect)؛ **بدون browser automation** |
| Login form validation | **PASS** (سطح کد) | validate() فارسی: ایمیل/رمز اجباری + فرمت ایمیل |
| Register فقط CLIENT/SPECIALIST | **PASS** | آرایه‌ی گزینه‌ها فقط این دو؛ type `PublicRegisterRole = Exclude<UserRole,'ADMIN'>` |
| ADMIN قابل انتخاب نباشد | **PASS** | گزینه‌ی ADMIN در فرم نیست؛ تنها رخداد «ADMIN» در باندل = برچسب نمایش نقش و type-level |
| RTL فعال | **PASS** | `lang="fa" dir="rtl"` در HTML سروشده |
| mobile بدون overflow افقی | **PASS** (سطح طرح) | layout ریسپانسیو + `overflow-x:hidden`؛ بازبینی بصری در مرورگر واقعی ممکن نشد |
| logout پاک کند | **PASS** (سطح کد) | پاک‌سازی localStorage + state + navigate |
| API base از environment | **PASS** | بیلد با env سفارشی → آدرس سفارشی در باندل؛ بیلد پیش‌فرض → localhost:4000/api/v1 |

**محدودیت صریح:** browser automation در پروژه موجود نیست؛ ۴ مورد سطح‌کد/سطح‌طرح بالا با بازبینی کد و بیلد تأیید شده‌اند نه کلیک واقعی.

## ۸) دیتابیس / بک‌اند

- **Schema changed: NO** — `prisma validate` ✓، `migrate diff`: «No difference detected» ✓
- **Migration changed: NO**
- **Backend business logic changed: NO** — صفر فایل بک‌اند تغییر کرد؛ تست‌های unit بک‌اند پس از M13: **67/67 سبز** (بدون نیاز به اجرای مجدد integration ها، چون هیچ فایلی از بک‌اند دست نخورده است).

## ۹) Scope Guard

بدون Payment/Chat/Notification/WebSocket/AI matching/GitHub/File upload/React Query/Redux/Redis/Job/تغییر دیتابیس. صفحه‌ی کامل Project Creation/Matching/Tasks/Admin Dashboard ساخته نشد — فقط Foundation (آیتم‌های «به‌زودی» صرفاً غیرفعال و نشانه‌گذاری‌شده‌اند).
