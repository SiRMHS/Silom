/**
 * Seeds the database with the content that was previously hardcoded in the
 * components. Safe to re-run: every row is upserted on a stable key, so an
 * edit made in the admin panel is only overwritten if the key still matches.
 *
 *   npm run db:seed
 */

import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  HeadlineGroup,
  RailSide,
  Role,
  SettingGroup,
  SettingKind,
  WordEmphasis,
} from "../src/generated/prisma/enums";
import { hashPassword } from "../src/password";
import { PROJECTS as PROJECT_SOURCE } from "./seed-projects";

// The repo-root .env is shared by every workspace, so it is loaded by path
// rather than from the current working directory.
loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// ─────────────────────────────────────────── one-off strings

type SeedSetting = {
  key: string;
  value: string;
  group: SettingGroup;
  label: string;
  kind?: SettingKind;
  hint?: string;
};

const SETTINGS: SeedSetting[] = [
  // GENERAL
  { key: "brand.wordmark", value: "رهیــــاد", group: "GENERAL", label: "نشان‌واره (کشیده)", hint: "همان که در هدر بالای صفحه دیده می‌شود" },
  { key: "brand.name", value: "رهیاد", group: "GENERAL", label: "نام برند", hint: "شکل ساده، بدون کشیدگی" },

  // SEO — site-wide. `seo.site.url` is what every absolute URL in the head is
  // built from (canonical links, og:image, sitemap.xml, robots.txt), so it has
  // to be the real public origin or social previews resolve against nothing.
  { key: "seo.site.url", value: "https://rahyad.com", group: "SEO", kind: "URL", label: "نشانی کامل سایت", hint: "با https و بدون اسلش پایانی — مبنای لینک‌های canonical، sitemap و تصویر اشتراک‌گذاری" },
  { key: "seo.site.name", value: "رهیــــاد", group: "SEO", label: "نام سایت", hint: "چیزی که کنار عنوان صفحه در نتایج گوگل و شبکه‌های اجتماعی دیده می‌شود" },
  { key: "seo.keywords", value: "آژانس خلاقیت, طراحی برند, هویت بصری, طراحی وب, تولید محتوا, رهیاد", group: "SEO", kind: "TEXTAREA", label: "کلیدواژه‌ها", hint: "با ویرگول جدا کنید" },
  { key: "seo.og.image", value: "", group: "SEO", kind: "URL", label: "تصویر اشتراک‌گذاری (اختیاری)", hint: "خالی بگذارید تا تصویر پیش‌فرض سایت استفاده شود؛ اندازه‌ی پیشنهادی ۱۲۰۰×۶۳۰" },
  { key: "seo.verification.google", value: "", group: "SEO", label: "کد تأیید Google Search Console", hint: "فقط مقدار content تگ meta — بدون خود تگ" },
  { key: "seo.robots.indexable", value: "1", group: "SEO", label: "اجازه‌ی نمایه‌سازی موتورهای جست‌وجو", hint: "۱ یعنی سایت ایندکس شود، ۰ یعنی کل سایت از نتایج بیرون بماند (برای پیش از راه‌اندازی)" },
  { key: "seo.organization.type", value: "Organization", group: "SEO", label: "نوع سازمان در داده‌ی ساختاریافته", hint: "مثلاً Organization یا ProfessionalService — گوگل از این برای نمایش کارت سازمان استفاده می‌کند" },

  // SEO — per page
  { key: "seo.home.title", value: "رهیــــاد | آژانس خلاقیت", group: "SEO", label: "عنوان صفحه‌ی اصلی" },
  { key: "seo.home.description", value: "آژانس خلاقیت رهیاد — طراحی و هنر دیجیتال", group: "SEO", label: "توضیح صفحه‌ی اصلی", kind: "TEXTAREA" },
  { key: "seo.projects.title", value: "پروژه‌ها | رهیــــاد", group: "SEO", label: "عنوان صفحه‌ی پروژه‌ها" },
  { key: "seo.projects.description", value: "پروژه‌های آژانس خلاقیت رهیاد", group: "SEO", label: "توضیح صفحه‌ی پروژه‌ها", kind: "TEXTAREA" },
  { key: "seo.magazine.title", value: "مجله | رهیــــاد", group: "SEO", label: "عنوان صفحه‌ی مجله" },
  { key: "seo.magazine.description", value: "نوشته‌ها و یادداشت‌های تیم رهیاد درباره‌ی طراحی و برند", group: "SEO", label: "توضیح صفحه‌ی مجله", kind: "TEXTAREA" },
  { key: "seo.services.title", value: "خدمات | رهیــــاد", group: "SEO", label: "عنوان صفحه‌ی خدمات" },
  { key: "seo.services.description", value: "خدمات آژانس خلاقیت رهیاد — از هویت برند و طراحی وب تا تولید محتوا و استراتژی رشد.", group: "SEO", label: "توضیح صفحه‌ی خدمات", kind: "TEXTAREA" },
  { key: "seo.contact.title", value: "تماس با ما | رهیــــاد", group: "SEO", label: "عنوان صفحه‌ی تماس" },
  { key: "seo.contact.description", value: "با تیم رهیاد در تماس باشید — فرم تماس، نشانی استودیو و معرفی اعضای تیم.", group: "SEO", label: "توضیح صفحه‌ی تماس", kind: "TEXTAREA" },
  { key: "seo.team.title", value: "تیم ما | رهیــــاد", group: "SEO", label: "عنوان صفحه‌ی تیم" },
  { key: "seo.team.description", value: "استودیوی رهیاد — مشتریان، توانمندی‌ها و آدم‌هایی که کار را انجام می‌دهند.", group: "SEO", label: "توضیح صفحه‌ی تیم", kind: "TEXTAREA" },

  // MANIFESTO
  { key: "manifesto.eyebrow", value: "رهیاد — آژانس خلاقیت", group: "MANIFESTO", label: "تیتر کوچک بالای بخش" },
  {
    key: "manifesto.lede",
    value:
      "رهیاد یک استودیوی خلاقیت است؛ جایی که استراتژی، طراحی و روایت کنار هم می‌نشینند تا هر برند صدای خودش را پیدا کند. از هویت بصری تا تجربه‌ی دیجیتال، هر پروژه را مثل یک اثر می‌سازیم — نه یک سفارش.",
    group: "MANIFESTO",
    label: "متن معرفی",
    kind: "TEXTAREA",
  },

  // SERVICES — بخش صفحه‌ی اصلی
  { key: "services.eyebrow", value: "چه کاری انجام می‌دهیم", group: "SERVICES", label: "تیتر کوچک" },
  { key: "services.heading", value: "خدمات", group: "SERVICES", label: "عنوان بخش" },
  { key: "services.linkLabel", value: "همه‌ی خدمات", group: "SERVICES", label: "متن لینک فهرست خدمات" },
  { key: "services.linkHref", value: "/services", group: "SERVICES", kind: "URL", label: "مقصد لینک فهرست خدمات" },
  { key: "services.rowCta", value: "جزئیات بیشتر", group: "SERVICES", label: "متن لینک داخل ردیف باز‌شده" },

  // SERVICES — صفحه‌ی فهرست خدمات
  // این صفحه حالا یک نمایش تمام‌صفحه است، نه فهرست: هر خدمت یک اسلاید است و
  // متن‌های صفحه به همین چند مورد خلاصه می‌شود.
  { key: "services.page.title", value: "خدماتی که ارائه می‌دهیم", group: "SERVICES", label: "عنوان صفحه‌ی خدمات" },
  { key: "services.page.cardCta", value: "دیدن خدمت", group: "SERVICES", label: "متن باز‌کردن خدمت روی اسلاید" },
  { key: "services.page.cue", value: "بچرخانید", group: "SERVICES", label: "راهنمای حرکت روی اسلایدها" },
  { key: "services.page.empty", value: "هنوز خدمتی منتشر نشده است.", group: "SERVICES", label: "متن فهرست خالی" },

  // SERVICES — صفحه‌ی هر خدمت
  { key: "services.jump.back", value: "همه‌ی خدمات", group: "SERVICES", label: "نوار میان‌بر: بازگشت به فهرست" },
  { key: "services.jump.about", value: "توضیحات", group: "SERVICES", label: "نوار میان‌بر: توضیحات" },
  { key: "services.jump.gallery", value: "گالری", group: "SERVICES", label: "نوار میان‌بر: گالری" },
  { key: "services.jump.work", value: "نمونه‌کارها", group: "SERVICES", label: "نوار میان‌بر: نمونه‌کارها" },
  { key: "services.jump.faq", value: "سوالات", group: "SERVICES", label: "نوار میان‌بر: سوالات" },
  { key: "services.jump.order", value: "ثبت سفارش", group: "SERVICES", label: "نوار میان‌بر: دکمه‌ی سفارش" },
  { key: "services.filmCaption", value: "ویدیوی معرفی", group: "SERVICES", label: "زیرنویس ویدیو" },
  { key: "services.work.title", value: "نمونه‌کارهای این خدمت", group: "SERVICES", label: "عنوان بخش نمونه‌کارها" },
  {
    key: "services.work.note",
    value: "پروژه‌هایی که همین خدمت را گرفته‌اند — هر کارت، صفحه‌ی کامل خودش را باز می‌کند.",
    group: "SERVICES",
    label: "توضیح بخش ",
    kind: "TEXTAREA",
  },
  {
    key: "services.work.empty",
    value: "هنوز پروژه‌ای از این خدمت منتشر نشده است. اولینش می‌تواند مال شما باشد.",
    group: "SERVICES",
    label: "متن نبودِ نمونه‌کار",
    kind: "TEXTAREA",
    hint: "پروژه‌ها از صفحه‌ی ویرایش هر پروژه به خدمت وصل می‌شوند",
  },
  { key: "services.order.heading", value: "سفارش این خدمت", group: "SERVICES", label: "عنوان بخش فرم سفارش" },
  {
    key: "services.order.note",
    value: "فرم را پر کنید؛ هرچه درباره‌ی کارتان بنویسید، جواب اول‌مان دقیق‌تر خواهد بود.",
    group: "SERVICES",
    label: "توضیح پیش‌فرض بالای فرم سفارش",
    kind: "TEXTAREA",
    hint: "هر خدمت می‌تواند متن خودش را داشته باشد؛ این متن وقتی استفاده می‌شود که آنجا خالی باشد",
  },
  { key: "services.order.subjectPrefix", value: "سفارش", group: "SERVICES", label: "پیشوند موضوع پیام", hint: "موضوع پیام به شکل «سفارش: نام خدمت» از پیش پر می‌شود" },
  { key: "services.others.title", value: "خدمات دیگر", group: "SERVICES", label: "عنوان فهرست خدمات دیگر" },

  // WORK
  { key: "work.eyebrow", value: "نمونه‌کار", group: "WORK", label: "تیتر کوچک" },
  { key: "work.heading", value: "کارهای منتخب", group: "WORK", label: "عنوان بخش" },
  { key: "work.linkLabel", value: "همه‌ی پروژه‌ها", group: "WORK", label: "متن لینک همه‌ی پروژه‌ها" },
  { key: "work.linkHref", value: "/projects", group: "WORK", label: "مقصد لینک همه‌ی پروژه‌ها", kind: "URL" },
  { key: "work.cardCta", value: "مشاهده", group: "WORK", label: "متن روی کارت هنگام هاور" },
  {
    key: "work.featuredCount",
    value: "3",
    group: "WORK",
    kind: "NUMBER",
    label: "چند پروژه در صفحه‌ی اصلی",
    hint: "کارت‌های این بخش از ابتدای فهرست پروژه‌ها برداشته می‌شوند",
  },

  // TEAM
  { key: "team.eyebrow", value: "آدم‌ها", group: "TEAM", label: "تیتر کوچک" },
  { key: "team.heading", value: "تیم ما", group: "TEAM", label: "عنوان بخش" },
  {
    key: "team.note",
    value: "یک استودیوی کوچک و ثابت — همان‌هایی که پروژه را می‌گیرند، تحویلش هم می‌دهند.",
    group: "TEAM",
    label: "توضیح کنار عنوان",
    kind: "TEXTAREA",
  },
  // TEAM — صفحه‌ی مستقل /team، با تیتر و مقدمه‌ی خودش.
  { key: "team.hub.eyebrow", value: "استودیو", group: "TEAM", label: "تیتر کوچک صفحه‌ی تیم" },
  {
    key: "team.hub.title",
    value: "راهبرد، طراحی و ساخت — زیر یک سقف",
    group: "TEAM",
    label: "عنوان صفحه‌ی تیم",
  },
  {
    key: "team.hub.intro",
    value:
      "استودیویی مستقل که روی ایده، سیستم و اجرا با هم کار می‌کند. آنچه پایین می‌آید همان چیزی است که تحویل می‌دهیم و همان کسانی که تحویلش می‌دهند.",
    group: "TEAM",
    label: "مقدمه‌ی صفحه‌ی تیم",
    kind: "TEXTAREA",
  },
  { key: "team.hub.clientsTitle", value: "مشتریان منتخب", group: "TEAM", label: "عنوان بخش لوگوها در صفحه‌ی تیم" },
  { key: "team.hub.capabilitiesTitle", value: "توانمندی‌ها", group: "TEAM", label: "عنوان بخش توانمندی‌ها" },
  { key: "team.hub.statsTitle", value: "در یک نگاه", group: "TEAM", label: "عنوان بخش آمار در صفحه‌ی تیم" },
  {
    key: "team.hub.statsNote",
    value: "هیچ‌کدام از این عددها یک‌شبه جمع نشده‌اند؛ هرکدام یک قدم است که با مسئله‌ی واقعی و آدم واقعی برداشته شده.",
    group: "TEAM",
    label: "توضیح کنار آمار",
    kind: "TEXTAREA",
  },
  { key: "team.hub.rosterTitle", value: "تیم ما", group: "TEAM", label: "برچسب کنار جدول تیم" },
  { key: "team.hub.colName", value: "نام", group: "TEAM", label: "سرستون نام" },
  { key: "team.hub.colRole", value: "سمت", group: "TEAM", label: "سرستون سمت" },
  { key: "team.hub.colLocation", value: "شهر", group: "TEAM", label: "سرستون شهر" },
  { key: "team.hub.ctaEyebrow", value: "همکاری", group: "TEAM", label: "تیتر کوچک دعوت پایان صفحه‌ی تیم" },
  {
    key: "team.hub.ctaTitle",
    value: "برای کار در سطح جهانی، آدم‌های سطح جهانی می‌خواهیم.",
    group: "TEAM",
    label: "عنوان دعوت پایان صفحه‌ی تیم",
  },
  {
    key: "team.hub.ctaNote",
    value:
      "هم عمومی‌کار می‌خواهیم هم متخصص، با پیشینه‌ها و نگاه‌های متفاوت. اگر جایگاهی که به شما بخورد اینجا نیست، باز هم بنویسید و بگویید چه چیزی به تیم اضافه می‌کنید.",
    group: "TEAM",
    label: "توضیح دعوت پایان صفحه‌ی تیم",
    kind: "TEXTAREA",
  },
  { key: "team.hub.ctaLabel", value: "برای‌مان بنویسید", group: "TEAM", label: "متن دکمه‌ی دعوت" },
  { key: "team.hub.ctaHref", value: "/contact", group: "TEAM", label: "مقصد دکمه‌ی دعوت", kind: "URL" },
  { key: "team.hub.sayTitle", value: "حرف مشتری‌ها", group: "TEAM", label: "عنوان بخش نقل‌قول‌ها" },
  { key: "team.hub.sayLead", value: "مشتری‌ها چه می‌گویند:", group: "TEAM", label: "خط بالای نقل‌قول‌ها" },
  { key: "team.hub.sayPrev", value: "قبلی", group: "TEAM", label: "دکمه‌ی نقل‌قول قبلی" },
  { key: "team.hub.sayNext", value: "بعدی", group: "TEAM", label: "دکمه‌ی نقل‌قول بعدی" },

  // LOGOS
  { key: "logos.title", value: "برندهایی که با ما کار کرده‌اند", group: "LOGOS", label: "عنوان بخش همکاران" },

  // CONTACT
  { key: "contact.srLabel", value: "ایمیل یا شماره موبایل شما", group: "CONTACT", label: "برچسب فیلد (برای صفحه‌خوان)" },
  { key: "contact.placeholder", value: "you@company.com", group: "CONTACT", label: "متن راهنمای داخل فیلد", hint: "لاتین بماند؛ متن فارسی داخل فیلد LTR به‌هم می‌ریزد" },
  { key: "contact.hint", value: "ایمیل یا شماره موبایل‌تان را بنویسید و اینتر بزنید ↵", group: "CONTACT", label: "راهنمای زیر فیلد" },
  { key: "contact.invalid", value: "ایمیل یا شماره‌ی موبایل معتبر نیست", group: "CONTACT", label: "پیام خطای اعتبارسنجی" },
  { key: "contact.doneTitle", value: "پیام‌تان رسید.", group: "CONTACT", label: "پیام موفقیت" },
  { key: "contact.doneHint", value: "به‌زودی جواب می‌دهیم.", group: "CONTACT", label: "زیرنویس پیام موفقیت" },

  // CONTACT — صفحه‌ی تماس
  { key: "contact.page.eyebrow", value: "تماس با ما", group: "CONTACT", label: "تیتر کوچک صفحه‌ی تماس" },
  { key: "contact.page.title", value: "بیایید درباره‌ی کارتان حرف بزنیم", group: "CONTACT", label: "عنوان صفحه‌ی تماس" },
  {
    key: "contact.page.intro",
    value:
      "چه پروژه‌ی مشخصی داشته باشید و چه فقط ایده‌ای که هنوز شکل نگرفته، بنویسید. جواب هر پیام را خودمان می‌دهیم، نه یک پاسخ خودکار.",
    group: "CONTACT",
    label: "توضیح زیر عنوان صفحه‌ی تماس",
    kind: "TEXTAREA",
  },
  { key: "contact.page.directTitle", value: "یا مستقیم", group: "CONTACT", label: "عنوان ستون راه‌های تماس" },

  // CONTACT — راه‌های تماس (هرکدام خالی بماند، در صفحه نمایش داده نمی‌شود)
  { key: "contact.emailLabel", value: "ایمیل", group: "CONTACT", label: "برچسب ایمیل" },
  { key: "contact.email", value: "hello@rahyad.ir", group: "CONTACT", label: "ایمیل استودیو", hint: "خالی بگذارید تا این ردیف در صفحه نیاید" },
  { key: "contact.phoneLabel", value: "تلفن", group: "CONTACT", label: "برچسب تلفن" },
  { key: "contact.phone", value: "021 9100 2233", group: "CONTACT", label: "شماره‌ی تماس", hint: "با رقم لاتین بنویسید؛ سایت خودش فارسی نمایش می‌دهد" },
  { key: "contact.addressLabel", value: "نشانی", group: "CONTACT", label: "برچسب نشانی" },
  {
    key: "contact.address",
    value: "تهران، خیابان ولیعصر، کوچه‌ی نهم، پلاک ۲۴، طبقه‌ی سوم",
    group: "CONTACT",
    label: "نشانی استودیو",
    kind: "TEXTAREA",
  },
  { key: "contact.hoursLabel", value: "ساعت کاری", group: "CONTACT", label: "برچسب ساعت کاری" },
  { key: "contact.hours", value: "شنبه تا چهارشنبه، ۹ تا ۱۸", group: "CONTACT", label: "ساعت کاری" },
  { key: "contact.socialLabel", value: "شبکه‌ها", group: "CONTACT", label: "برچسب شبکه‌های اجتماعی" },
  { key: "contact.social.instagram", value: "https://instagram.com/", group: "CONTACT", kind: "URL", label: "اینستاگرام", hint: "خالی بگذارید تا این دکمه در صفحه نیاید" },
  { key: "contact.social.linkedin", value: "", group: "CONTACT", kind: "URL", label: "لینکدین", hint: "خالی بگذارید تا این دکمه در صفحه نیاید" },
  { key: "contact.social.behance", value: "", group: "CONTACT", kind: "URL", label: "بی‌هنس", hint: "خالی بگذارید تا این دکمه در صفحه نیاید" },

  // GENERAL — دکمه‌ی ثابت هدر
  { key: "nav.cta.label", value: "در تماس باشیم", group: "GENERAL", label: "متن دکمه‌ی بالای صفحه", hint: "روی همه‌ی صفحه‌ها، گوشه‌ی بالا-چپ. خالی بگذارید تا دکمه اصلاً نیاید." },
  { key: "nav.cta.href", value: "/contact", group: "GENERAL", kind: "URL", label: "مقصد دکمه‌ی بالای صفحه" },

  // CONTACT — فرم صفحه‌ی تماس
  { key: "contact.form.title", value: "پروژه‌ای در ذهن دارید؟", group: "CONTACT", label: "عنوان فرم" },
  {
    key: "contact.form.note",
    value: "فرم را پر کنید؛ هرچه درباره‌ی پروژه بنویسید، جواب اول‌مان دقیق‌تر خواهد بود.",
    group: "CONTACT",
    label: "توضیح بالای فرم",
    kind: "TEXTAREA",
  },
  { key: "contact.form.name", value: "شما را چه صدا کنیم؟", group: "CONTACT", label: "برچسب فیلد نام" },
  { key: "contact.form.namePlaceholder", value: "نام‌تان را بنویسید", group: "CONTACT", label: "راهنمای داخل فیلد نام" },
  { key: "contact.form.contact", value: "کجا جواب‌تان را بفرستیم؟", group: "CONTACT", label: "برچسب فیلد تماس" },
  { key: "contact.form.phone", value: "بهترین شماره برای تماس؟", group: "CONTACT", label: "برچسب فیلد شماره" },
  { key: "contact.form.phonePlaceholder", value: "۰۹۱۲ ۰۰۰ ۰۰۰۰", group: "CONTACT", label: "راهنمای داخل فیلد شماره" },
  { key: "contact.form.referrer", value: "چطور ما را پیدا کردید؟", group: "CONTACT", label: "برچسب «از کجا ما را شناختید»" },
  {
    key: "contact.form.referrers",
    value: "گوگل، اینستاگرام، لینکدین، معرفی دوستان، جستجوی اینترنتی، سایر",
    group: "CONTACT",
    label: "گزینه‌های «از کجا ما را شناختید»",
    kind: "TEXTAREA",
    hint: "با کاما جدا کنید؛ فرستنده یکی را انتخاب می‌کند",
  },
  { key: "contact.form.services", value: "به کدام خدمت‌ها نیاز دارید؟", group: "CONTACT", label: "برچسب انتخاب خدمات", hint: "خودِ گزینه‌ها از فهرست خدمات خوانده می‌شوند" },
  { key: "contact.form.budget", value: "بودجه‌ی پروژه چقدر است؟", group: "CONTACT", label: "برچسب بودجه" },
  {
    key: "contact.form.budgets",
    value: "تا ۵۰ میلیون تومان، ۵۰ تا ۱۵۰ میلیون تومان، ۱۵۰ تا ۳۰۰ میلیون تومان، بیش از ۳۰۰ میلیون تومان، هنوز نمی‌دانم",
    group: "CONTACT",
    label: "بازه‌های بودجه",
    kind: "TEXTAREA",
    hint: "با کاما جدا کنید",
  },
  { key: "contact.form.timeline", value: "چه زمانی باید تحویل شود؟", group: "CONTACT", label: "برچسب زمان تحویل" },
  {
    key: "contact.form.timelines",
    value: "تا یک ماه، یک تا سه ماه، سه تا شش ماه، تاریخ مشخصی ندارم",
    group: "CONTACT",
    label: "گزینه‌های زمان تحویل",
    kind: "TEXTAREA",
    hint: "با کاما جدا کنید",
  },
  { key: "contact.form.choose", value: "انتخاب کنید", group: "CONTACT", label: "متن گزینه‌ی خالی فهرست‌ها" },
  { key: "contact.form.subject", value: "موضوع", group: "CONTACT", label: "برچسب فیلد موضوع" },
  { key: "contact.form.subjectHint", value: "مثلاً: هویت بصری برای یک کافه", group: "CONTACT", label: "راهنمای داخل فیلد موضوع" },
  { key: "contact.form.optional", value: "اختیاری", group: "CONTACT", label: "نشانه‌ی فیلد اختیاری" },
  { key: "contact.form.message", value: "از پروژه‌تان بگویید", group: "CONTACT", label: "برچسب فیلد پیام" },
  { key: "contact.form.messagePlaceholder", value: "چه چیزی می‌سازید؟", group: "CONTACT", label: "راهنمای داخل فیلد پیام" },
  { key: "contact.form.submit", value: "ارسال پیام", group: "CONTACT", label: "متن دکمه‌ی ارسال" },
  { key: "contact.form.sending", value: "در حال ارسال…", group: "CONTACT", label: "متن دکمه هنگام ارسال" },
  { key: "contact.form.doneTitle", value: "پیام‌تان رسید.", group: "CONTACT", label: "عنوان پیام موفقیت فرم" },
  {
    key: "contact.form.doneHint",
    value: "معمولاً تا یک روز کاری جواب می‌دهیم. اگر عجله دارید، همان شماره‌ی بالا سریع‌ترین راه است.",
    group: "CONTACT",
    label: "زیرنویس پیام موفقیت فرم",
    kind: "TEXTAREA",
  },

  // FOOTER
  { key: "footer.location", value: "تهران، ایران", group: "FOOTER", label: "محل" },
  { key: "footer.copyright", value: "۱۴۰۴ — رهیاد", group: "FOOTER", label: "کپی‌رایت" },

  // BOOT
  { key: "boot.tuning", value: "در حال تنظیم آنتن…", group: "BOOT", label: "متن حین نویز اولیه" },
  { key: "boot.finalWord", value: "رهیاد", group: "BOOT", label: "کلمه‌ی پایانی", hint: "کلمه‌ای که بزرگ می‌شود و به هدر پرواز می‌کند" },

  // PROJECTS
  { key: "projects.hint", value: "برای گشتن بکشید", group: "PROJECTS", label: "راهنمای کشیدن بوم" },

  // MAGAZINE
  { key: "magazine.eyebrow", value: "مجله‌ی رهیاد", group: "MAGAZINE", label: "تیتر کوچک بالای صفحه" },
  { key: "magazine.title", value: "چیزهایی که یاد گرفته‌ایم", group: "MAGAZINE", label: "عنوان صفحه‌ی مجله" },
  {
    key: "magazine.intro",
    value: "یادداشت‌هایی درباره‌ی طراحی، برند و کارهایی که در راه ساختن‌شان چیزی فهمیدیم.",
    group: "MAGAZINE",
    label: "توضیح زیر عنوان",
    kind: "TEXTAREA",
  },
  { key: "magazine.empty", value: "هنوز نوشته‌ای منتشر نشده. به‌زودی.", group: "MAGAZINE", label: "متن وقتی نوشته‌ای نیست" },

  // A11Y
  { key: "a11y.skipToContent", value: "پرش به محتوا", group: "A11Y", label: "لینک پرش به محتوا" },
  { key: "a11y.mainHeading", value: "رهیــــاد — آژانس خلاقیت", group: "A11Y", label: "عنوان اصلی صفحه (پنهان)" },
  { key: "a11y.videoLabel", value: "ویدیوی رهیاد", group: "A11Y", label: "توضیح ویدیوی هیرو" },
  { key: "a11y.railNavLabel", value: "بخش‌های اصلی", group: "A11Y", label: "برچسب ناوبری کناری" },
  { key: "a11y.dockNavLabel", value: "ناوبری اصلی", group: "A11Y", label: "برچسب ناوبری پایین" },
  { key: "a11y.brandHome", value: "رهیــــاد — صفحه اصلی", group: "A11Y", label: "برچسب لینک نشان‌واره" },
];

