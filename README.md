# مایندمتر (MindMeter)

سایت تست‌های روانشناسی آنلاین به زبان فارسی — [www.MindMeter.ir](https://www.mindmeter.ir)

ساخته‌شده با **Next.js** (App Router)، **TypeScript** و **Tailwind CSS**، کاملاً راست‌چین (RTL) با فونت وزیرمتن.

## پیش‌نیازها

- [Node.js](https://nodejs.org) نسخه‌ی ۲۰ یا بالاتر (پیشنهاد: ۲۲ LTS)
- [Git](https://git-scm.com)
- [VS Code](https://code.visualstudio.com)

## اجرا در VS Code

```bash
git clone https://github.com/abdollah1366/MindMeter.git
cd MindMeter
code .
```

سپس در VS Code ترمینال را باز کنید (`` Ctrl+` ``) و بزنید:

```bash
npm install
npm run dev
```

حالا سایت روی <http://localhost:3000> بالا می‌آید. هر تغییری در فایل‌ها بدهید، صفحه خودکار به‌روز می‌شود.

> VS Code هنگام باز کردن پروژه افزونه‌های پیشنهادی (Tailwind CSS IntelliSense و Prettier) را نشان می‌دهد؛ نصبشان کنید.

## دستورها

| دستور | کار |
| --- | --- |
| `npm run dev` | اجرای سرور توسعه |
| `npm run build` | ساخت نسخه‌ی نهایی (production) |
| `npm start` | اجرای نسخه‌ی ساخته‌شده |
| `npm run typecheck` | بررسی خطاهای TypeScript |

## ساختار پروژه

```
src/
├── app/                  صفحه‌ها (App Router)
│   ├── layout.tsx        قالب کلی سایت (lang="fa" dir="rtl")
│   ├── page.tsx          صفحه‌ی اصلی: فهرست تست‌ها
│   ├── about/            صفحه‌ی درباره ما
│   └── tests/[slug]/     صفحه‌ی هر تست
├── components/           کامپوننت‌ها (Header، Footer، TestCard، TestRunner)
├── data/tests/           محتوای تست‌ها ← اینجا تست اضافه کنید
└── lib/                  نوع‌ها (types.ts) و محاسبه‌ی امتیاز (scoring.ts)
```

## اضافه کردن تست جدید

1. یک فایل در `src/data/tests/` بسازید، مثلاً `anxiety.ts` (از روی `stress.ts` کپی کنید).
2. `slug` (آدرس صفحه)، عنوان، گزینه‌ها، سؤال‌ها و بازه‌های نتیجه را بنویسید.
   - سؤالی که `reverse: true` دارد امتیازش معکوس حساب می‌شود.
   - بازه‌های `results` باید کل محدوده‌ی امتیاز ممکن را بپوشانند.
3. آن را در `src/data/tests/index.ts` به آرایه‌ی `tests` اضافه کنید.

تست در صفحه‌ی اصلی و در آدرس `/tests/<slug>` نمایش داده می‌شود.

> ⚠️ دو تست فعلی (`stress` و `introversion`) نمونه‌اند و فقط ساختار را نشان می‌دهند. پیش از انتشار، از پرسشنامه‌های معتبر و دارای مجوز استفاده کنید.

## تذکر

نتایج تست‌های این سایت جنبه‌ی آگاهی‌بخشی دارد و جایگزین تشخیص یا مشاوره‌ی متخصص نیست.
