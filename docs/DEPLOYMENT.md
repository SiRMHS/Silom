# دیپلوی دستی و آفلاین

بدون CI/CD. استک: فقط Postgres + اپ Next.js با Docker Compose — nginx و
certbot توی این استک نیستن، چون:

- سرور به نت بین‌المللی دسترسی نداره، پس نه می‌تونه از Docker Hub/GHCR پول
  کنه، نه می‌تونه با Let's Encrypt حرف بزنه.
- پورت ۸۰/۴۴۳ همین سرور مال یک سایت دیگه‌ست، و SSL دامنه هم جدا مدیریت
  می‌شه (بیرون از این استک).

راه‌حل: ایمیج‌ها روی GitHub Actions ساخته می‌شن (نه لوکال، نه روی سرور) —
job فقط build می‌کنه، هیچ deploy یا push به هیچ registry‌ای نداره
(`.github/workflows/build.yml`). خروجیش یک artifact قابل دانلوده که با
`docker save` گرفته شده؛ دانلودش می‌کنی، به سرور منتقل می‌کنی و اونجا با
`docker load` بار می‌شن. `app` فقط روی `127.0.0.1:3000` گوش می‌ده؛ همون
وب‌سروری که الان سایت دیگه رو سرو می‌کنه، این دامنه رو هم reverse-proxy
می‌کنه به همون پورت.

## ۰) قبل از push: محتوا را همراه کد بفرست

صفحه‌های سایت موقع `next build` از روی دیتابیس **پیش‌رندر** می‌شوند. یعنی
محتوایی که فقط توی دیتابیس لوکال توست، خودبه‌خود به سایت لایو نمی‌رسد — باید
کنارِ کد commit شود.

بعد از هر تغییری که در پنل ادمین لوکال دادی:

```bash
npm run db:export
```

این دستور جدول‌های محتوا را در `packages/db/content-snapshot.json`
می‌نویسد. آن فایل را به همراه هر فایل تازه‌ای در `apps/web/public/uploads`
(تصویرهایی که در پنل آپلود کرده‌ای) commit و push کن:

```bash
git add packages/db/content-snapshot.json apps/web/public/uploads
git commit -m "content: بروزرسانی محتوای سایت"
git push
```

از اینجا به بعد اسنپ‌شات هم داخل ایمیج (برای پیش‌رندر صفحه‌ها) و هم روی
دیتابیس سرور (مرحله‌ی ۳) اعمال می‌شود.

**چه چیزی می‌رود و چه چیزی نمی‌رود:** تنظیمات، پروژه‌ها، خدمات، مجله، تیم،
همکاران، نظرهای مشتری‌ها، منوها و رسانه‌ها می‌روند — و اسنپ‌شات مرجع است، پس
هر ردیفی که لوکال حذف کرده باشی روی سرور هم حذف می‌شود، از جمله چیزی که
مستقیم روی پنل سایت لایو ساخته شده باشد. حساب‌های کاربری، سشن‌ها،
کامنت‌های خواننده‌ها و پیام‌های فرم تماس هیچ‌وقت دست نمی‌خورند؛ آن‌ها روی
سرور نوشته می‌شوند و اسنپ‌شات لپ‌تاپ نابودشان می‌کرد.

اگر روی پنلِ سایت لایو چیزی ویرایش کرده‌ای که می‌خواهی نگه داری، اول همان‌جا
`db:export` بگیر (با `DATABASE_URL` سرور) وگرنه import بعدی رویش می‌نویسد.

فهرست دقیق جدول‌ها در `packages/db/prisma/content-models.ts` است.

## ۱) ساخت ایمیج‌ها (GitHub Actions)

با هر push به `main`، ورک‌فلو `.github/workflows/build.yml` خودکار اجرا
می‌شه. برای اجرای دستی (بدون push)، از تب **Actions** مخزن، ورک‌فلوی
**Build images** رو باز کن و **Run workflow** رو بزن.

بعد از تمومشدن run (روی هر ماشینی که به github.com دسترسی داره — لپ‌تاپت
هم کافیه):

1. وارد صفحه‌ی همون run بشو (تب Actions).
2. پایین صفحه، بخش **Artifacts**، فایل `rahyad-images` رو دانلود کن —
   یک zip حاوی `rahyad-images.tar.gz` هست.
3. اکسترکتش کن (`unzip rahyad-images.zip`).

این فایل هر سه ایمیجی که لازمه (`rahyad-app`, `rahyad-migrate`,
`postgres:16-alpine`) رو داره — نیازی به docker/build محلی یا لاگین به هیچ
registry‌ای نیست.

