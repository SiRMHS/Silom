/**
 * Field definitions for every editable collection.
 *
 * One description drives three things: the form the panel renders, the parsing
 * the server action does, and the defaults a new row gets. Adding a column to
 * a model means editing this file and the Prisma schema — nothing else.
 *
 * Imported by both client and server code, so it must stay free of `db`.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "color"
  | "tags"
  | "checkbox"
  | "image"
  | "select";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  /** Latin content — flips the input to LTR so hex/URLs/wordmarks read right. */
  ltr?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Grid width inside the item card. */
  span?: "full" | "half" | "third";
  placeholder?: string;
  /** Column is nullable in Prisma — an empty input is stored as NULL, not "". */
  nullable?: boolean;
};

export type CollectionDef = {
  /** Prisma model key. */
  model: ModelKey;
  title: string;
  description: string;
  /** Field whose value labels the collapsed row. */
  titleField: string;
  /** Rows are ordered by an explicit `order` column and moved with arrows. */
  sortable: boolean;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  /** Where this content shows up, for the panel's own copy. */
  addLabel: string;
};

/**
 * Projects and services are deliberately absent: each carries a slug, rich text
 * and a page of its own, so they get dedicated screens under
 * app/admin/(panel)/projects and app/admin/(panel)/services rather than the
 * generic list editor.
 */
export const MODEL_KEYS = [
  "stat",
  "teamMember",
  "testimonial",
  "partner",
  "dockLink",
  "railLink",
  "bootWord",
  "headlineWord",
] as const;

export type ModelKey = (typeof MODEL_KEYS)[number];

const VISIBLE: FieldDef = {
  name: "visible",
  label: "نمایش در سایت",
  type: "checkbox",
  span: "full",
};