// ─────────────────────────────────────────── collections

const HEADLINE_WORDS: { group: HeadlineGroup; text: string; emphasis: WordEmphasis }[] = [
  { group: "MANIFESTO", text: "برندها", emphasis: "NONE" },
  { group: "MANIFESTO", text: "را", emphasis: "NONE" },
  { group: "MANIFESTO", text: "از", emphasis: "NONE" },
  { group: "MANIFESTO", text: "دیده‌شدن", emphasis: "MARK" },
  { group: "MANIFESTO", text: "به", emphasis: "NONE" },
  { group: "MANIFESTO", text: "خاطر‌ماندن", emphasis: "MARK" },
  { group: "MANIFESTO", text: "می‌رسانیم.", emphasis: "NONE" },
  { group: "FOOTER", text: "بیایید", emphasis: "NONE" },
  { group: "FOOTER", text: "چیزی", emphasis: "NONE" },
  { group: "FOOTER", text: "بسازیم", emphasis: "NONE" },
  { group: "FOOTER", text: "که", emphasis: "NONE" },
  { group: "FOOTER", text: "یادش", emphasis: "BRAND" },
  { group: "FOOTER", text: "بماند.", emphasis: "BRAND" },
];

const STATS = [
  { value: 12, suffix: "+", label: "سال تجربه", accent: "#ef4444" },
  { value: 180, suffix: "+", label: "پروژه", accent: "#1d4ed8" },
  { value: 40, suffix: "+", label: "برند", accent: "#c2410c" },
  { value: 9, suffix: "", label: "جایزه", accent: "#0f766e" },
];

