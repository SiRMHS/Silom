# دیپلوی روی سرور لینوکسی

استک: Postgres + اپ Next.js (`output: "standalone"`) + nginx (پراکسی و TLS) + certbot،
همه با Docker Compose. با هر push به `main`، ورک‌فلو دو job داره: `build`
(روی runner ابری خود گیت‌هاب) image‌های `app` و `migrate` رو می‌سازه و به
GHCR push می‌کنه، بعد `deploy` (روی یک self-hosted runner که خود سرور نصب
می‌شود) همون image‌ها رو pull می‌کنه، migration می‌زنه و بالا می‌آره —
نیازی به SSH از GitHub به سرور نیست.

## پیش‌نیاز: DNS

رکورد A دامنه‌ی `rahyad.com` و `www.rahyad.com` را به IP سرور اشاره بده. قبل
از گرفتن گواهی SSL باید هر دو resolve شده باشند.

## ۱) آماده‌سازی سرور (یک‌بار)

روی سرور اوبونتو/دبیان (کاربر با دسترسی sudo):

```bash
# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# اینجا از سیستم خارج و دوباره وارد شو تا عضویت گروه docker اعمال شود

# فایروال
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# شبکه‌ی مشترک بین سرویس‌ها؛ ساخت app image هم به همین شبکه وصل می‌شود تا
# در زمان build به دیتابیس دسترسی داشته باشد (next build از دیتابیس واقعی
# محتوا می‌خواند — ببین Dockerfile)
docker network create rahyad_net
```

مخزن را در یک مسیر ثابت clone کن — همین مسیر بعداً working directory کارگاه
(runner) هم می‌شود:

```bash
sudo mkdir -p /opt/rahyad && sudo chown "$USER" /opt/rahyad
git clone https://github.com/SiRMHS/Silom.git /opt/rahyad
cd /opt/rahyad
```

## ۲) متغیرهای محیطی

```bash
cp .env.example .env
# رمز دیتابیس و AUTH_SECRET رو با مقادیر واقعی و تصادفی پر کن:
#   openssl rand -base64 32
nano .env
```

این `.env` فقط روی سرور می‌ماند (در `.gitignore` است) و docker-compose خودکار
آن را می‌خواند.

## ۳) نصب self-hosted runner

از GitHub: **Settings → Actions → Runners → New self-hosted runner** (روی
مخزن `SiRMHS/Silom`)، سیستم‌عامل Linux را انتخاب کن. دستورهایی که GitHub نشان
می‌دهد را همان‌جا، داخل `/opt/rahyad` اجرا کن — چیزی شبیه:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-x64-X.Y.Z.tar.gz
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/SiRMHS/Silom --token <TOKEN_FROM_GITHUB>

# به‌عنوان سرویس systemd نصبش کن تا بعد از ریبوت سرور هم بالا بیاید
sudo ./svc.sh install
sudo ./svc.sh start
```

runner با لیبل پیش‌فرض `self-hosted` ثبت می‌شود که با
`.github/workflows/deploy.yml` (که `runs-on: [self-hosted, linux]` دارد)
مطابقت دارد.

⚠️ کاربری که runner با آن اجرا می‌شود باید عضو گروه `docker` باشد (مرحله‌ی
۱) وگرنه دستورهای `docker compose` در workflow با خطای permission شکست
می‌خورند.

## ۴) اولین دیپلوی دستی

`app` و `migrate` توی GitHub Actions ساخته و به GHCR (`ghcr.io`) push
می‌شوند (job به اسم `build` توی `.github/workflows/deploy.yml`) — پس قبل از
هر چیز یک بار به `main` push کن (یا از تب Actions، **Run workflow** رو بزن)
تا این image‌ها ساخته بشن. همون اجرا سعی می‌کنه `nginx` رو هم بالا بیاره که
چون هنوز گواهی SSL نداریم شکست می‌خوره — طبیعیه، مرحله‌ی `deploy` تا همون‌جا
(`db`, `migrate`, `app`) انجام شده و کافیه.

بعد، یک بار دستی از `/opt/rahyad` این‌ها رو اجرا کن تا گواهی SSL گرفته بشه:

```bash
# اگه package روی GHCR رو public نکردی، برای pull دستی (خارج از Actions)
# با یک token با scope حداقل read:packages لاگین کن:
#   echo $GHCR_TOKEN | docker login ghcr.io -u <github-username> --password-stdin
docker compose up -d db
docker compose pull migrate app
docker compose run --rm migrate
docker compose up -d app

./scripts/init-letsencrypt.sh
```

اسکریپت آخر یک گواهی موقت می‌سازه، nginx رو بالا می‌آره، گواهی واقعی رو از
Let's Encrypt می‌گیره، nginx رو reload می‌کنه و سرویس تمدید خودکار
(`certbot`) رو استارت می‌کنه.

سایت باید الان روی `https://rahyad.com` بالا باشه.

## ۵) دیپلوی‌های بعدی

خودکار: هر push به `main` باعث می‌شه `.github/workflows/deploy.yml` اجرا
بشه — اول `build` (ابری) image‌های تازه رو به GHCR می‌سازه و push می‌کنه،
بعد `deploy` (self-hosted، روی سرور) اون‌ها رو pull می‌کنه، migration
می‌زنه و `docker compose up -d` می‌کنه. برای اجرای دستی همون workflow
(بدون push)، از تب Actions مخزن گزینه‌ی **Run workflow** رو بزن (چون
`workflow_dispatch` هم فعاله).

## نکات

- **آپلودها**: فایل‌های آپلودی پنل ادمین روی volume داکر به اسم `uploads`
  نگه داشته می‌شوند (`docker volume inspect rahyad_uploads`)، پس با هر
  دیپلوی از بین نمی‌روند.
- **بکاپ دیتابیس**: `docker compose exec db pg_dump -U $POSTGRES_USER $POSTGRES_DB > backup.sql`
- **لاگ‌ها**: `docker compose logs -f app` یا `nginx` یا `db`.
- **تمدید گواهی**: خودکار است (سرویس `certbot` هر ۱۲ ساعت `certbot renew`
  می‌زند)، نیازی به کار دستی نیست.
