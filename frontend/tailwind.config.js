/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
    },
    extend: {
      fontFamily: {
        // فونت فارسی خوانا؛ Tahoma به‌عنوان fallback آفلاین
        vazir: ['Vazirmatn', 'Vazir', 'Tahoma', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(15 23 42 / 0.08), 0 4px 16px -4px rgb(15 23 42 / 0.08)',
      },
    },
  },
  plugins: [],
}
