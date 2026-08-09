# سامانه جامع ارتباطات داخلی شهرداری لاهیجان

## راهنمای کامل راه‌اندازی و مدیریت

**تاریخ:** تیر ۱۴۰۵  
**توسعه:** واحد فناوری اطلاعات شهرداری لاهیجان

---

## فهرست مطالب

1. [معرفی سامانه](#۱-معرفی-سامانه)
2. [پیش‌نیازها](#۲-پیشنیازها)
3. [نصب گام به گام روی ویندوز سرور](#۳-نصب-گام-به-گام-روی-ویندوز-سرور)
4. [تنظیمات دیتابیس](#۴-تنظیمات-دیتابیس)
5. [تنظیمات پیامک (کاوه‌نگار)](#۵-تنظیمات-پیامک-کاوهنگار)
6. [اجرا و راه‌اندازی](#۶-اجرا-و-راهاندازی)
7. [اجرای خودکار (سرویس ویندوز)](#۷-اجرای-خودکار-سرویس-ویندوز)
8. [مدیریت کاربران](#۸-مدیریت-کاربران)
9. [امکانات سامانه](#۹-امکانات-سامانه)
10. [سامانه اطلاع‌رسانی پیامکی](#۱۰-سامانه-اطلاعرسانی-پیامکی)
11. [ساختار فایل‌ها و فولدرها](#۱۱-ساختار-فایلها-و-فولدرها)
12. [عیب‌یابی](#۱۲-عیبیابی)
13. [نکات امنیتی](#۱۳-نکات-امنیتی)
14. [بکاپ‌گیری](#۱۴-بکاپگیری)

---

## ۱. معرفی سامانه

این سامانه یک سیستم اینترانت (شبکه داخلی) برای مدیریت ارتباطات و مکاتبات داخلی شهرداری لاهیجان است.

### امکانات اصلی:
- ارسال و دریافت نامه (با قابلیت پیوست تا ۵ فایل)
- ارسال و دریافت فایل
- پیام‌رسان آنلاین (چت)
- سیستم امضای الکترونیک اسناد
- تأیید امضا با کد پیامکی (کاوه‌نگار)
- **سامانه اطلاع‌رسانی پیامکی** (ارسال پیامک گروهی)
- پنل مدیریت کاربران
- وضعیت آنلاین/آفلاین کاربران
- آرشیو نامه‌ها و فایل‌ها
- آخرین بازدید کاربران

---

## ۲. پیش‌نیازها

- ویندوز سرور ۲۰۱۹ یا ۲۰۲۲
- Node.js نسخه ۱۸ یا بالاتر (دانلود: https://nodejs.org)
- PostgreSQL نسخه ۱۵ یا بالاتر (دانلود: https://www.postgresql.org/download/windows)
- حداقل ۴ GB رم
- حداقل ۶۰ GB فضای دیسک
- اتصال به شبکه داخلی

---

## ۳. نصب گام به گام روی ویندوز سرور

### مرحله ۱: نصب Node.js

1. از https://nodejs.org فایل LTS را دانلود کنید
2. فایل .msi را اجرا کنید
3. Next → Accept → Next → Next → Install
4. بعد از نصب، CMD باز کنید و تست کنید:
   ```
   node --version
   npm --version
   ```

### مرحله ۲: نصب PostgreSQL

1. از https://www.postgresql.org/download/windows دانلود کنید
2. فایل نصب را اجرا کنید
3. رمز عبور postgres را تنظیم کنید (مثلاً: pass1234)
   ⚠️ این رمز را حتماً یادداشت کنید!
4. پورت پیش‌فرض: 5432
5. بعد از نصب pgAdmin باز کنید

### مرحله ۳: ساخت دیتابیس

1. pgAdmin را باز کنید
2. Servers → PostgreSQL → راست‌کلیک Databases → Create → Database
3. نام: intranet_db
4. Save

### مرحله ۴: کپی پروژه

1. فولدر پروژه را به `C:\shahrdari-intranet` کپی کنید
2. فولدرهای لازم را بسازید:
   ```
   mkdir C:\shahrdari-intranet\uploads
   mkdir C:\shahrdari-intranet\uploads\avatars
   mkdir C:\shahrdari-intranet\uploads\signatures
   mkdir C:\shahrdari-intranet\uploads\documents
   ```

### مرحله ۵: تنظیم فایل .env

با Notepad باز کنید:
```
notepad C:\shahrdari-intranet\.env
```

محتوا:
```
DATABASE_URL=postgresql://postgres:رمز_پستگرس@localhost:5432/intranet_db
```

مثال:
```
DATABASE_URL=postgresql://postgres:pass1234@localhost:5432/intranet_db
```

⚠️ اگر رمز کاراکتر خاص دارد:
- `@` → `%40`
- `#` → `%23`
- `:` → `%3A`

### مرحله ۶: نصب پکیج‌ها

```
cd C:\shahrdari-intranet
npm install
```

⚠️ اگر به دلیل فیلترینگ مشکل داشت:
```
npm config set registry https://registry.npmmirror.com
npm install
```

---

## ۴. تنظیمات دیتابیس

بعد از نصب پکیج‌ها، جداول را بسازید با یکی از دو روش:

### روش ۱: با Drizzle Kit (توصیه شده)
```
cd C:\shahrdari-intranet
npx drizzle-kit push
```

### روش ۲: با SQL در pgAdmin

pgAdmin → intranet_db → Query Tool → اجرا:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  position VARCHAR(200) NOT NULL DEFAULT 'کارمند',
  phone VARCHAR(20),
  avatar VARCHAR(500),
  signature VARCHAR(500),
  can_sign BOOLEAN NOT NULL DEFAULT false,
  can_notify BOOLEAN NOT NULL DEFAULT false,
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
  sender_archived BOOLEAN NOT NULL DEFAULT false,
  receiver_archived BOOLEAN NOT NULL DEFAULT false,
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
  sender_archived BOOLEAN NOT NULL DEFAULT false,
  receiver_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_attachments (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  filename VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  size INTEGER NOT NULL,
  mime_type VARCHAR(200) NOT NULL,
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

-- جداول اطلاع‌رسانی پیامکی
CREATE TABLE IF NOT EXISTS contact_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  color VARCHAR(20) DEFAULT '#3b82f6',
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  position VARCHAR(200),
  organization VARCHAR(200),
  notes TEXT,
  created_by_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_group_members (
  id SERIAL PRIMARY KEY,
  contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_campaigns (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  sender_id INTEGER NOT NULL REFERENCES users(id),
  total_recipients INTEGER DEFAULT 0 NOT NULL,
  sent_count INTEGER DEFAULT 0 NOT NULL,
  failed_count INTEGER DEFAULT 0 NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES sms_campaigns(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
  phone VARCHAR(20) NOT NULL,
  recipient_name VARCHAR(200),
  message TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  kavenegar_message_id VARCHAR(100),
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### ایجاد کاربر ادمین:

```sql
INSERT INTO users (username, display_name, position, password, is_admin, can_sign, can_notify, phone) 
VALUES (
  'admin', 
  'مدیر سیستم', 
  'واحد فناوری اطلاعات', 
  '$2b$10$ZhpoAL95674XOYIUINB4.e1SEd8Ns3MIiJS8RHUUNVPi8JrW9eBeq', 
  true,
  true,
  true,
  '09123456789'
);
```

- نام کاربری: `admin`
- رمز عبور: `admin123`

⚠️ بعد از ورود حتماً رمز عبور ادمین را از پنل مدیریت تغییر دهید!

---

## ۵. تنظیمات پیامک (کاوه‌نگار)

سیستم امضای الکترونیک و اطلاع‌رسانی از پیامک برای تأیید هویت و ارسال اعلان استفاده می‌کند.

### اطلاعات فعلی

- **API Key:** `47464F4B4B5256544231364A6E544B6C5447565667436D644D5A6631677377504E73576855316C533951733D`
- **شماره خط:** `100009235`

### فایل‌های تنظیمات پیامک

| کاربرد | فایل |
|--------|------|
| ارسال کد تأیید امضا | `src/app/api/sms/send-code/route.ts` |
| اطلاع‌رسانی پیامکی گروهی | `src/app/api/sms-campaigns/route.ts` |

### تغییر API Key

در هر دو فایل بالا:
```typescript
const KAVENEGAR_API_KEY = "کلید_جدید";
```

### تغییر شماره خط ارسال

```typescript
const SENDER = "شماره_جدید";
```

### دریافت API Key جدید

1. وارد https://panel.kavenegar.com شوید
2. تنظیمات حساب → کلید وب‌سرویس (API Key)
3. کلید را کپی کنید

⚠️ بعد از هر تغییر باید دوباره بیلد کنید:
```
npm run build
```

---

## ۶. اجرا و راه‌اندازی

### بیلد

```
cd C:\shahrdari-intranet
npm run build
```

### اجرا

```
npm run start
```

### آدرس دسترسی

- از خود سرور: `http://localhost:3000`
- از شبکه داخلی: `http://IP_SERVER:3000`
- مثال: `http://192.168.1.100:3000`

### باز کردن فایروال

1. Windows Defender Firewall → Advanced settings
2. Inbound Rules → New Rule
3. Port → TCP → 3000 → Allow → نام: Intranet-App
4. Finish

---

## ۷. اجرای خودکار (سرویس ویندوز)

برای اینکه سامانه بعد از ریستارت سرور خودکار بالا بیاید:

### نصب PM2

```
npm install -g pm2
npm install -g pm2-windows-startup
```

### اجرا با PM2

```
cd C:\shahrdari-intranet
pm2 start npm --name "shahrdari" -- start
pm2 save
pm2-startup install
```

### دستورات مفید PM2

| دستور | توضیح |
|-------|-------|
| `pm2 status` | وضعیت سرویس |
| `pm2 logs shahrdari` | مشاهده لاگ‌ها |
| `pm2 restart shahrdari` | ریستارت سرویس |
| `pm2 stop shahrdari` | توقف سرویس |
| `pm2 delete shahrdari` | حذف سرویس |

---

## ۸. مدیریت کاربران

### ورود به پنل مدیریت

1. با حساب ادمین وارد شوید
2. منوی سمت راست → مدیریت کاربران

### ایجاد کاربر جدید

1. دکمه "کاربر جدید"
2. اطلاعات:
   - نام کاربری (انگلیسی، مثال: a.rezaei)
   - نام و نام خانوادگی (فارسی)
   - سمت / واحد (مثال: امور مالی)
   - شماره موبایل (برای پیامک امضا)
   - رمز عبور
   - عکس پروفایل (اختیاری)
3. دسترسی‌ها:
   - **مدیر سیستم:** مدیریت کاربران و تنظیمات
   - **قابلیت امضا:** می‌تواند اسناد را امضا کند
   - **دسترسی اطلاع‌رسانی:** دسترسی به سامانه ارسال پیامک گروهی
4. اگر "قابلیت امضا" فعال شد:
   - تصویر امضا (PNG شفاف) آپلود کنید

---

## ۹. امکانات سامانه

### نامه‌ها
- ارسال نامه با متن و موضوع
- پیوست تا ۵ فایل به هر نامه
- مشاهده نامه‌های دریافتی و ارسالی
- آرشیو نامه‌ها
- ارجاع/فوروارد نامه
- نشانگر خوانده نشده
- حذف نامه

### فایل‌ها
- ارسال هر نوع فایل به همکاران
- دانلود فایل‌های دریافتی و ارسالی
- آرشیو فایل‌ها
- ارجاع/فوروارد فایل
- نشانگر خوانده نشده
- حذف فایل

### پیام‌رسان (چت)
- چت آنلاین با همکاران
- نشانگر پیام خوانده نشده (دایره قرمز)
- وضعیت آنلاین/آفلاین
- آخرین بازدید
- آپدیت خودکار هر ۴ ثانیه

### امضای الکترونیک
- ارسال درخواست امضا (آپلود تصویر یا PDF نامه)
- فقط کاربران دارای "قابلیت امضا" در لیست امضاکنندگان هستند
- مشاهده سند و قرار دادن امضا روی آن (drag & drop)
- تغییر سایز امضا (۴۰ تا ۵۰۰)
- تأیید با کد پیامکی
- دانلود نسخه امضا شده (PDF یا تصویر)
- وضعیت: در انتظار (نارنجی) / امضا شده (سبز)

⚠️ نکته مهم: فایل‌های تصویری (JPG, PNG) و PDF برای امضا پشتیبانی می‌شوند.

### داشبورد
- خلاصه وضعیت (نامه، فایل، چت، امضا)
- تعداد خوانده نشده هر بخش
- دسترسی سریع به همه بخش‌ها

---

## ۱۰. سامانه اطلاع‌رسانی پیامکی

⚠️ **این بخش در readme اصلی ذکر نشده بود!**

### معرفی
سامانه اطلاع‌رسانی پیامکی امکان ارسال پیامک گروهی به مخاطبین و گروه‌ها را فراهم می‌کند.

### دسترسی
- ادمین‌ها به صورت پیش‌فرض دسترسی دارند
- کاربران دیگر با فعال کردن "دسترسی اطلاع‌رسانی" در پنل مدیریت

### مسیر دسترسی
داشبورد → منوی سمت راست → 📣 اطلاع‌رسانی پیامکی

### امکانات

#### مدیریت مخاطبین
- افزودن مخاطب جدید (نام، شماره موبایل، سمت، سازمان)
- ویرایش و حذف مخاطبین
- جستجو در لیست مخاطبین
- اضافه کردن مخاطب به گروه‌ها

#### مدیریت گروه‌ها
- ایجاد گروه با نام، توضیحات و رنگ
- افزودن اعضا به گروه
- ویرایش و حذف گروه

#### ارسال پیامک
- انتخاب عنوان و متن پیامک
- انتخاب گیرندگان از لیست مخاطبین
- انتخاب گروه‌ها (تمام اعضای گروه)
- مشاهده تعداد گیرندگان
- گزارش ارسال (موفق/ناموفق)

#### تاریخچه ارسال‌ها
- مشاهده لیست پیامک‌های ارسال شده
- آمار ارسال موفق و ناموفق
- تاریخ و ساعت ارسال

### فایل‌های مرتبط

| فایل | توضیح |
|------|-------|
| `src/app/dashboard/notifications/page.tsx` | صفحه اصلی سامانه |
| `src/app/api/contacts/route.ts` | API مدیریت مخاطبین |
| `src/app/api/contact-groups/route.ts` | API مدیریت گروه‌ها |
| `src/app/api/sms-campaigns/route.ts` | API ارسال پیامک |
| `src/db/schema.ts` | جداول: contacts, contact_groups, sms_campaigns, sms_logs |

### جداول دیتابیس

| جدول | توضیح |
|------|-------|
| `contacts` | لیست مخاطبین |
| `contact_groups` | گروه‌های مخاطبین |
| `contact_group_members` | ارتباط مخاطب-گروه |
| `sms_campaigns` | کمپین‌های پیامکی |
| `sms_logs` | لاگ ارسال هر پیامک |

---

## ۱۱. ساختار فایل‌ها و فولدرها

```
C:\shahrdari-intranet\
├── .env                           ← تنظیمات دیتابیس
├── package.json                   ← اطلاعات پروژه
├── node_modules\                  ← پکیج‌ها (نصب خودکار)
├── .next\                         ← فایل‌های بیلد شده
├── uploads\                       ← فایل‌های آپلود شده
│   ├── avatars\                   ← عکس پروفایل کاربران
│   ├── signatures\                ← تصاویر امضا
│   └── documents\                 ← اسناد درخواست امضا
│       └── logs\                  ← لاگ‌های امضای الکترونیک
├── public\
│   ├── js\                        ← فایل‌های PDF.js
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
    │   │   ├── sms\               ← پیامک کد تأیید
    │   │   ├── sms-campaigns\     ← پیامک گروهی
    │   │   ├── contacts\          ← مخاطبین پیامک
    │   │   ├── contact-groups\    ← گروه‌های پیامک
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
    │       ├── archive\           ← آرشیو
    │       ├── notifications\     ← اطلاع‌رسانی پیامکی
    │       └── signatures\        ← امضای الکترونیک
    ├── components\                ← کامپوننت‌های مشترک
    │   ├── Avatar.tsx             ← آواتار کاربر
    │   ├── Icons.tsx              ← آیکون‌های SVG
    │   ├── Notifications.tsx      ← اعلان‌ها
    │   ├── ForwardModal.tsx       ← مودال ارجاع
    │   └── PdfViewer.tsx          ← نمایشگر PDF
    ├── db\                        ← دیتابیس
    │   ├── schema.ts              ← ساختار جداول
    │   └── index.ts               ← اتصال دیتابیس
    └── lib\                       ← توابع کمکی
        ├── auth.ts                ← توکن JWT
        ├── client-auth.ts         ← احراز هویت سمت کاربر
        ├── server-auth.ts         ← احراز هویت سمت سرور
        └── date.ts                ← تاریخ شمسی
```

---

## ۱۲. عیب‌یابی

### سایت باز نمی‌شود
1. مطمئن شوید سرویس در حال اجراست: `pm2 status`
2. فایروال پورت 3000 باز باشد
3. IP سرور را ping کنید
4. لاگ‌ها را ببینید: `pm2 logs shahrdari`

### خطای دیتابیس
1. سرویس PostgreSQL فعال باشد:
   `services.msc → postgresql-x64-16 → Running`
2. رمز .env صحیح باشد
3. دیتابیس intranet_db وجود داشته باشد

### خطای "database does not exist"
در pgAdmin دیتابیس intranet_db را بسازید

### خطای "relation does not exist"
جداول ساخته نشده‌اند. کوری بخش ۴ را اجرا کنید یا:
```
npx drizzle-kit push
```

### خطای پیامک / OTP
1. API Key کاوه‌نگار معتبر باشد
2. شماره خط درست باشد
3. موجودی کاوه‌نگار کافی باشد
4. شماره موبایل کاربر ثبت شده باشد
5. اتصال اینترنت سرور برقرار باشد
6. لاگ‌ها را بررسی کنید: `pm2 logs shahrdari`

### PDF امضا شده مشکل دارد
- مطمئن شوید پکیج pdf-lib نصب است: `npm install pdf-lib`
- فایل PDF اصلی سالم باشد

### فایل دانلود نمی‌شود
1. فولدر uploads وجود داشته باشد
2. دسترسی نوشتن روی فولدر باشد

### عکس پروفایل / لوگو نمایش داده نمی‌شود
1. فولدر uploads/avatars وجود داشته باشد
2. فایل logo.png در uploads/ باشد

### npm install کار نمی‌کند
1. `npm config set registry https://registry.npmmirror.com`
2. یا فولدر node_modules را از کامپیوتر دیگر کپی کنید

---

## ۱۳. نکات امنیتی

1. رمز عبور ادمین پیش‌فرض (admin123) را حتماً تغییر دهید
2. رمز PostgreSQL قوی انتخاب کنید
3. فایروال را فقط برای پورت 3000 باز کنید
4. دسترسی به پورت 5432 (دیتابیس) را از بیرون ببندید
5. از شبکه داخلی استفاده کنید (بدون دسترسی اینترنت)
6. بکاپ منظم بگیرید
7. API Key کاوه‌نگار را در اختیار دیگران قرار ندهید

---

## ۱۴. بکاپ‌گیری

### بکاپ دیتابیس

روزانه (با Task Scheduler ویندوز):
```
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" ^
  -U postgres -d intranet_db ^
  -f C:\backup\db_backup_%date:~-4%_%date:~3,2%_%date:~0,2%.sql
```

رمز را در فایل pgpass.conf تنظیم کنید:
```
C:\Users\Administrator\AppData\Roaming\postgresql\pgpass.conf
محتوا: localhost:5432:intranet_db:postgres:رمز_شما
```

### بکاپ فایل‌ها
```
xcopy C:\shahrdari-intranet\uploads C:\backup\uploads\ /E /Y
```

### بازیابی دیتابیس
```
psql -U postgres -d intranet_db -f C:\backup\db_backup.sql
```

---

## خلاصه اطلاعات نهایی

| آیتم | مقدار |
|------|-------|
| آدرس سامانه | `http://IP_SERVER:3000` |
| نام کاربری ادمین | `admin` |
| رمز ادمین اولیه | `admin123` |
| پورت اپلیکیشن | `3000` |
| پورت دیتابیس | `5432` |
| مسیر پروژه | `C:\shahrdari-intranet` |
| مسیر فایل‌ها | `C:\shahrdari-intranet\uploads` |
| مسیر لوگو | `C:\shahrdari-intranet\uploads\logo.png` |
| API Key کاوه‌نگار | `47464F4B4B525654...` |
| خط پیامک | `100009235` |
| فایل تنظیم SMS | `src/app/api/sms/send-code/route.ts` |
| فایل تنظیم SMS گروهی | `src/app/api/sms-campaigns/route.ts` |

---

**پشتیبانی:** واحد فناوری اطلاعات شهرداری لاهیجان
