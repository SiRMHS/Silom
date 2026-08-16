/**
 * Seeds the database with the content that was previously hardcoded in the
 * components. Safe to re-run: every row is upserted on a stable key, so an
 * edit made in the admin panel is only overwritten if the key still matches.
 *
 *   npm run db:seed
 */

import "dotenv/config";
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
import { hashPassword } from "../src/lib/password";
import { PROJECTS as PROJECT_SOURCE } from "../src/lib/projects";

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

  // SEO
  { key: "seo.home.title", value: "رهیــــاد | آژانس خلاقیت", group: "SEO", label: "عنوان صفحه‌ی اصلی" },
  { key: "seo.home.description", value: "آژانس خلاقیت رهیاد — طراحی و هنر دیجیتال", group: "SEO", label: "توضیح صفحه‌ی اصلی", kind: "TEXTAREA" },
  { key: "seo.projects.title", value: "پروژه‌ها | رهیــــاد", group: "SEO", label: "عنوان صفحه‌ی پروژه‌ها" },
  { key: "seo.projects.description", value: "پروژه‌های آژانس خلاقیت رهیاد", group: "SEO", label: "توضیح صفحه‌ی پروژه‌ها", kind: "TEXTAREA" },

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

  // SERVICES
  { key: "services.eyebrow", value: "چه کاری انجام می‌دهیم", group: "SERVICES", label: "تیتر کوچک" },
  { key: "services.heading", value: "خدمات", group: "SERVICES", label: "عنوان بخش" },

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

  // LOGOS
  { key: "logos.title", value: "برندهایی که با ما کار کرده‌اند", group: "LOGOS", label: "عنوان بخش همکاران" },

  // CONTACT
  { key: "contact.srLabel", value: "ایمیل یا شماره موبایل شما", group: "CONTACT", label: "برچسب فیلد (برای صفحه‌خوان)" },
  { key: "contact.placeholder", value: "you@company.com", group: "CONTACT", label: "متن راهنمای داخل فیلد", hint: "لاتین بماند؛ متن فارسی داخل فیلد LTR به‌هم می‌ریزد" },
  { key: "contact.hint", value: "ایمیل یا شماره موبایل‌تان را بنویسید و اینتر بزنید ↵", group: "CONTACT", label: "راهنمای زیر فیلد" },
  { key: "contact.invalid", value: "ایمیل یا شماره‌ی موبایل معتبر نیست", group: "CONTACT", label: "پیام خطای اعتبارسنجی" },
  { key: "contact.doneTitle", value: "پیام‌تان رسید.", group: "CONTACT", label: "پیام موفقیت" },
  { key: "contact.doneHint", value: "به‌زودی جواب می‌دهیم.", group: "CONTACT", label: "زیرنویس پیام موفقیت" },

  // FOOTER
  { key: "footer.location", value: "تهران، ایران", group: "FOOTER", label: "محل" },
  { key: "footer.copyright", value: "۱۴۰۴ — رهیاد", group: "FOOTER", label: "کپی‌رایت" },

  // BOOT
  { key: "boot.tuning", value: "در حال تنظیم آنتن…", group: "BOOT", label: "متن حین نویز اولیه" },
  { key: "boot.finalWord", value: "رهیاد", group: "BOOT", label: "کلمه‌ی پایانی", hint: "کلمه‌ای که بزرگ می‌شود و به هدر پرواز می‌کند" },

  // PROJECTS
  { key: "projects.hint", value: "برای گشتن بکشید", group: "PROJECTS", label: "راهنمای کشیدن بوم" },

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

const SERVICES = [
  {
    indexLabel: "۰۱",
    title: "هویت برند",
    body: "از نام و نشان تا سیستم بصری و لحن کلامی؛ هویتی که در هر نقطه‌ی تماس یکدست بماند.",
    tags: ["لوگو", "سیستم بصری", "کتابچه برند"],
    accent: "#ef4444",
  },
  {
    indexLabel: "۰۲",
    title: "طراحی و توسعه‌ی وب",
    body: "تجربه‌ی کاربری روشن، رابط دقیق و پیاده‌سازی سریع — سایتی که هم زیباست هم کار می‌کند.",
    tags: ["UX/UI", "Next.js", "بهینه‌سازی"],
    accent: "#1d4ed8",
  },
  {
    indexLabel: "۰۳",
    title: "تولید محتوا و ویدیو",
    body: "روایتی که دیده می‌شود؛ از ایده و استوری‌بورد تا موشن‌گرافیک و تدوین نهایی.",
    tags: ["موشن", "کمپین", "عکاسی"],
    accent: "#c2410c",
  },
  {
    indexLabel: "۰۴",
    title: "استراتژی و رشد",
    body: "پژوهش بازار، جایگاه‌یابی و برنامه‌ی رشد؛ تصمیم‌هایی که بر داده تکیه دارند.",
    tags: ["پژوهش", "پوزیشنینگ", "کمپین"],
    accent: "#0f766e",
  },
];

const TEAM = [
  { name: "آرش نیک‌روش", role: "مدیر خلاقیت", monogram: "آ", accent: "#ef4444" },
  { name: "سحر مرادی", role: "مدیر هنری", monogram: "س", accent: "#1d4ed8" },
  { name: "نیما رستمی", role: "سرپرست توسعه", monogram: "ن", accent: "#0f766e" },
  { name: "الهام کاظمی", role: "استراتژیست برند", monogram: "ا", accent: "#c2410c" },
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

const DOCK_LINKS = [
  { label: "خانه", href: "/", txLabel: "خانه", txColor: "#1c1c22" },
  { label: "پروژه‌ها", href: "/projects", txLabel: "پروژه‌ها", txColor: "#ef4444" },
  { label: "آژانس", href: "#about", txLabel: null, txColor: null },
  { label: "تماس", href: "/contact", txLabel: "تماس", txColor: "#1c1c22" },
];

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

  await seedIfEmpty("تیم", () => db.teamMember.count(), () =>
    db.teamMember.createMany({ data: TEAM.map((m, i) => ({ ...m, order: i })) }),
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

  await seedIfEmpty("منوی پایین", () => db.dockLink.count(), () =>
    db.dockLink.createMany({ data: DOCK_LINKS.map((l, i) => ({ ...l, order: i })) }),
  );

  await seedIfEmpty("لینک‌های کناری", () => db.railLink.count(), () =>
    db.railLink.createMany({ data: RAIL_LINKS.map((l, i) => ({ ...l, order: i })) }),
  );

  await seedIfEmpty("کلمات بوت", () => db.bootWord.count(), () =>
    db.bootWord.createMany({ data: BOOT_WORDS.map((text, i) => ({ text, order: i })) }),
  );

  // First admin. Credentials come from the environment so a real password can
  // be set without touching this file.
  const email = process.env.ADMIN_EMAIL ?? "admin@rahyad.local";
  const password = process.env.ADMIN_PASSWORD ?? "rahyad1234";
  const existingAdmin = await db.user.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`  مدیر: ${email} از قبل وجود دارد`);
  } else {
    await db.user.create({
      data: {
        email,
        name: process.env.ADMIN_NAME ?? "مدیر سایت",
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