/**
 * The services, at both depths: the three lines the home page's accordion shows
 * and the copy its own landing page at /services/<slug> reads.
 *
 * `sections` is the same [{ h, p }] shape a case study uses, and `p` is stored
 * as the HTML the panel's editor produces — plain paragraphs here, which is
 * what someone rewriting them in the panel will see.
 */
const SERVICES = [
  {
    slug: "brand-identity",
    indexLabel: "۰۱",
    title: "هویت برند",
    body: "از نام و نشان تا سیستم بصری و لحن کلامی؛ هویتی که در هر نقطه‌ی تماس یکدست بماند.",
    tags: ["لوگو", "سیستم بصری", "کتابچه برند"],
    accent: "#ef4444",
    headline: "هویتی که همه‌جا خودش را می‌شناساند",
    excerpt:
      "برند شما فقط یک لوگو نیست؛ مجموعه‌ی تصمیم‌هایی است که هر بار مخاطب با شما روبه‌رو می‌شود تکرار می‌شوند. ما آن تصمیم‌ها را می‌گیریم و در یک سیستم می‌نویسیم تا تیم شما بتواند سال‌ها به آن تکیه کند.",
    ctaTitle: "برندتان را بسازیم؟",
    ctaNote:
      "بنویسید کجا ایستاده‌اید و کجا می‌خواهید برسید؛ در جواب اول می‌گوییم چه چیزی لازم است و چه چیزی نه.",
    sections: [
      {
        h: "چه کاری انجام می‌دهیم",
        p: "<p>کار با یک جلسه‌ی کشف شروع می‌شود: کسب‌وکار، مخاطب، رقبا و آنچه امروز درست کار نمی‌کند. از آنجا به جایگاه برند، معماری نام و لحن کلامی می‌رسیم و بعد سراغ شکل می‌رویم — نشان، تایپوگرافی، رنگ، شبکه و زبان تصویری.</p><p>خروجی، یک فایل لوگو نیست؛ سیستمی است که در آن مشخص است هر عنصر کجا و چطور استفاده می‌شود.</p>",
      },
      {
        h: "چطور کار می‌کنیم",
        p: "<p>در سه مرحله: کشف و راهبرد، طراحی سیستم، و پیاده‌سازی. هر مرحله یک جلسه‌ی ارائه دارد و تا تأیید نگیریم به مرحله‌ی بعد نمی‌رویم.</p><p>یک پروژه‌ی هویت معمولاً شش تا ده هفته طول می‌کشد؛ اگر عجله دارید، می‌شود دامنه را کوچک‌تر کرد ولی مراحل را نه.</p>",
      },
      {
        h: "چه چیزی تحویل می‌گیرید",
        p: "<p>نشان در همه‌ی فرمت‌های لازم، سیستم تایپوگرافی و رنگ، الگوهای اقلام چاپی و دیجیتال، و کتابچه‌ی برند — با مثال‌های درست و نادرست، نه فقط چند صفحه‌ی تزئینی.</p><p>فایل‌های کاری هم مال شماست؛ چیزی گروگان نگه نمی‌داریم.</p>",
      },
    ],
    faqs: [
      {
        q: "یک پروژه‌ی هویت برند چقدر طول می‌کشد؟",
        a: "معمولاً شش تا ده هفته، بسته به دامنه‌ی کار و سرعت بازخوردها. زمان‌بندی دقیق را بعد از جلسه‌ی اول و روی دامنه‌ی مشخص می‌دهیم.",
      },
      {
        q: "فقط لوگو می‌خواهم؛ می‌شود؟",
        a: "می‌شود، ولی معمولاً پیشنهاد نمی‌کنیم. لوگویی که بدون سیستم تحویل داده شود، شش ماه بعد در دست چند نفر به چند شکل متفاوت استفاده می‌شود. اگر بودجه محدود است، بهتر است دامنه را کوچک کنیم تا کیفیت را.",
      },
      {
        q: "اگر از طرح‌ها خوشمان نیاید چه می‌شود؟",
        a: "هر مرحله جلسه‌ی ارائه و دور بازبینی خودش را دارد و پیش از تأیید جلو نمی‌رویم. چون کار از راهبرد شروع می‌شود، معمولاً اختلاف‌ها در همان مرحله‌ی اول حل می‌شود، نه روی رنگ لوگو.",
      },
    ],
  },
  {
    slug: "web-design",
    indexLabel: "۰۲",
    title: "طراحی و توسعه‌ی وب",
    body: "تجربه‌ی کاربری روشن، رابط دقیق و پیاده‌سازی سریع — سایتی که هم زیباست هم کار می‌کند.",
    tags: ["UX/UI", "Next.js", "بهینه‌سازی"],
    accent: "#1d4ed8",
    headline: "سایتی که سریع باز می‌شود و کارش را انجام می‌دهد",
    excerpt:
      "طراحی و پیاده‌سازی را یک تیم انجام می‌دهد، بنابراین چیزی که در طرح دیده‌اید همان چیزی است که بالا می‌آید — روی موبایل، روی اینترنت کند، و برای کسی که با صفحه‌خوان می‌گردد.",
    ctaTitle: "سایت تازه‌ای لازم دارید؟",
    ctaNote: "بنویسید سایت فعلی‌تان کجا کم می‌آورد؛ از همان‌جا شروع می‌کنیم.",
    sections: [
      {
        h: "چه کاری انجام می‌دهیم",
        p: "<p>از معماری اطلاعات و مسیر کاربر شروع می‌کنیم، به طراحی رابط می‌رسیم و خودمان پیاده‌اش می‌کنیم. سایت‌ها را با Next.js می‌سازیم و محتوایش را پشت یک پنل مدیریت می‌گذاریم تا تغییر یک جمله به یک انتشار تازه نیاز نداشته باشد.</p>",
      },
      {
        h: "سرعت و دسترس‌پذیری، نه به‌عنوان مرحله‌ی آخر",
        p: "<p>سرعت را جزئی از طراحی می‌دانیم: تصویرها، فونت‌ها و انیمیشن‌ها از همان ابتدا با بودجه‌ی مشخص انتخاب می‌شوند. کنتراست رنگ‌ها، کار با صفحه‌کلید و متن جایگزین تصویرها هم همین‌طور — چیزی که بعداً وصله شود، همان‌طور به نظر می‌رسد.</p>",
      },
      {
        h: "بعد از تحویل",
        p: "<p>پنل مدیریت را به تیم شما آموزش می‌دهیم و مستندش می‌کنیم. اگر بخواهید، نگهداری و بهبود تدریجی را هم به‌صورت ماهانه ادامه می‌دهیم؛ اگر نخواهید، سایت کاملاً دست خودتان است.</p>",
      },
    ],
    faqs: [
      {
        q: "سایت را با وردپرس می‌سازید؟",
        a: "معمولاً نه. سایت‌ها را با Next.js و یک پنل مدیریت اختصاصی می‌سازیم که فقط همان چیزهایی را دارد که شما ویرایش می‌کنید. نتیجه سریع‌تر و امن‌تر است و افزونه‌ای نیست که روزی از کار بیفتد.",
      },
      {
        q: "محتوای سایت را خودمان می‌توانیم عوض کنیم؟",
        a: "بله. متن‌ها، تصویرها، پروژه‌ها و مقاله‌ها همه از پنل قابل ویرایش‌اند و تغییرشان بلافاصله روی سایت می‌نشیند.",
      },
      {
        q: "هزینه‌ی نگهداری دارد؟",
        a: "هاست و دامنه هزینه‌ی خودشان را دارند. نگهداری از طرف ما اختیاری است؛ سایت بدون آن هم کار می‌کند.",
      },
    ],
  },
  {
    slug: "content-production",
    indexLabel: "۰۳",
    title: "تولید محتوا و ویدیو",
    body: "روایتی که دیده می‌شود؛ از ایده و استوری‌بورد تا موشن‌گرافیک و تدوین نهایی.",
    tags: ["موشن", "کمپین", "عکاسی"],
    accent: "#c2410c",
    headline: "محتوایی که تا آخرش تماشا می‌شود",
    excerpt:
      "ویدیو، موشن و عکس — از ایده و فیلم‌نامه تا تحویل نسخه‌های آماده‌ی هر پلتفرم. یک تیم، از تصمیم اول تا فایل آخر.",
    ctaTitle: "چیزی برای گفتن دارید؟",
    ctaNote: "بگویید چه چیزی را می‌خواهید نشان دهید و برای کجا؛ باقی‌اش با ما.",
    sections: [
      {
        h: "چه کاری انجام می‌دهیم",
        p: "<p>تیزر و ویدیوی معرفی، موشن‌گرافیک، عکاسی محصول و محتوای شبکه‌های اجتماعی. کار با یک ایده‌ی روشن و استوری‌بورد شروع می‌شود، نه با دوربین.</p>",
      },
      {
        h: "چطور کار می‌کنیم",
        p: "<p>پیش‌تولید (ایده، فیلم‌نامه، استوری‌بورد و برنامه‌ی تولید)، تولید، و پس‌تولید (تدوین، اصلاح رنگ، صدا و موشن). در هر مرحله نسخه‌ای برای بازبینی می‌بینید تا اصلاح‌ها زودتر و ارزان‌تر انجام شوند.</p>",
      },
      {
        h: "چه چیزی تحویل می‌گیرید",
        p: "<p>نسخه‌ی اصلی به‌علاوه‌ی برش‌های عمودی و مربع برای هر پلتفرم، با و بدون زیرنویس. فایل‌های خام هم در صورت درخواست تحویل داده می‌شوند.</p>",
      },
    ],
    faqs: [
      {
        q: "فیلم‌برداری در محل ما انجام می‌شود؟",
        a: "بله، هرجا که سوژه باشد — کارخانه، فروشگاه یا دفتر. اگر لوکیشن یا استودیو لازم باشد، در برنامه‌ی تولید می‌آید و از قبل هماهنگ می‌شود.",
      },
      {
        q: "یک ویدیوی معرفی چقدر طول می‌کشد؟",
        a: "معمولاً سه تا شش هفته از تأیید ایده تا تحویل نسخه‌ی نهایی؛ بخش عمده‌ی این زمان پیش‌تولید است، نه فیلم‌برداری.",
      },
      {
        q: "متن و روایت را هم شما می‌نویسید؟",
        a: "بله. نوشتن روایت بخشی از کار است، نه یک سفارش جدا.",
      },
    ],
  },
  {
    slug: "growth-strategy",
    indexLabel: "۰۴",
    title: "استراتژی و رشد",
    body: "پژوهش بازار، جایگاه‌یابی و برنامه‌ی رشد؛ تصمیم‌هایی که بر داده تکیه دارند.",
    tags: ["پژوهش", "پوزیشنینگ", "کمپین"],
    accent: "#0f766e",
    headline: "تصمیم‌هایی که بر داده تکیه دارند، نه بر سلیقه",
    excerpt:
      "پیش از آنکه چیزی طراحی شود، باید معلوم باشد برای چه کسی و چرا. پژوهش، جایگاه‌یابی و برنامه‌ی رشدی که بشود هفته‌به‌هفته اجرایش کرد.",
    ctaTitle: "از کجا شروع کنیم؟",
    ctaNote: "وضعیت امروزتان را بنویسید؛ در جواب اول می‌گوییم اول کدام تصمیم را باید گرفت.",
    sections: [
      {
        h: "چه کاری انجام می‌دهیم",
        p: "<p>پژوهش بازار و مخاطب، تحلیل رقبا، جایگاه‌یابی برند و برنامه‌ی کانال‌ها. خروجی یک سند تصمیم است: چه می‌گوییم، به چه کسی، از کدام کانال و با چه معیاری می‌سنجیم.</p>",
      },
      {
        h: "چطور می‌سنجیم",
        p: "<p>هر برنامه با چند شاخص مشخص شروع می‌شود و ماهانه بازبینی می‌شود. اگر عددی تکان نخورد، فرض‌مان را عوض می‌کنیم — نه گزارش را.</p>",
      },
    ],
    faqs: [
      {
        q: "بدون طراحی هم فقط استراتژی می‌گیرید؟",
        a: "بله. خیلی از پروژه‌ها با همین شروع می‌شوند و بخشی از آن‌ها اصلاً به بازطراحی نمی‌رسند، چون مسئله جای دیگری بوده است.",
      },
      {
        q: "اجرای کمپین هم با شماست؟",
        a: "اجرای خلاقیت و تولید محتوا بله؛ خرید رسانه را معمولاً با تیم خودتان یا آژانس رسانه‌ای هماهنگ می‌کنیم.",
      },
    ],
  },
];