## ۲) انتقال به سرور

`docker-compose.yml` و `.env.example` توی artifact نیستن (فقط ایمیج‌ها)،
پس از خود مخزن بگیرشون — روی همون ماشینی که artifact رو دانلود کردی:

```bash
curl -O https://raw.githubusercontent.com/SiRMHS/Silom/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/SiRMHS/Silom/main/.env.example
```

بعد همه رو با هم منتقل کن (نیازی به کل مخزن روی سرور نیست):

```bash
scp rahyad-images.tar.gz docker-compose.yml .env.example user@SERVER_IP:/opt/rahyad/
```

## ۳) روی سرور

```bash
ssh user@SERVER_IP
cd /opt/rahyad

docker load -i rahyad-images.tar.gz

cp .env.example .env
nano .env   # POSTGRES_PASSWORD و AUTH_SECRET رو با مقادیر واقعی پر کن
            # (openssl rand -base64 32)

docker compose up -d db
docker compose run --rm migrate
docker compose up -d app
```

چک کن بالاست:

```bash
docker compose logs -f app
curl -I http://127.0.0.1:3000
```

## ۴) وصل کردن به وب‌سروری که همین الان سایت دیگه رو سرو می‌کنه

یک server block جدید (برای دامنه‌ی این پروژه) به تنظیمات همون nginx/وب‌سرور
موجود اضافه کن که به `127.0.0.1:3000` پراکسی کنه — نمونه‌ی nginx (اگه پنل
دیگه‌ای مثل Plesk/cPanel داری، مفهوم یکیه، فقط از رابط خودش اضافه کن):

```nginx
server {
    listen 443 ssl;
    server_name rahyad.com www.rahyad.com;

    # گواهی SSL موجودت رو اینجا بده — همونی که الان جدا مدیریتش می‌کنی
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

بعد از اضافه‌کردن، config رو تست و reload کن (بدون داون‌تایم سایت دیگه):

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## دیپلوی‌های بعدی (وقتی کد یا محتوا عوض می‌شه)

اول `npm run db:export` و commit (مرحله‌ی ۰) اگر محتوا عوض شده. بعد push به
`main` خودش ورک‌فلو رو اجرا می‌کنه و artifact تازه می‌سازه — فقط دوباره
دانلودش کن (مرحله‌ی ۱)، دوباره `scp` (مرحله‌ی ۲)، و روی سرور:

```bash
docker load -i rahyad-images.tar.gz
docker compose run --rm migrate
docker compose up -d app
```

`migrate` هم مایگریشن‌های جدید رو اعمال می‌کنه و هم اسنپ‌شات محتوا رو
می‌نویسه، پس همین سه خط برای «کد جدید + محتوای جدید» کافیه.

## نکات

- **آپلودها**: فایل‌های آپلودی پنل ادمین روی volume داکر به اسم `uploads`
  نگه داشته می‌شوند (`docker volume inspect rahyad_uploads`)، پس با هر
  دیپلوی از بین نمی‌روند.
- **بکاپ دیتابیس**: `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
  قبل از اولین `docker compose run --rm migrate` روی سروری که از قبل محتوا
  دارد، این را بگیر — import محتوای سرور را با اسنپ‌شات جایگزین می‌کند.
- **تصویرها**: `Media` فقط مسیر فایل را نگه می‌دارد، نه خود فایل را. اگر
  عکسی در پنل لوکال آپلود کردی، فایلش در `apps/web/public/uploads` هم باید
  commit بشود وگرنه روی سایت لایو شکسته نمایش داده می‌شود. `db:export` خودش
  هشدار می‌دهد اگر ردیفی به فایل commit‌نشده اشاره کند.
- **دامنه و سئو**: نشانی کامل سایت در پنل ادمین، بخش تنظیمات → SEO، کلید
  «نشانی کامل سایت» تنظیم می‌شود؛ `sitemap.xml`، `robots.txt` و لینک‌های
  canonical همه از همان ساخته می‌شوند. بعد از عوض کردنش `db:export` و push
  یادت نرود. برای بستن موقت سایت روی موتورهای جست‌وجو، کلید «اجازه‌ی
  نمایه‌سازی» را ۰ کن.
- **لاگ‌ها**: `docker compose logs -f app` یا `db`.
- **پورت اشغال**: اگه `127.0.0.1:3000` هم قبلاً جایی استفاده شده، توی
  `docker-compose.yml` جلوی `ports:` سرویس `app` عددش رو عوض کن (مثلاً
  `3001`) و همون رو توی server block بالا هم بذار.
