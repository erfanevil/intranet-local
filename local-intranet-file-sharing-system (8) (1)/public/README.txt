================================================================================
          سامانه جامع ارتباطات داخلی شهرداری لاهیجان
                   راهنمای کامل راه‌اندازی و مدیریت
================================================================================

تاریخ: تیر ۱۴۰۵
توسعه: واحد فناوری اطلاعات شهرداری لاهیجان

================================================================================
                          فهرست مطالب
================================================================================

  ۱. معرفی سامانه
  ۲. پیش‌نیازها
  ۳. نصب گام به گام روی ویندوز سرور
  ۴. تنظیمات دیتابیس
  ۵. تنظیمات پیامک (کاوه‌نگار)
  ۶. اجرا و راه‌اندازی
  ۷. اجرای خودکار (سرویس ویندوز)
  ۸. مدیریت کاربران
  ۹. امکانات سامانه
  ۱۰. ساختار فایل‌ها و فولدرها
  ۱۱. عیب‌یابی
  ۱۲. نکات امنیتی
  ۱۳. بکاپ‌گیری

================================================================================
  ۱. معرفی سامانه
================================================================================

این سامانه یک سیستم اینترانت (شبکه داخلی) برای مدیریت ارتباطات 
و مکاتبات داخلی شهرداری لاهیجان است.

امکانات اصلی:
  - ارسال و دریافت نامه (با قابلیت پیوست فایل)
  - ارسال و دریافت فایل
  - پیام‌رسان آنلاین (چت)
  - سیستم امضای الکترونیک اسناد
  - تأیید امضا با کد پیامکی (کاوه‌نگار)
  - پنل مدیریت کاربران
  - وضعیت آنلاین/آفلاین کاربران
  - آخرین بازدید کاربران

================================================================================
  ۲. پیش‌نیازها