/**
 * Which seeded case studies are an example of which service.
 *
 * Only a starting point: the links are edited per project in the panel, and
 * this map is applied additively, so a link removed there is not restored on
 * the next run.
 */
const SERVICE_PROJECTS: Record<string, string[]> = {
  "brand-identity": ["aban", "parsrad", "arian", "zaferankadeh"],
  "web-design": ["mehregan", "rahnama", "niloofar"],
  "content-production": ["shabtab", "nowruz"],
  "growth-strategy": ["nowruz", "parsrad"],
};

/**
 * `bio` and `focus` are only read by the /contact page's roster and `location`
 * only by the /team table; the home page's strip shows the name and role alone.
 */
const TEAM = [
  {
    name: "آرش نیک‌روش",
    role: "مدیر خلاقیت",
    monogram: "آ",
    accent: "#ef4444",
    location: "تهران",
    bio: "پانزده سال است که برندها را از حرف به شکل می‌رساند. جلسه‌ی اول هر پروژه با اوست و تا تحویل آخر هم می‌ماند.",
    focus: ["راهبرد خلاق", "هدایت پروژه", "روایت برند"],
  },
  {
    name: "سحر مرادی",
    role: "مدیر هنری",
    monogram: "س",
    accent: "#1d4ed8",
    location: "تهران",
    bio: "زبان بصری هر پروژه از دست او درمی‌آید؛ از شبکه و تایپوگرافی تا آخرین جزئیاتی که کسی آگاهانه نمی‌بیند ولی حس می‌کند.",
    focus: ["هویت بصری", "تایپوگرافی", "هنر تصویری"],
  },
  {
    name: "نیما رستمی",
    role: "سرپرست توسعه",
    monogram: "ن",
    accent: "#0f766e",
    location: "اصفهان",
    bio: "کاری می‌کند که طرح، روی گوشی و لپ‌تاپ و اینترنت کند هم همان‌قدر خوب باشد. سرعت سایت را جزئی از طراحی می‌داند، نه کاری بعد از آن.",
    focus: ["Next.js", "کارایی", "دسترس‌پذیری"],
  },
  {
    name: "الهام کاظمی",
    role: "استراتژیست برند",
    monogram: "ا",
    accent: "#c2410c",
    location: "شیراز",
    bio: "قبل از اینکه چیزی طراحی شود، می‌پرسد برای که و چرا. پژوهش و جایگاه‌یابی هر پروژه از این‌جا شروع می‌شود.",
    focus: ["پژوهش", "جایگاه‌یابی", "لحن کلامی"],
  },
];

