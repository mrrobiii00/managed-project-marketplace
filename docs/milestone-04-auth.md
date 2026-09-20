# Milestone 04 — Authentication: Register + Login + JWT + RBAC پایه

> وضعیت: ✅ تکمیل — build موفق، هر ۱۴ سناریوی تست موفق روی PostgreSQL واقعی
> بدون تغییر `prisma/schema.prisma` · بدون Migration جدید (اثبات: `migrate diff` → «No difference detected»)

---

## ۱) Endpointها

| متد | مسیر | حفاظت | توضیح |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Rate limit | ثبت‌نام CLIENT/SPECIALIST (ADMIN → 403) |
| POST | `/api/v1/auth/login` | Rate limit | ورود + JWT |
| GET | `/api/v1/auth/me` | requireAuth | اطلاعات امن کاربر جاری |
| GET | `/api/v1/auth/admin-test` | requireAuth + requireRole('ADMIN') | endpoint آزمایشی RBAC |

## ۲) ساختار جدید

```
backend/src/
├── modules/auth/
│   ├── auth.controller.ts   ← نازک: validate + service + response
│   ├── auth.service.ts      ← منطق اصلی (Argon2id، duplicate، generic error، timing)
│   ├── auth.routes.ts       ← Router + rate limit
│   ├── auth.schema.ts       ← Zod (نرمال‌سازی ایمیل trim+lowercase)
│   └── auth.types.ts        ← SafeUser + type augmentation برای req.user
├── middleware/
│   ├── require-auth.ts      ← Bearer → verify → یافتن User از DB → isActive → req.user
│   └── require-role.ts      ← requireRole('ADMIN') / requireRole('CLIENT','ADMIN')
└── utils/jwt.ts             ← امضا/بررسی HS256 (secret فقط از env)
```

## ۳) پکیج‌های افزوده‌شده

`argon2` (hash با Argon2id) · `jsonwebtoken` + `@types/jsonwebtoken` · `express-rate-limit`

## ۴) تصمیم‌های امنیتی مستندشده

1. **role=ADMIN از register عمومی** → 403؛ در production واقعی ADMIN فقط از مسیر داخلی (seed/ops) ساخته می‌شود. برای تست، نقش کاربر دمو با `psql` ارتقا یافت (روش dev-only، بدون API عمومی).
2. **User Enumeration** → پیام یکسان «ایمیل یا رمز عبور نادرست است» برای کاربرِ ناموجود و رمزِ اشتباه + یک `argon2.verify` بی‌اثثر روی DUMMY_HASH برای هم‌زمان‌سازی timing.
3. **isActive** → در login بعد از تأیید رمز بررسی می‌شود (403)؛ در require-auth بعد از خواندن User از DB (403). رفتار: 401 = هویت نامعتبر/ناموجود؛ 403 = هویت معتبر ولی حساب مسدود.
4. **عدم اعتماد به client** → هویت و نقش همیشه در هر request از دیتابیس خوانده می‌شوند؛ `userId`/`role` ارسالی در body هرگز ملاک نیست (نقشِ claim توکن صرفاً اطلاعاتی است؛ تغییر نقش در DB بلافاصله اعمال می‌شود).
5. **passwordHash** → هرگز select/return نمی‌شود (SAFE_SELECT + بررسی تستی grep = 0).
6. **JWT** → HS256، payload: `sub` (شناسه کاربر)، `role`، `email`؛ انقضا از `JWT_EXPIRES_IN` (پیش‌فرض 1h). Secret فقط از env با حداقل ۱۶ کاراکتر (بدون مقدار پیش‌فرض).
7. **Rate limit** → 30 درخواست register/login در هر ۱۵ دقیقه per-IP (تست واقعی: درخواست ۲۱ به بعد → 429).

## ۵) نتایج تست واقعی (خلاصه)

| # | سناریو | کد |
|---|---|---|
| 1 | Register CLIENT (ایمیل با فاصله/حروف بزرگ → نرمال شد) | 201 |
| 2 | Register SPECIALIST | 201 |
| 3 | ایمیل تکراری | 409 |
| 4 | رمز کوتاه | 422 (خطای Zod فارسی) |
| 5 | role=ADMIN | 403 |
| 6 | Login CLIENT | 200 + token |
| 7 | رمز اشتباه | 401 (پیام عمومی) |
| 8 | ایمیل ناموجود | 401 (همان پیام) |
| 9 | /me بدون توکن | 401 |
| 10 | /me با توکن معتبر | 200 |
| 11 | /me با توکن نامعتبر | 401 |
| 12 | admin-test با CLIENT | 403 |
| 13 | admin-test بدون توکن | 401 |
| 14 | admin-test با ADMIN | 200 |
| — | Rate limit (بورست) | 429 بعد از سقف |
| — | /health و /health/db | 200 / 200 |

هش‌های دیتابیس همگی `$argon2id$v=19$m=65536,...` ✔

## ۶) .env (تغییرات)

```
JWT_SECRET="..."        # فقط در .env محلی — تولید: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
JWT_EXPIRES_IN=1h
```

## ۷) خطاهای محتمل

| خطا | رفع |
|---|---|
| خروج با «JWT_SECRET حداقل باید ۱۶ کاراکتر باشد» | تنظیم Secret در `.env` و restart |
| `EADDRINUSE :::4000` | تغییر PORT یا آزادسازی پورت |
| 401 روی همه‌ی درخواست‌ها پس از restart | Secret عوض شده → توکن‌های قبلی نامعتبر → login مجدد |
| 429 زودهنگام در تست‌ها | سقف rate limit در `auth.routes.ts` یا صبر تا پایان پنجره |
| 401 «توکن نامعتبر یا منقضی شده است» | انقضای `JWT_EXPIRES_IN` یا دست‌کاری توکن → login دوباره |
| argon2 نصب نمی‌شود (نبود prebuilt) | `apt install build-essential` یا استفاده از `@node-rs/argon2` |

## ۸) چک‌لیست Milestone 04

- [x] Schema و migrations دست‌نخورده (`migrate diff` → No difference · فقط `20260904163053_init`)
- [x] Argon2id + عدم ذخیره‌ی رمز خام (بررسی مستقیم DB)
- [x] JWT با sub/role/email، Secret از env، انقضای قابل‌تنظیم
- [x] Register (CLIENT/SPECIALIST) + نرمال‌سازی ایمیل + 409 تکراری + 403 ADMIN
- [x] Login با خطای عمومی ضد User Enumeration + بررسی isActive
- [x] require-auth (7 مرحله‌ی مشخص) + require-role کمایی (rest params)
- [x] /me فقط اطلاعات امن (بدون passwordHash)
- [x] admin-test فقط ADMIN (401/403/200 مستند)
- [x] Rate limit پایه روی register/login
- [x] `npm run build` بدون خطا · اجرای سرور · health endpointها سالم
- [x] اتصال واقعی به همان دیتابیس قبلی (`DATABASE_URL` تغییر نکرده)
