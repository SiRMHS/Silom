"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveProject } from "@/app/admin/(panel)/project-actions";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import ImagePicker from "./ImagePicker";
import GalleryPicker from "./GalleryPicker";
import RichTextEditor from "./RichTextEditor";
import FaqEditor from "./FaqEditor";
import Toast, { useToast } from "./Toast";
import { Icon, MoveDownIcon, MoveUpIcon } from "./Icons";
import type { Faq } from "@rahyad/core/faq";

export type ProjectDraft = {
  id: string;
  slug: string;
  title: string;
  category: string;
  year: string;
  tags: string[];
  color: string;
  client: string;
  role: string;
  summary: string;
  sections: { h: string; p: string }[];
  faqs: Faq[];
  imageId: string | null;
  filmId: string | null;
  gallery: string[];
  /** Ids of the services this project is filed under. */
  services: string[];
  col: number;
  row: number;
  w: number;
  h: number;
  visible: boolean;
};

/** One service, as the picker on this screen lists it. */
export type ServiceOption = { id: string; title: string; accent: string; visible: boolean };

export default function ProjectEditor({
  project,
  services,
  media,
}: {
  project: ProjectDraft;
  services: ServiceOption[];
  media: MediaItem[];
}) {
  const { toast, show } = useToast();
  const [pending, start] = useTransition();
  const [color, setColor] = useState(project.color);

  // Rows carry a stable key so a rich text editor keeps its identity when the
  // list is reordered — remounting one would wipe the draft inside it.
  const [rows, setRows] = useState(() =>
    project.sections.map((s, i) => ({ key: `s${i}`, ...s })),
  );
  const [seq, setSeq] = useState(project.sections.length);

  // Sections start collapsed; a section you just added opens itself.
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const toggleRow = (key: string) =>
    setOpenKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const addRow = () => {
    const key = `n${seq}`;
    setRows((prev) => [...prev, { key, h: "", p: "" }]);
    setOpenKeys((prev) => [...prev, key]);
    setSeq((n) => n + 1);
  };

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const setRowTitle = (key: string, h: string) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, h } : r)));

  const moveRow = (key: string, dir: -1 | 1) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form
      action={(formData) =>
        start(async () => {
          const res = await saveProject(project.id, formData);
          show(res.ok ? "ذخیره شد" : res.error, !res.ok);
        })
      }
    >
      <div className="ad-head">
        <div>
          <h1>{project.title}</h1>
          <p dir="ltr" style={{ textAlign: "right" }}>
            /projects/{project.slug}
          </p>
        </div>
        <div className="ad-head-actions">
          <Link className="ad-btn ad-btn--ghost" href="/admin/projects">
            بازگشت
          </Link>
          {project.visible && (
            <Link className="ad-btn" href={`/projects/${project.slug}`} target="_blank">
              <Icon name="external" size={14} />
              دیدن صفحه
            </Link>
          )}
          <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </div>

      {/* ── معرفی ─────────────────────────────── */}
      <div className="ad-card">
        <h2>مشخصات</h2>
        <div className="ad-fields" style={{ marginTop: 14 }}>
          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="p-title">
              عنوان
            </label>
            <input id="p-title" name="title" className="ad-input" defaultValue={project.title} required />
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="p-slug">
              نشانی صفحه
            </label>
            <input
              id="p-slug"
              name="slug"
              className="ad-input is-ltr"
              dir="ltr"
              defaultValue={project.slug}
            />
            <span className="ad-hint">فقط حروف لاتین؛ اگر تکراری باشد خودکار شماره می‌گیرد</span>
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="p-category">
              دسته
            </label>
            <input id="p-category" name="category" className="ad-input" defaultValue={project.category} />
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="p-year">
              سال
            </label>
            <input id="p-year" name="year" className="ad-input" defaultValue={project.year} />
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="p-tags">
              برچسب‌ها
            </label>
            <input
              id="p-tags"
              name="tags"
              className="ad-input"
              defaultValue={project.tags.join("، ")}
            />
            <span className="ad-hint">با کاما جدا کنید</span>
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="p-color">
              رنگ
            </label>
            <div className="ad-color">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#3b6ef5"}
                onChange={(e) => setColor(e.target.value)}
                aria-label="انتخاب رنگ پروژه"
                tabIndex={-1}
              />
              <input
                id="p-color"
                name="color"
                className="ad-input"
                dir="ltr"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="p-client">
              کارفرما
            </label>
            <input id="p-client" name="client" className="ad-input" defaultValue={project.client} />
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="p-role">
              نقش ما
            </label>
            <input id="p-role" name="role" className="ad-input" defaultValue={project.role} />
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="p-summary">
              خلاصه
            </label>
            <textarea
              id="p-summary"
              name="summary"
              className="ad-textarea"
              defaultValue={project.summary}
            />
            <span className="ad-hint">
              زیر تیتر صفحه‌ی پروژه و همان چیزی که به‌عنوان توضیح در گوگل دیده می‌شود — ساده بماند
            </span>
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label">تصویر شاخص</label>
            <ImagePicker name="imageId" value={project.imageId} media={media} />
            <span className="ad-hint">
              سرصفحه‌ی صفحه‌ی پروژه و کارت آن روی بوم؛ اگر خالی بماند، به‌جای تصویر یک صفحه‌ی رنگی
              با رنگ بالا کشیده می‌شود.
            </span>
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label">ویدیو</label>
            <ImagePicker name="filmId" value={project.filmId} media={media} />
            <span className="ad-hint">
              یک فایل MP4 یا WebM؛ بی‌صدا و تکرارشونده بعد از بخش اول پخش می‌شود و تصویر شاخص هم
              فریم اولش است. بدون ویدیو، این بخش اصلاً نمایش داده نمی‌شود.
            </span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-check">
              <input type="checkbox" name="visible" defaultChecked={project.visible} />
              نمایش در سایت
            </label>
          </div>
        </div>
      </div>

      {/* ── خدمات مرتبط ────────────────────────── */}
      <div className="ad-card">
        <h2>خدمات مرتبط</h2>
        <p>
          این پروژه نمونه‌ی کدام خدمت‌هاست؟ هر خدمتی که تیک بخورد، این پروژه در کاروسل و شبکه‌ی
          صفحه‌ی همان خدمت می‌آید و در صفحه‌ی خود پروژه هم لینکی به آن خدمت دیده می‌شود.
        </p>

        <div className="ad-checks" style={{ marginTop: 14 }}>
          {services.length === 0 && (
            <p className="ad-hint">
              هنوز خدمتی ساخته نشده است. اول از بخش «خدمات» یکی بسازید.
            </p>
          )}

          {services.map((s) => (
            <label className="ad-check ad-check--chip" key={s.id} style={{ ["--c" as string]: s.accent }}>
              <input
                type="checkbox"
                name="service"
                value={s.id}
                defaultChecked={project.services.includes(s.id)}
              />
              <span className="ad-check-dot" aria-hidden="true" />
              {s.title}
              {/* A hidden service still keeps its links; it just has no page to
                  open yet, and saying so here is kinder than a dead chip. */}
              {!s.visible && <span className="ad-badge ad-badge--off">پنهان</span>}
            </label>
          ))}
        </div>
      </div>

      {/* ── بخش‌های مطالعه‌ی موردی ─────────────── */}
      <div className="ad-card">
        <h2>بخش‌های صفحه‌ی پروژه</h2>
        <p>معمولاً چالش، رویکرد و نتیجه. هر بخش یک تیتر دارد و یک متن با قالب‌بندی کامل.</p>

        <div className="ad-sections">
          {rows.length === 0 && <p className="ad-hint">هنوز بخشی اضافه نشده است.</p>}

          {rows.map((row, i) => {
            const open = openKeys.includes(row.key);
            return (
              <div className="ad-section-row" key={row.key} data-open={open ? "" : undefined}>
                <div className="ad-section-tools">
                  <button
                    type="button"
                    className="ad-disclosure"
                    aria-expanded={open}
                    onClick={() => toggleRow(row.key)}
                  >
                    <span className="ad-disclosure-caret">
                      <Icon name="chevronDown" size={15} />
                    </span>
                    <span className="ad-section-num">بخش {(i + 1).toLocaleString("fa-IR")}</span>
                    <span className="ad-item-title">{row.h || "بدون عنوان"}</span>
                  </button>

                  <button
                    type="button"
                    className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                    disabled={i === 0}
                    onClick={() => moveRow(row.key, -1)}
                    aria-label="بالا"
                    title="بالا"
                  >
                    <MoveUpIcon />
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                    disabled={i === rows.length - 1}
                    onClick={() => moveRow(row.key, 1)}
                    aria-label="پایین"
                    title="پایین"
                  >
                    <MoveDownIcon />
                  </button>
                  <button
                    type="button"
                    className="ad-btn ad-btn--sm ad-btn--danger"
                    onClick={() => removeRow(row.key)}
                  >
                    حذف
                  </button>
                </div>

                <div className="ad-collapse" inert={!open}>
                  <div className="ad-collapse-inner ad-stack">
                    <input
                      className="ad-input"
                      name={`sec.h.${i}`}
                      value={row.h}
                      onChange={(e) => setRowTitle(row.key, e.target.value)}
                      placeholder="عنوان بخش — مثلاً چالش"
                      aria-label={`عنوان بخش ${i + 1}`}
                    />

                    <RichTextEditor
                      name={`sec.p.${i}`}
                      value={row.p}
                      media={media}
                      placeholder="متن بخش…"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button type="button" className="ad-btn ad-btn--sm" onClick={addRow}>
            افزودن بخش
          </button>
        </div>
      </div>

      {/* ── گالری ──────────────────────────────── */}
      <div className="ad-card">
        <h2>گالری تصاویر</h2>
        <p>
          نوار افقی پایین صفحه‌ی پروژه. ترتیب همین فهرست، ترتیب نمایش است؛ متن جایگزین هر تصویر از
          کتابخانه‌ی رسانه خوانده می‌شود.
        </p>

        <div style={{ marginTop: 14 }}>
          <GalleryPicker name="gallery" value={project.gallery} media={media} />
        </div>
      </div>

      {/* ── سوالات متداول ─────────────────────── */}
      <div className="ad-card">
        <h2>سوالات متداول</h2>
        <p>
          پایین صفحه‌ی پروژه به شکل فهرست بازشونده می‌آید و به‌عنوان داده‌ی ساختاریافته هم برای
          موتورهای جست‌وجو فرستاده می‌شود. اگر سوالی اضافه نکنید، این بخش اصلاً نمایش داده نمی‌شود.
        </p>

        <div style={{ marginTop: 14 }}>
          <FaqEditor faqs={project.faqs} />
        </div>
      </div>

      {/* ── جای کارت روی بوم ───────────────────── */}
      <div className="ad-card">
        <h2>جای کارت روی بوم</h2>
        <p>
          بوم یک ماژول ۶×۴ است که بی‌نهایت تکرار می‌شود. مجموع خانه‌های همه‌ی پروژه‌ها باید دقیقاً
          ۲۴ بماند، وگرنه بین تکرارها سوراخ می‌افتد.
        </p>

        <div className="ad-fields" style={{ marginTop: 14 }}>
          {(
            [
              { name: "col", label: "ستون", hint: "۰ تا ۵", value: project.col },
              { name: "row", label: "ردیف", hint: "۰ تا ۳", value: project.row },
              { name: "w", label: "پهنا", hint: "به ستون", value: project.w },
              { name: "h", label: "ارتفاع", hint: "به ردیف", value: project.h },
            ] as const
          ).map((f) => (
            <div className="ad-field" data-span="third" key={f.name}>
              <label className="ad-label" htmlFor={`p-${f.name}`}>
                {f.label}
              </label>
              <input
                id={`p-${f.name}`}
                name={f.name}
                type="number"
                dir="ltr"
                className="ad-input is-ltr"
                defaultValue={f.value}
              />
              <span className="ad-hint">{f.hint}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
        <Link className="ad-btn ad-btn--ghost" href="/admin/projects">
          بازگشت به فهرست
        </Link>
      </div>

      <Toast toast={toast} />
    </form>
  );
}