/** The slider at the end of /team. Order here is the order they cycle in. */
const TESTIMONIALS = [
  {
    quote:
      "محصول نهایی دقیقاً همانی شد که انتظار داشتیم. روند ساخت از اول تا آخر دور خودِ ما می‌چرخید و آدم‌وار بود، و بعد از تحویل هم هر وقت سؤالی داشتیم جواب گرفتیم.",
    name: "پدرام منصوری",
    role: "هم‌بنیان‌گذار، نوروزمارکت — تهران",
  },
  {
    quote:
      "چیزی که بیشتر از همه برای‌مان ارزش داشت این بود که قبل از طراحی، وقت گذاشتند و کسب‌وکار ما را فهمیدند. نتیجه‌اش برندی شد که خودمان هم بهتر می‌شناسیمش.",
    name: "مریم شریفی",
    role: "مدیر بازاریابی، شب‌تاب — اصفهان",
  },
  {
    quote:
      "سایت را در موعدش تحویل دادند و سرعتش روی موبایل دو برابر چیزی شد که قبلاً داشتیم. سه ماه بعد هم نرخ تبدیل‌مان همان‌قدر بالا مانده.",
    name: "بهرام کیانی",
    role: "مدیرعامل، پارس‌راد — شیراز",
  },
  {
    quote:
      "با چند آژانس کار کرده بودیم و همیشه بین تیم فروش و تیم اجرا فاصله بود. این‌جا همان کسی که در جلسه‌ی اول نشسته بود، خودش کار را جلو برد.",
    name: "سپیده احمدی",
    role: "مدیر برند، آوند — تهران",
  },
];