================================================================================

  - ویندوز سرور ۲۰۱۹ یا ۲۰۲۲
  - Node.js نسخه ۱۸ یا بالاتر (دانلود: https://nodejs.org)
  - PostgreSQL نسخه ۱۵ یا بالاتر (دانلود: https://www.postgresql.org/download/windows)
  - حداقل ۴ GB رم
  - حداقل ۶۰ GB فضای دیسک
  - اتصال به شبکه داخلی

================================================================================
  ۳. نصب گام به گام روی ویندوز سرور
================================================================================

--- مرحله ۱: نصب Node.js ---

  ۱. از https://nodejs.org فایل LTS را دانلود کنید
  ۲. فایل .msi را اجرا کنید
  ۳. Next → Accept → Next → Next → Install
  ۴. بعد از نصب، CMD باز کنید و تست کنید:
     node --version
     npm --version

--- مرحله ۲: نصب PostgreSQL ---

  ۱. از https://www.postgresql.org/download/windows دانلود کنید
  ۲. فایل نصب را اجرا کنید
  ۳. رمز عبور postgres را تنظیم کنید (مثلاً: pass1234)
     ⚠️ این رمز را حتماً یادداشت کنید!
  ۴. پورت پیش‌فرض: 5432
  ۵. بعد از نصب pgAdmin باز کنید

--- مرحله ۳: ساخت دیتابیس ---

  ۱. pgAdmin را باز کنید
  ۲. Servers → PostgreSQL → راست‌کلیک Databases → Create → Database
  ۳. نام: intranet_db
  ۴. Save

--- مرحله ۴: کپی پروژه ---

  ۱. فولدر پروژه را به C:\shahrdari-intranet کپی کنید
  ۲. فولدرهای لازم را بسازید:
     mkdir C:\shahrdari-intranet\uploads
     mkdir C:\shahrdari-intranet\uploads\avatars
     mkdir C:\shahrdari-intranet\uploads\signatures
     mkdir C:\shahrdari-intranet\uploads\documents

--- مرحله ۵: تنظیم فایل .env ---

  با Notepad باز کنید:
     notepad C:\shahrdari-intranet\.env

  محتوا:
     DATABASE_URL=postgresql://postgres:رمز_پستگرس@localhost:5432/intranet_db

  مثال:
     DATABASE_URL=postgresql://postgres:pass1234@localhost:5432/intranet_db

  ⚠️ اگر رمز کاراکتر خاص دارد:
     @ → %40
     # → %23
     : → %3A

--- مرحله ۶: نصب پکیج‌ها ---

  cd C:\shahrdari-intranet
  npm install

  ⚠️ اگر به دلیل فیلترینگ مشکل داشت:
     npm config set registry https://registry.npmmirror.com
     npm install

  ⚠️ اگر باز هم کار نکرد:
     روی کامپیوتر دیگر با اینترنت آزاد npm install بزنید
     فولدر node_modules را ZIP کرده و به سرور انتقال دهید

================================================================================
  ۴. تنظیمات دیتابیس
================================================================================

بعد از نصب پکیج‌ها، جداول را بسازید.
pgAdmin → intranet_db → Query Tool → اجرا:

---------- شروع کوری ----------

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  position VARCHAR(200) NOT NULL DEFAULT 'کارمند',
  phone VARCHAR(20),
  avatar VARCHAR(500),
  signature VARCHAR(500),
  can_sign BOOLEAN NOT NULL DEFAULT false,
  password VARCHAR(255) NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type VARCHAR(200) NOT NULL,
  size INTEGER NOT NULL,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  attachment_filename VARCHAR(500),
  attachment_original_name VARCHAR(500),
  attachment_size INTEGER,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  receiver_id INTEGER NOT NULL REFERENCES users(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS signature_requests (
  id SERIAL PRIMARY KEY,
  document_filename VARCHAR(500) NOT NULL,
  document_original_name VARCHAR(500) NOT NULL,
  signed_filename VARCHAR(500),
  description TEXT,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  signer_id INTEGER NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  signed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

---------- پایان کوری ----------

سپس کاربر ادمین بسازید:

INSERT INTO users (username, display_name, position, password, is_admin, can_sign) 
VALUES (
  'admin', 
  'مدیر سیستم', 
  'واحد فناوری اطلاعات', 
  '$2b$10$ZhpoAL95674XOYIUINB4.e1SEd8Ns3MIiJS8RHUUNVPi8JrW9eBeq', 
  true,
  false
);

  نام کاربری: admin
  رمز عبور: admin123

⚠️ بعد از ورود حتماً رمز عبور ادمین را از پنل مدیریت تغییر دهید!

================================================================================
  ۵. تنظیمات پیامک (کاوه‌نگار)
================================================================================

سیستم امضای الکترونیک از پیامک برای تأیید هویت استفاده می‌کند.

--- اطلاعات فعلی ---

  API Key:  47464F4B4B5256544231364A6E544B6C5447565667436D644D5A6631677377504E73576855316C533951733D
  شماره خط: 100009235

--- تغییر API Key ---

  فایل: src/app/api/sms/send-code/route.ts
  خط ۶: const KAVENEGAR_API_KEY = "کلید_جدید";

--- تغییر شماره خط ارسال ---

  فایل: src/app/api/sms/send-code/route.ts
  خط ۷: const SENDER = "شماره_جدید";

--- دریافت API Key جدید ---

  ۱. وارد https://panel.kavenegar.com شوید
  ۲. تنظیمات حساب → کلید وب‌سرویس (API Key)
  ۳. کلید را کپی کنید

--- مشاهده شماره خط ---

  ۱. پنل کاوه‌نگار → خطوط
  ۲. شماره خط خود را ببینید

--- تغییر متن پیامک ---

  فایل: src/app/api/sms/send-code/route.ts
  خط ۳۵: const message = `کد تأیید امضا: ${code}\nشهرداری لاهیجان`;

⚠️ بعد از هر تغییر باید دوباره بیلد کنید:
  npm run build

================================================================================
  ۶. اجرا و راه‌اندازی
================================================================================

--- بیلد ---

  cd C:\shahrdari-intranet
  npm run build

--- اجرا ---

  npm run start

--- آدرس دسترسی ---

  از خود سرور:     http://localhost:3000
  از شبکه داخلی:   http://IP_SERVER:3000
  مثال:            http://192.168.1.100:3000

--- باز کردن فایروال ---

  ۱. Windows Defender Firewall → Advanced settings
  ۲. Inbound Rules → New Rule
  ۳. Port → TCP → 3000 → Allow → نام: Intranet-App
  ۴. Finish

================================================================================
  ۷. اجرای خودکار (سرویس ویندوز)
================================================================================

برای اینکه سامانه بعد از ریستارت سرور خودکار بالا بیاید:

--- نصب PM2 ---

  npm install -g pm2
  npm install -g pm2-windows-startup

--- اجرا با PM2 ---

  cd C:\shahrdari-intranet
  pm2 start npm --name "shahrdari" -- start
  pm2 save
  pm2-startup install

--- دستورات مفید PM2 ---

  pm2 status              وضعیت سرویس
  pm2 logs shahrdari      مشاهده لاگ‌ها
  pm2 restart shahrdari   ریستارت سرویس
  pm2 stop shahrdari      توقف سرویس
  pm2 delete shahrdari    حذف سرویس

================================================================================
  ۸. مدیریت کاربران
================================================================================

--- ورود به پنل مدیریت ---

  ۱. با حساب ادمین وارد شوید
  ۲. منوی سمت راست → مدیریت کاربران

--- ایجاد کاربر جدید ---

  ۱. دکمه "کاربر جدید"
  ۲. اطلاعات:
     - نام کاربری (انگلیسی، مثال: a.rezaei)
     - نام و نام خانوادگی (فارسی)
     - سمت / واحد (مثال: امور مالی)
     - شماره موبایل (برای پیامک امضا)
     - رمز عبور
     - عکس پروفایل (اختیاری)
  ۳. دسترسی‌ها:
     - مدیر سیستم: مدیریت کاربران و تنظیمات
     - قابلیت امضا: می‌تواند اسناد را امضا کند
  ۴. اگر "قابلیت امضا" فعال شد:
     - تصویر امضا (PNG شفاف) آپلود کنید

--- ویرایش کاربر ---

  دکمه "ویرایش" روی کارت کاربر

--- حذف کاربر ---

  دکمه "حذف" روی کارت کاربر
  ⚠️ ادمین نمی‌تواند خودش را حذف کند

================================================================================
  ۹. امکانات سامانه
================================================================================

--- نامه‌ها ---
  - ارسال نامه با متن و موضوع
  - پیوست فایل به نامه
  - مشاهده نامه‌های دریافتی و ارسالی
  - نشانگر خوانده نشده
  - حذف نامه

--- فایل‌ها ---
  - ارسال هر نوع فایل به همکاران
  - دانلود فایل‌های دریافتی و ارسالی
  - نشانگر خوانده نشده
  - حذف فایل

--- پیام‌رسان (چت) ---
  - چت آنلاین با همکاران
  - نشانگر پیام خوانده نشده (دایره قرمز)
  - وضعیت آنلاین/آفلاین
  - آخرین بازدید
  - آپدیت خودکار هر ۴ ثانیه

--- امضای الکترونیک ---
  - ارسال درخواست امضا (آپلود تصویر نامه)
  - فقط کاربران دارای "قابلیت امضا" در لیست امضاکنندگان هستند
  - مشاهده سند و قرار دادن امضا روی آن (drag & drop)
  - تغییر سایز امضا (۴۰ تا ۵۰۰)
  - تأیید با کد پیامکی
  - دانلود نسخه امضا شده
  - وضعیت: در انتظار (نارنجی) / امضا شده (سبز)

  ⚠️ نکته مهم: فقط فایل‌های تصویری (JPG, PNG) برای امضا پشتیبانی می‌شوند
  نامه‌های Word یا PDF باید اول به تصویر تبدیل شوند

--- داشبورد ---
  - خلاصه وضعیت (نامه، فایل، چت، امضا)
  - تعداد خوانده نشده هر بخش
  - دسترسی سریع به همه بخش‌ها

================================================================================
  ۱۰. ساختار فایل‌ها و فولدرها
================================================================================

C:\shahrdari-intranet\
├── .env                           ← تنظیمات دیتابیس
├── package.json                   ← اطلاعات پروژه
├── node_modules\                  ← پکیج‌ها (نصب خودکار)
├── .next\                         ← فایل‌های بیلد شده
├── uploads\                       ← فایل‌های آپلود شده
│   ├── avatars\                   ← عکس پروفایل کاربران
│   ├── signatures\                ← تصاویر امضا
│   └── documents\                 ← اسناد درخواست امضا
├── public\
│   └── uploads\
│       └── logo.png               ← لوگوی شهرداری
└── src\
    ├── app\                       ← صفحات و API‌ها
    │   ├── page.tsx               ← صفحه ورود
    │   ├── layout.tsx             ← قالب اصلی
    │   ├── globals.css            ← استایل‌ها و فونت
    │   ├── api\                   ← API‌های سرور
    │   │   ├── auth\              ← احراز هویت
    │   │   ├── admin\             ← مدیریت کاربران
    │   │   ├── messages\          ← نامه‌ها
    │   │   ├── files\             ← فایل‌ها
    │   │   ├── chats\             ← چت
    │   │   ├── sign-requests\     ← امضای الکترونیک
    │   │   ├── sms\               ← پیامک کاوه‌نگار
    │   │   ├── online\            ← وضعیت آنلاین
    │   │   └── notifications\     ← اعلان‌ها
    │   └── dashboard\             ← صفحات داشبورد
    │       ├── page.tsx           ← داشبورد اصلی
    │       ├── layout.tsx         ← قالب داشبورد
    │       ├── admin\             ← پنل مدیریت
    │       ├── messages\          ← نامه‌ها
    │       ├── files\             ← فایل‌ها
    │       ├── chat\              ← پیام‌رسان
    │       ├── send\              ← ارسال جدید
    │       └── signatures\        ← امضای الکترونیک
    ├── components\                ← کامپوننت‌های مشترک
    │   ├── Avatar.tsx             ← آواتار کاربر
    │   ├── Icons.tsx              ← آیکون‌های SVG
    │   └── Notifications.tsx      ← اعلان‌ها
    ├── db\                        ← دیتابیس
    │   ├── schema.ts              ← ساختار جداول
    │   └── index.ts               ← اتصال دیتابیس
    └── lib\                       ← توابع کمکی
        ├── auth.ts                ← توکن JWT
        ├── client-auth.ts         ← احراز هویت سمت کاربر
        ├── server-auth.ts         ← احراز هویت سمت سرور
        └── date.ts                ← تاریخ شمسی

================================================================================
  ۱۱. عیب‌یابی
================================================================================

--- سایت باز نمی‌شود ---
  ۱. مطمئن شوید سرویس در حال اجراست: pm2 status
  ۲. فایروال پورت 3000 باز باشد
  ۳. IP سرور را ping کنید
  ۴. لاگ‌ها را ببینید: pm2 logs shahrdari

--- خطای دیتابیس ---
  ۱. سرویس PostgreSQL فعال باشد:
     services.msc → postgresql-x64-16 → Running
  ۲. رمز .env صحیح باشد
  ۳. دیتابیس intranet_db وجود داشته باشد

--- خطای "database does not exist" ---
  در pgAdmin دیتابیس intranet_db را بسازید

--- خطای "relation does not exist" ---
  جداول ساخته نشده‌اند. کوری بخش ۴ را اجرا کنید

--- خطای پیامک ---
  ۱. API Key کاوه‌نگار معتبر باشد
  ۲. شماره خط درست باشد
  ۳. موجودی کاوه‌نگار کافی باشد
  ۴. شماره موبایل کاربر ثبت شده باشد

--- فایل دانلود نمی‌شود ---
  ۱. فولدر uploads وجود داشته باشد
  ۲. دسترسی نوشتن روی فولدر باشد

--- عکس پروفایل / لوگو نمایش داده نمی‌شود ---
  ۱. فولدر uploads/avatars وجود داشته باشد
  ۲. فایل logo.png در uploads/ باشد

--- npm install کار نمی‌کند ---
  ۱. npm config set registry https://registry.npmmirror.com
  ۲. یا فولدر node_modules را از کامپیوتر دیگر کپی کنید

================================================================================
  ۱۲. نکات امنیتی
================================================================================

  ۱. رمز عبور ادمین پیش‌فرض (admin123) را حتماً تغییر دهید
  ۲. رمز PostgreSQL قوی انتخاب کنید
  ۳. فایروال را فقط برای پورت 3000 باز کنید
  ۴. دسترسی به پورت 5432 (دیتابیس) را از بیرون ببندید
  ۵. از شبکه داخلی استفاده کنید (بدون دسترسی اینترنت)
  ۶. بکاپ منظم بگیرید
  ۷. API Key کاوه‌نگار را در اختیار دیگران قرار ندهید

================================================================================
  ۱۳. بکاپ‌گیری
================================================================================

--- بکاپ دیتابیس ---

  روزانه (با Task Scheduler ویندوز):

  "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" ^
    -U postgres -d intranet_db ^
    -f C:\backup\db_backup_%date:~-4%_%date:~3,2%_%date:~0,2%.sql

  رمز را در فایل pgpass.conf تنظیم کنید:
  C:\Users\Administrator\AppData\Roaming\postgresql\pgpass.conf
  محتوا: localhost:5432:intranet_db:postgres:رمز_شما

--- بکاپ فایل‌ها ---

  xcopy C:\shahrdari-intranet\uploads C:\backup\uploads\ /E /Y

--- بازیابی دیتابیس ---

  psql -U postgres -d intranet_db -f C:\backup\db_backup.sql

================================================================================
  خلاصه اطلاعات نهایی
================================================================================

  آدرس سامانه:      http://IP_SERVER:3000
  نام کاربری ادمین:  admin
  رمز ادمین اولیه:   admin123
  پورت اپلیکیشن:    3000
  پورت دیتابیس:     5432
  مسیر پروژه:       C:\shahrdari-intranet
  مسیر فایل‌ها:      C:\shahrdari-intranet\uploads
  مسیر لوگو:        C:\shahrdari-intranet\uploads\logo.png

  API Key کاوه‌نگار:  47464F4B4B525654...
  خط پیامک:         100009235
  فایل تنظیم SMS:    src/app/api/sms/send-code/route.ts

================================================================================
  پشتیبانی: واحد فناوری اطلاعات شهرداری لاهیجان
================================================================================