export const COLLECTIONS: Record<ModelKey, CollectionDef> = {
  stat: {
    model: "stat",
    title: "آمار",
    description: "چهار عددی که در بخش معرفی می‌شمارند. عدد را لاتین بنویسید؛ سایت خودش فارسی نمایش می‌دهد.",
    titleField: "label",
    sortable: true,
    addLabel: "افزودن آمار",
    fields: [
      { name: "label", label: "عنوان", type: "text", span: "half" },
      { name: "value", label: "عدد", type: "number", span: "third", ltr: true },
      { name: "suffix", label: "پسوند", type: "text", span: "third", ltr: true, hint: "مثلاً +", placeholder: "+" },
      { name: "accent", label: "رنگ", type: "color", span: "third" },
      VISIBLE,
    ],
    defaults: { label: "عنوان تازه", value: 0, suffix: "", accent: "#ef4444", visible: true },
  },

  teamMember: {
    model: "teamMember",
    title: "تیم",
    description:
      "اعضای تیم. می‌توانید تصویر، گیف یا ویدیوی کوتاه (MP4/WebM) بگذارید؛ ویدیو بی‌صدا و تکرارشونده پخش می‌شود. بدون رسانه، تک‌حرف مونوگرام نمایش داده می‌شود. نسبت کادر ۳:۴ است. معرفی و تخصص‌ها فقط در صفحه‌ی «تماس با ما» دیده می‌شوند و شهر فقط در جدول صفحه‌ی «تیم ما».",
    titleField: "name",
    sortable: true,
    addLabel: "افزودن عضو",
    fields: [
      { name: "name", label: "نام", type: "text", span: "half" },
      { name: "role", label: "سمت", type: "text", span: "half" },
      {
        name: "location",
        label: "شهر",
        type: "text",
        span: "third",
        hint: "ستون سوم جدول صفحه‌ی تیم — خالی بماند خط تیره می‌خورد",
      },
      { name: "monogram", label: "مونوگرام", type: "text", span: "third", hint: "یک حرف" },
      { name: "accent", label: "رنگ", type: "color", span: "third" },
      {
        name: "bio",
        label: "معرفی",
        type: "textarea",
        span: "full",
        hint: "دو سه خط؛ فقط در صفحه‌ی تماس با ما نمایش داده می‌شود",
      },
      {
        name: "focus",
        label: "تخصص‌ها",
        type: "tags",
        span: "full",
        hint: "با کاما جدا کنید — در صفحه‌ی تماس با ما زیر معرفی می‌آیند",
      },
      { name: "imageId", label: "تصویر یا ویدیو", type: "image", span: "full" },
      VISIBLE,
    ],
    defaults: {
      name: "عضو تازه",
      role: "",
      location: "",
      monogram: "؟",
      bio: "",
      focus: [],
      accent: "#ef4444",
      visible: true,
    },
  },

  testimonial: {
    model: "testimonial",
    title: "حرف مشتری‌ها",
    description:
      "نقل‌قول‌هایی که در انتهای صفحه‌ی «تیم» یکی‌یکی نمایش داده می‌شوند. هر نقل‌قول یک اسلاید است؛ ترتیب همین فهرست، ترتیب چرخش است. تصویر گرد نمایش داده می‌شود و بدون آن، حرف اول نام می‌نشیند.",
    titleField: "name",
    sortable: true,
    addLabel: "افزودن نقل‌قول",
    fields: [
      {
        name: "quote",
        label: "متن نقل‌قول",
        type: "textarea",
        span: "full",
        hint: "بدون گیومه بنویسید؛ خودِ سایت آن را می‌گذارد",
      },
      { name: "name", label: "نام گوینده", type: "text", span: "half" },
      {
        name: "role",
        label: "سمت و شرکت",
        type: "text",
        span: "half",
        hint: "خط زیر نام — مثلاً «مدیر بازاریابی، نوروزمارکت»",
      },
      { name: "imageId", label: "تصویر گوینده", type: "image", span: "full" },
      VISIBLE,
    ],
    defaults: { quote: "", name: "نام گوینده", role: "", visible: true },
  },

  partner: {
    model: "partner",
    title: "همکاران",
    description:
      "لوگوهای نواری. بدون تصویر، نام به‌صورت وردمارک تایپوگرافیک رندر می‌شود و وزن/فاصله روی همان اثر می‌گذارد.",
    titleField: "name",
    sortable: true,
    addLabel: "افزودن همکار",
    fields: [
      { name: "name", label: "نام", type: "text", span: "half", ltr: true },
      { name: "imageId", label: "لوگو", type: "image", span: "full" },
      { name: "weight", label: "وزن فونت", type: "number", span: "third", ltr: true, hint: "۴۰۰ تا ۹۰۰" },
      { name: "spacing", label: "فاصله‌ی حروف", type: "text", span: "third", ltr: true, placeholder: "-0.02em" },
      { name: "italic", label: "ایتالیک", type: "checkbox", span: "third" },
      VISIBLE,
    ],
    defaults: { name: "Brand", weight: 700, spacing: "-0.02em", italic: false, visible: true },
  },

  dockLink: {
    model: "dockLink",
    title: "منوی پایین",
    description:
      "لینک‌های نوار شناور پایین صفحه. متن و رنگ گذار، پرده‌ی تمام‌صفحه‌ای است که پیش از رفتن به صفحه‌ی بعد پخش می‌شود.",
    titleField: "label",
    sortable: true,
    addLabel: "افزودن لینک",
    fields: [
      { name: "label", label: "متن", type: "text", span: "half" },
      { name: "href", label: "مقصد", type: "text", span: "half", ltr: true, hint: "مثل /projects یا #about" },
      {
        name: "txLabel",
        label: "متن گذار",
        type: "text",
        span: "half",
        nullable: true,
        hint: "نامی که وسط پرده‌ی گذار بزرگ نوشته می‌شود. اگر خالی باشد، این لینک بدون هیچ گذاری مستقیم باز می‌شود.",
      },
      { name: "txColor", label: "رنگ گذار", type: "color", span: "third", nullable: true },
      VISIBLE,
    ],
    defaults: { label: "لینک تازه", href: "/", txLabel: "", txColor: "#1c1c22", visible: true },
  },

  railLink: {
    model: "railLink",
    title: "لینک‌های کناری",
    description: "دو لینک بزرگ لبه‌ی صفحه‌ی اصلی که با حرکت نشانگر روشن می‌شوند.",
    titleField: "label",
    sortable: true,
    addLabel: "افزودن لینک کناری",
    fields: [
      { name: "label", label: "متن", type: "text", span: "half" },
      { name: "caption", label: "زیرنویس", type: "text", span: "half" },
      { name: "indexLabel", label: "شماره", type: "text", span: "third" },
      { name: "href", label: "مقصد", type: "text", span: "half", ltr: true },
      {
        name: "side",
        label: "سمت",
        type: "select",
        span: "third",
        options: [
          { value: "START", label: "راست" },
          { value: "END", label: "چپ" },
        ],
      },
      { name: "accent", label: "رنگ", type: "color", span: "third" },
      VISIBLE,
    ],
    defaults: {
      label: "لینک تازه",
      caption: "",
      indexLabel: "۰۳",
      href: "/",
      side: "START",
      accent: "#ef4444",
      visible: true,
    },
  },

  bootWord: {
    model: "bootWord",
    title: "کلمات بوت",
    description:
      "کلماتی که هنگام بالا آمدن سایت یکی‌یکی روی نویز ظاهر می‌شوند. کلمه‌ی پایانی جداگانه در «متن‌های سایت» تنظیم می‌شود.",
    titleField: "text",
    sortable: true,
    addLabel: "افزودن کلمه",
    fields: [{ name: "text", label: "کلمه", type: "text", span: "full" }],
    defaults: { text: "کلمه" },
  },

  headlineWord: {
    model: "headlineWord",
    title: "تیترهای متحرک",
    description:
      "تیترهای بزرگ کلمه‌به‌کلمه بالا می‌آیند و بعضی کلمه‌ها هایلایت می‌شوند. ترتیب همان ترتیب جمله است.",
    titleField: "text",
    sortable: true,
    addLabel: "افزودن کلمه",
    fields: [
      { name: "text", label: "کلمه", type: "text", span: "half" },
      {
        name: "group",
        label: "کدام تیتر",
        type: "select",
        span: "third",
        options: [
          { value: "MANIFESTO", label: "بخش معرفی" },
          { value: "FOOTER", label: "فوتر" },
        ],
      },
      {
        name: "emphasis",
        label: "هایلایت",
        type: "select",
        span: "third",
        options: [
          { value: "NONE", label: "بدون" },
          { value: "MARK", label: "خط‌کشیده" },
          { value: "BRAND", label: "رنگ برند" },
        ],
      },
    ],
    defaults: { text: "کلمه", group: "MANIFESTO", emphasis: "NONE" },
  },
};