const PARTNERS = [
  { name: "Vercel", weight: 700, spacing: "-0.04em", italic: false },
  { name: "Linear", weight: 600, spacing: "-0.02em", italic: false },
  { name: "STRAVA", weight: 900, spacing: "-0.01em", italic: false },
  { name: "Duolingo", weight: 800, spacing: "-0.03em", italic: false },
  { name: "FAIRE", weight: 400, spacing: "0.32em", italic: false },
  { name: "Notion", weight: 700, spacing: "-0.02em", italic: false },
  { name: "Figma", weight: 600, spacing: "-0.01em", italic: false },
  { name: "Canva", weight: 700, spacing: "-0.02em", italic: true },
  { name: "Descript", weight: 700, spacing: "-0.03em", italic: false },
  { name: "IDEO", weight: 800, spacing: "0.22em", italic: false },
  { name: "Clearbit", weight: 600, spacing: "-0.02em", italic: false },
  { name: "Loom", weight: 800, spacing: "-0.03em", italic: false },
];

/**
 * Projects come straight from src/lib/projects.ts — the list the case-study
 * pages were built against — so the database starts out identical to what the
 * site already renders.
 */
/** The source blocks are plain prose; the editor and the page both want HTML. */
const asHtml = (text: string) =>
  /<[a-z][\s\S]*>/i.test(text)
    ? text
    : text
        .split(/\n{2,}/)
        .map((para) => `<p>${para.trim()}</p>`)
        .join("");

const PROJECTS = PROJECT_SOURCE.map((p, i) => ({
  slug: p.slug,
  title: p.title,
  category: p.cat,
  year: p.year,
  tags: p.tags,
  color: p.color,
  client: p.client,
  role: p.role,
  summary: p.summary,
  sections: p.sections.map((s) => ({ h: s.h, p: asHtml(s.p) })),
  col: p.c,
  row: p.r,
  w: p.w,
  h: p.h,
  order: i,
}));

/**
 * Three articles so the magazine has something to show the first time it is
 * opened. Bodies are plain paragraphs run through `asHtml`, the same shape the
 * panel's editor produces and the article page renders.
 *
 * `publishedAt` is measured backwards from the seed run rather than pinned to
 * fixed dates, so a fresh install never opens on an archive dated years ago.
 */
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

