// ─────────────────────────────────────────────────────────────
// Landing Page — معرفی محصول، ارزش، CTA و روند کار (فارسی، واقعی)
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

/** روند کار — پنج گام اصلی محصول */
const steps = [
  {
    title: 'ثبت نیاز پروژه',
    description: 'کارفرما نیاز، بودجه، مهلت و مهارت‌های لازم پروژه را ثبت می‌کند.',
  },
  {
    title: 'تطبیق هوشمند',
    description: 'موتور تطبیق، متخصصان را بر اساس مهارت، تجربه، امتیاز و اعتبار رتبه‌بندی می‌کند.',
  },
  {
    title: 'تشکیل تیم',
    description: 'تیم پیشنهادی در بازبینی مدیریت شکل می‌گیرد و پروژه تأیید می‌شود.',
  },
  {
    title: 'اجرا و مدیریت',
    description: 'تسک‌ها پیگیری می‌شوند و پیشرفت پروژه برای کارفرما شفاف است.',
  },
  {
    title: 'تحویل و امتیاز',
    description: 'پروژه تحویل داده می‌شود و امتیازدهی دوطرفه، اعتبار طرفین را می‌سازد.',
  },
]

const values = [
  {
    title: 'شفافیت کامل',
    description: 'امتیازهای تطبیق و اعتبار متخصصان بر اساس داده‌های واقعیِ سیستم محاسبه و نمایش داده می‌شود.',
  },
  {
    title: 'بازبینی انسانی',
    description: 'تصمیم نهایی تشکیل تیم و اجرا با بازبینی مدیریت است؛ هیچ تصمیم خودکاری گرفته نمی‌شود.',
  },
  {
    title: 'مدیریت یکپارچه',
    description: 'از تسک‌بندی تا امتیازدهی نهایی، همه‌چیز در یک جریان واحد مدیریت می‌شود.',
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="container flex flex-col items-center gap-6 py-16 text-center lg:py-24">
          <Badge variant="primary">نسخه‌ی پایه — مارکت‌پلیس پروژه‌های نرم‌افزاری</Badge>
          <h1 className="max-w-2xl text-3xl font-bold leading-tight text-slate-900 lg:text-4xl">
            پروژه‌ی نرم‌افزاری خود را ثبت کنید؛ بهترین متخصصان را شفاف تطبیق دهید
          </h1>
          <p className="max-w-xl text-sm leading-7 text-slate-600 lg:text-base">
            از ثبت نیاز تا تحویل نهایی: تطبیق هوشمند متخصصان بر اساس مهارت و اعتبار،
            تشکیل تیم با بازبینی مدیریت، و مدیریت اجرای پروژه در یک پلتفرم واحد.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="lg">ورود به داشبورد</Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="lg">شروع کنید — ثبت‌نام</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    ورود به حساب
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* روند کار */}
      <section className="container py-14" aria-labelledby="process-title">
        <h2 id="process-title" className="mb-2 text-center text-xl font-bold text-slate-900">
          روند کار در پنج گام
        </h2>
        <p className="mb-8 text-center text-sm text-slate-500">
          جریان کامل عمر پروژه، از نیاز تا تحویل و امتیازدهی
        </p>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <li key={step.title}>
              <Card className="h-full">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-800">{step.title}</h3>
                </div>
                <p className="mt-3 text-xs leading-6 text-slate-500">{step.description}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ارزش‌ها */}
      <section className="border-t border-slate-200 bg-white" aria-labelledby="values-title">
        <div className="container py-14">
          <h2 id="values-title" className="mb-8 text-center text-xl font-bold text-slate-900">
            چرا این پلتفرم؟
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title} className="h-full">
                <h3 className="text-sm font-semibold text-slate-800">{v.title}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-500">{v.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA پایانی */}
      <section className="container py-14">
        <Card padded={false} className="overflow-hidden">
          <div className="flex flex-col items-center gap-4 bg-indigo-600 px-6 py-10 text-center">
            <h2 className="text-lg font-bold text-white">آماده‌ی شروع هستید؟</h2>
            <p className="max-w-md text-xs leading-6 text-indigo-100">
              حساب کاربری بسازید و اولین پروژه‌ی خود را ثبت کنید یا به‌عنوان متخصص，
              پیشنهادهای متناسب با مهارت‌هایتان را دریافت کنید.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  ثبت‌نام رایگان
                </Button>
              </Link>
              <Link to="/login">
                <Button
                  size="lg"
                  variant="ghost"
                  className="bg-white/10 text-white hover:bg-white/20"
                >
                  ورود
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </>
  )
}