const POSTS = [
  {
    slug: "brand-is-not-a-logo",
    title: "برند یعنی چه، وقتی لوگو نیست",
    category: "یادداشت",
    tags: ["برندینگ", "استراتژی"],
    accent: "#f6b506",
    excerpt:
      "بیشتر پروژه‌هایی که با «یک لوگوی تازه می‌خواهیم» شروع می‌شوند، مسئله‌شان لوگو نیست. مسئله این است که مجموعه نمی‌داند چه چیزی را باید ثابت نگه دارد.",
    body: [
      "هر بار که کسی با درخواست «فقط یک لوگوی تازه» سراغ‌مان می‌آید، اولین سؤال‌مان این نیست که چه شکلی دوست دارید. می‌پرسیم در شش ماه گذشته چند نفر داخل مجموعه چیزی طراحی کرده‌اند و بر چه اساسی تصمیم گرفته‌اند.",
      "جوابْ تقریباً همیشه یکی است: چند نفر، هرکدام بر اساس سلیقه‌ی خودشان. نتیجه این می‌شود که مخاطب بیرونی، ده تا خروجی می‌بیند که هیچ‌کدام شبیه هم نیستند، و به‌جای یک برند، ده تا برند نصفه‌نیمه به یاد می‌آورد.",
      "لوگوی تازه این را درست نمی‌کند. چیزی که درستش می‌کند، مجموعه‌ای از قاعده‌های کوتاه است: چه چیزی هرگز تغییر نمی‌کند، چه چیزی اجازه دارد تغییر کند، و وقتی کسی شک کرد باید از چه کسی بپرسد.",
      "به همین دلیل است که کتابچه‌های برندی که ما تحویل می‌دهیم، به‌جای چهل صفحه توضیح فلسفی، فهرستی از تصمیم‌های مشخص با مثال واقعی‌اند. کتابچه‌ای که خوانده نشود، هیچ برندی را نجات نمی‌دهد.",
    ],
    faqs: [
      { q: "برای شروع بازطراحی برند، اول چه چیزی لازم است؟", a: "فهرست کاری که در یک سال گذشته تولید شده و اینکه هرکدام را چه کسی تأیید کرده. تا این را نبینیم، هر پیشنهادی حدس است." },
      { q: "کتابچه‌ی برند چقدر طول می‌کشد؟", a: "بسته به تعداد زیرمجموعه‌ها، معمولاً شش تا ده هفته. بخش زیادی از این زمان صرف نوشتن قاعده‌ها می‌شود، نه طراحی." },
    ],
    publishedAt: daysAgo(9),
  },
  {
    slug: "designing-for-the-shared-screen",
    title: "طراحی برای صفحه‌ای که تنها نیست",
    category: "تجربه‌ی کاربری",
    tags: ["UX", "حریم خصوصی"],
    accent: "#d2621f",
    excerpt:
      "وقتی کاربر گوشی‌اش را در فضای مشترک باز می‌کند، هر چیزی که روی صفحه می‌ماند یک ریسک است. این محدودیت، طراحی را ساده‌تر می‌کند نه سخت‌تر.",
    body: [
      "در پروژه‌ی نیلوفر با محدودیتی روبه‌رو شدیم که بیشتر اپلیکیشن‌ها ندارند: بخش زیادی از کاربران، اپ را جایی باز می‌کردند که کس دیگری هم می‌توانست صفحه را ببیند.",
      "اولین واکنش تیم این بود که قفل و رمز اضافه کنیم. ولی قفل، مسئله‌ی «چه چیزی روی صفحه دیده می‌شود» را حل نمی‌کند؛ فقط یک قدم به اولش اضافه می‌کند.",
      "چیزی که جواب داد، عوض‌کردن پیش‌فرض بود: هیچ اطلاعات حساسی به‌خودی‌خود نمایش داده نمی‌شود. کاربر باید یک اقدام آگاهانه انجام دهد تا ببیند، و همان اقدام یعنی خودش می‌داند الان جای امنی است.",
      "جالب اینکه این محدودیت، رابط را سریع‌تر هم کرد. وقتی مجبوری پیش‌فرض را خالی بگذاری، ناچار می‌شوی تصمیم بگیری واقعاً چه چیزی مهم است — و بیشتر چیزهایی که فکر می‌کردیم مهم‌اند، نبودند.",
    ],
    faqs: [
      { q: "طراحی حریم‌محور یعنی رابط باید پیچیده‌تر شود؟", a: "نه. وقتی پیش‌فرض را خالی می‌گذاری، مجبور می‌شوی تصمیم بگیری چه چیزی واقعاً لازم است — و نتیجه معمولاً ساده‌تر از قبل درمی‌آید." },
      { q: "این رویکرد برای هر اپلیکیشنی جواب می‌دهد؟", a: "برای هر جایی که کاربر ممکن است صفحه را در فضای مشترک باز کند، بله. برای ابزارهای کاملاً شخصی، هزینه‌ی یک کلیک اضافه ارزشش را ندارد." },
    ],
    publishedAt: daysAgo(24),
  },
  {
    slug: "campaign-without-discount",
    title: "کمپین نوروزی بدون تخفیف",
    category: "کمپین",
    tags: ["کمپین", "سوشال"],
    accent: "#d1275a",
    excerpt:
      "در فصلی که همه فقط درباره‌ی تخفیف حرف می‌زنند، ساکت‌ماندن درباره‌ی قیمت خودش یک موضع است — به شرطی که چیز دیگری برای گفتن داشته باشی.",
    body: [
      "برند سال‌ها نوروز را با تخفیف جشن گرفته بود. هر سال درصد بیشتر می‌شد و حاشیه‌ی سود نازک‌تر، و هیچ‌کس دیگر یادش نمی‌آمد کمپین پارسال درباره‌ی چه بود.",
      "پیشنهاد ما این بود که امسال اصلاً درباره‌ی قیمت حرف نزنیم. ریسکش واضح بود و تیم فروش هم همین را گفت: اگر فروش بیفتد، جوابش با کیست.",
      "کاری که کردیم این بود که کمپین را حول یک رسم آشنای نوروزی ساختیم و محصول را در حاشیه‌ی قاب گذاشتیم. پیام درباره‌ی خرید نبود، ولی هر نقطه‌ی تماس، مسیری به خرید داشت.",
      "فروش حفظ شد، بدون تخفیف عمیق. ولی چیزی که برای‌مان مهم‌تر بود این بود که برای اولین بار، محتوای کمپین بعد از تمام‌شدن فصل هم بازنشر می‌شد — چیزی که یک بنر تخفیف هرگز نمی‌شود.",
    ],
    faqs: [
      { q: "کمپین بدون تخفیف برای هر برندی جواب می‌دهد؟", a: "نه. اگر مخاطب فقط به‌خاطر قیمت سراغ برند می‌آید، حذف تخفیف یعنی حذف دلیل خرید. این کار وقتی جواب می‌دهد که چیز دیگری برای گفتن داشته باشی." },
      { q: "ریسک افت فروش را چطور مدیریت کردید؟", a: "کمپین را روی یک بازه‌ی محدود تست کردیم و شاخص فروش را هفتگی دیدیم، با این توافق که اگر افت از حد مشخصی بیشتر شد به پیام قبلی برگردیم." },
    ],
    publishedAt: daysAgo(48),
  },
];

/**
 * The floating dock. «تماس» is deliberately absent: the header carries one
 * standing call to action to the contact page on every screen, and the same
 * link twice in two pieces of fixed chrome is one too many.
 */
const DOCK_LINKS = [
  { label: "خانه", href: "/", txLabel: "خانه", txColor: "#1c1c22" },
  { label: "خدمات", href: "/services", txLabel: "خدمات", txColor: "#0f766e" },
  { label: "پروژه‌ها", href: "/projects", txLabel: "پروژه‌ها", txColor: "#ef4444" },
  { label: "مجله", href: "/magazine", txLabel: "مجله", txColor: "#1d4ed8" },
  { label: "تیم", href: "/team", txLabel: "تیم", txColor: "#c2410c" },
];

/** The dock entry the services hub needs, for installs that predate it. */
const SERVICES_DOCK = DOCK_LINKS.find((l) => l.href === "/services")!;

/** Likewise the team page, which came later still and sits at the end. */
const TEAM_DOCK = DOCK_LINKS.find((l) => l.href === "/team")!;

const RAIL_LINKS: { label: string; caption: string; indexLabel: string; href: string; side: RailSide; accent: string }[] = [
  { label: "پروژه‌ها", caption: "کارهایی که ساخته‌ایم", indexLabel: "۰۱", href: "/projects", side: "START", accent: "#ef4444" },
  { label: "آثار", caption: "گالری تصویرسازی", indexLabel: "۰۲", href: "/artworks", side: "END", accent: "#1d4ed8" },
];

const BOOT_WORDS = [
  "ایده",
  "طراحی",
  "برند",
  "استراتژی",
  "خلاقیت",
  "هنر",
  "دیجیتال",
  "تجربه",
  "رشد",
  "کسب‌و‌کار",
  "با",
];

// ─────────────────────────────────────────── run

/**
 * Collections have no natural unique key, so they are replaced wholesale — but
 * only when empty, so a re-run never wipes edits made in the panel.
 */
async function seedIfEmpty<T>(name: string, count: () => Promise<number>, fill: () => Promise<T>) {
  const existing = await count();
  if (existing > 0) {
    console.log(`  ${name}: ${existing} ردیف موجود — رد شد`);
    return;
  }
  await fill();
  console.log(`  ${name}: پر شد`);
}

async function main() {
  console.log("در حال پر کردن دیتابیس…");

  // Settings are keyed, so they upsert cleanly. Only the label/hint/group are
  // refreshed on re-run; an edited value is left alone.
  for (const [i, s] of SETTINGS.entries()) {
    await db.setting.upsert({
      where: { key: s.key },
      update: { group: s.group, kind: s.kind ?? "TEXT", label: s.label, hint: s.hint ?? null, order: i },
      create: {
        key: s.key,
        value: s.value,
        group: s.group,
        kind: s.kind ?? "TEXT",
        label: s.label,
        hint: s.hint ?? null,
        order: i,
      },
    });
  }
  console.log(`  تنظیمات: ${SETTINGS.length} کلید`);

  await seedIfEmpty("کلمات تیتر", () => db.headlineWord.count(), () =>
    db.headlineWord.createMany({
      data: HEADLINE_WORDS.map((w, i) => ({ ...w, order: i })),
    }),
  );

  await seedIfEmpty("آمار", () => db.stat.count(), () =>
    db.stat.createMany({ data: STATS.map((s, i) => ({ ...s, order: i })) }),
  );

  await seedIfEmpty("خدمات", () => db.service.count(), () =>
    db.service.createMany({ data: SERVICES.map((s, i) => ({ ...s, order: i })) }),
  );

  // Services created before the landing pages existed came out of the migration
  // with a placeholder slug (`service-1`…) and no page copy. Fill both in, keyed
  // on the title and only while the slug is still the placeholder — a service
  // renamed or rewritten in the panel is never overwritten.
  for (const s of SERVICES) {
    await db.service.updateMany({
      where: { title: s.title, slug: { startsWith: "service-" } },
      data: {
        slug: s.slug,
        headline: s.headline,
        excerpt: s.excerpt,
        ctaTitle: s.ctaTitle,
        ctaNote: s.ctaNote,
        sections: s.sections,
        faqs: s.faqs,
      },
    });
  }

  // Example case studies for each service. Added, never removed: a link taken
  // off a project in the panel stays off.
  for (const [serviceSlug, projectSlugs] of Object.entries(SERVICE_PROJECTS)) {
    const service = await db.service.findUnique({
      where: { slug: serviceSlug },
      select: { id: true },
    });
    if (!service) continue;

    const linked = await db.project.findMany({
      where: { slug: { in: projectSlugs } },
      select: { id: true },
    });

    for (const [order, project] of linked.entries()) {
      await db.projectService.upsert({
        where: { projectId_serviceId: { projectId: project.id, serviceId: service.id } },
        update: {},
        create: { projectId: project.id, serviceId: service.id, order },
      });
    }
  }

  await seedIfEmpty("تیم", () => db.teamMember.count(), () =>
    db.teamMember.createMany({ data: TEAM.map((m, i) => ({ ...m, order: i })) }),
  );

  // The roster on /contact needs a bio, and members created before that column
  // existed have none. Fill only the blanks — a bio written in the panel is
  // never overwritten, and neither is one that was deliberately cleared and
  // then re-edited.
  for (const m of TEAM) {
    await db.teamMember.updateMany({
      where: { name: m.name, bio: "" },
      data: { bio: m.bio, focus: m.focus },
    });
    // Same rule for the city the /team table prints, backfilled separately so a
    // member whose bio was already written still picks one up.
    await db.teamMember.updateMany({
      where: { name: m.name, location: "" },
      data: { location: m.location },
    });
  }

  await seedIfEmpty("حرف مشتری‌ها", () => db.testimonial.count(), () =>
    db.testimonial.createMany({ data: TESTIMONIALS.map((t, i) => ({ ...t, order: i })) }),
  );

  await seedIfEmpty("همکاران", () => db.partner.count(), () =>
    db.partner.createMany({ data: PARTNERS.map((p, i) => ({ ...p, order: i })) }),
  );

  // Keyed on slug, so a re-run fills in case-study copy on rows that predate it
  // without disturbing anything already edited in the panel.
  for (const p of PROJECTS) {
    await db.project.upsert({
      where: { slug: p.slug },
      update: {
        client: p.client || undefined,
        role: p.role || undefined,
        summary: p.summary || undefined,
        sections: p.sections,
      },
      create: p,
    });
  }
  console.log(`  پروژه‌ها: ${PROJECTS.length} ردیف`);

  // Keyed on slug like projects, so a re-run can add an article without
  // touching one that has since been edited in the panel.
  for (const p of POSTS) {
    const body = p.body.map(asHtml).join("");
    await db.post.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        body,
        category: p.category,
        tags: p.tags,
        accent: p.accent,
        readMinutes: Math.max(
          1,
          Math.round(p.body.join(" ").split(/\s+/).filter(Boolean).length / 220),
        ),
        faqs: p.faqs,
        visible: true,
        publishedAt: p.publishedAt,
      },
    });
  }
  console.log(`  نوشته‌های مجله: ${POSTS.length} ردیف`);

  await seedIfEmpty("منوی پایین", () => db.dockLink.count(), () =>
    db.dockLink.createMany({ data: DOCK_LINKS.map((l, i) => ({ ...l, order: i })) }),
  );

  // A dock seeded before /services existed has no way to reach it. The link is
  // inserted right after «پروژه‌ها», which means shifting everything below it:
  // the dock is a handful of rows, so rewriting their order is cheaper than
  // explaining a link that landed at the end.
  if (!(await db.dockLink.findFirst({ where: { href: SERVICES_DOCK.href } }))) {
    const rows = await db.dockLink.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, href: true },
    });
    const after = rows.findIndex((l) => l.href === "/projects");
    const at = after === -1 ? rows.length : after + 1;

    for (const [i, row] of rows.slice(at).entries()) {
      await db.dockLink.update({ where: { id: row.id }, data: { order: at + i + 1 } });
    }
    await db.dockLink.create({ data: { ...SERVICES_DOCK, order: at } });
    console.log("  منوی پایین: لینک خدمات اضافه شد");
  }

  // The team page goes on the end, so no reordering is needed — it takes the
  // next order after whatever the dock currently holds.
  if (!(await db.dockLink.findFirst({ where: { href: TEAM_DOCK.href } }))) {
    const last = await db.dockLink.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    await db.dockLink.create({ data: { ...TEAM_DOCK, order: (last?.order ?? -1) + 1 } });
    console.log("  منوی پایین: لینک تیم اضافه شد");
  }

  await seedIfEmpty("لینک‌های کناری", () => db.railLink.count(), () =>
    db.railLink.createMany({ data: RAIL_LINKS.map((l, i) => ({ ...l, order: i })) }),
  );

  await seedIfEmpty("کلمات بوت", () => db.bootWord.count(), () =>
    db.bootWord.createMany({ data: BOOT_WORDS.map((text, i) => ({ text, order: i })) }),
  );

  // First admin. The defaults are the documented starting credentials (see
  // README.md); the environment overrides them so a real password can be set
  // without touching this file. Either way it is only created when missing, so
  // a password changed in the panel is never reset by a re-run.
  const email = process.env.ADMIN_EMAIL ?? "matthew@rahyad.ir";
  const password = process.env.ADMIN_PASSWORD ?? "matthew1234";
  const existingAdmin = await db.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`  مدیر: ${email} از قبل وجود دارد`);
  } else {
    await db.user.create({
      data: {
        email,
        name: process.env.ADMIN_NAME ?? "Matthew",
        passwordHash: await hashPassword(password),
        role: Role.ADMIN,
      },
    });
    console.log(`  مدیر ساخته شد → ${email} / ${password}`);
  }

  console.log("تمام شد.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
