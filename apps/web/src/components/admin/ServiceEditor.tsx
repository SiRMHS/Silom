"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveService } from "@/app/admin/(panel)/service-actions";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import ImagePicker from "./ImagePicker";
import GalleryPicker from "./GalleryPicker";
import RichTextEditor from "./RichTextEditor";
import FaqEditor from "./FaqEditor";
import Toast, { useToast } from "./Toast";
import { Icon, MoveDownIcon, MoveUpIcon } from "./Icons";
import type { Faq } from "@rahyad/core/faq";

/**
 * The whole of one service: the three lines the home page's accordion shows,
 * then everything only its landing page reads.
 *
 * Laid out in that order on purpose — someone who opens this screen to fix a
 * typo in the accordion finds it first, and the page's own copy is below rather
 * than mixed in with it.
 */

export type ServiceDraft = {
  id: string;
  slug: string;
  indexLabel: string;
  title: string;
  body: string;
  tags: string[];
  accent: string;
  headline: string;
  excerpt: string;
  ctaTitle: string;
  ctaNote: string;
  sections: { h: string; p: string }[];
  faqs: Faq[];
  imageId: string | null;
  filmId: string | null;
  gallery: string[];
  visible: boolean;
  projectCount: number;
};

export default function ServiceEditor({
  service,
  media,
}: {
  service: ServiceDraft;
  media: MediaItem[];
}) {
  const { toast, show } = useToast();
  const [pending, start] = useTransition();
  const [accent, setAccent] = useState(service.accent);

  // Rows carry a stable key so a rich text editor keeps its identity when the
  // list is reordered — remounting one would wipe the draft inside it.
  const [rows, setRows] = useState(() => service.sections.map((s, i) => ({ key: `s${i}`, ...s })));
  const [seq, setSeq] = useState(service.sections.length);

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
          const res = await saveService(service.id, formData);
          show(res.ok ? "ذخیره شد" : res.error, !res.ok);
        })
      }
    >
      <div className="ad-head">
        <div>
          <h1>{service.title}</h1>
          <p dir="ltr" style={{ textAlign: "right" }}>
            /services/{service.slug}
          </p>
        </div>
        <div className="ad-head-actions">
          <Link className="ad-btn ad-btn--ghost" href="/admin/services">
            بازگشت
          </Link>
          {service.visible && (
            <Link className="ad-btn" href={`/services/${service.slug}`} target="_blank">
              <Icon name="external" size={14} />
              دیدن صفحه
            </Link>
          )}
          <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </div>

      {/* ── ردیف صفحه‌ی اصلی ───────────────────── */}
      <div className="ad-card">
        <h2>ردیف آکاردئون صفحه‌ی اصلی</h2>
        <p>
          همین سه چیز در بخش «خدمات» صفحه‌ی اصلی دیده می‌شود و روی کارت فهرست خدمات هم می‌نشیند.
          کوتاه بماند؛ توضیح کامل پایین‌تر نوشته می‌شود.
        </p>

        <div className="ad-fields" style={{ marginTop: 14 }}>
          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="s-title">
              عنوان
            </label>
            <input
              id="s-title"
              name="title"
              className="ad-input"
              defaultValue={service.title}
              required
            />
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="s-slug">
              نشانی صفحه
            </label>
            <input
              id="s-slug"
              name="slug"
              className="ad-input is-ltr"
              dir="ltr"
              defaultValue={service.slug}
            />
            <span className="ad-hint">فقط حروف لاتین؛ اگر تکراری باشد خودکار شماره می‌گیرد</span>
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="s-index">
              شماره
            </label>
            <input
              id="s-index"
              name="indexLabel"
              className="ad-input"
              defaultValue={service.indexLabel}
            />
            <span className="ad-hint">مثلاً ۰۱</span>
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="s-accent">
              رنگ
            </label>
            <div className="ad-color">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#ef4444"}
                onChange={(e) => setAccent(e.target.value)}
                aria-label="انتخاب رنگ خدمت"
                tabIndex={-1}
              />
              <input
                id="s-accent"
                name="accent"
                className="ad-input"
                dir="ltr"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </div>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="s-body">
              توضیح کوتاه
            </label>
            <textarea id="s-body" name="body" className="ad-textarea" defaultValue={service.body} />
            <span className="ad-hint">یکی دو خط — همان که با باز شدن ردیف دیده می‌شود</span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="s-tags">
              برچسب‌ها
            </label>
            <input
              id="s-tags"
              name="tags"
              className="ad-input"
              defaultValue={service.tags.join("، ")}
            />
            <span className="ad-hint">با کاما جدا کنید</span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-check">
              <input type="checkbox" name="visible" defaultChecked={service.visible} />
              نمایش در سایت
            </label>
            <span className="ad-hint">
              با برداشتن این تیک، هم ردیف صفحه‌ی اصلی و هم صفحه‌ی خدمت پنهان می‌شود.
            </span>
          </div>
        </div>
      </div>

      {/* ── سرصفحه‌ی صفحه‌ی خدمت ────────────────── */}
      <div className="ad-card">
        <h2>سرصفحه‌ی صفحه‌ی خدمت</h2>
        <p>بالای صفحه‌ی /services/{service.slug} — تصویر تمام‌عرض با تیتر و لید روی آن.</p>

        <div className="ad-fields" style={{ marginTop: 14 }}>
          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="s-headline">
              تیتر صفحه
            </label>
            <input
              id="s-headline"
              name="headline"
              className="ad-input"
              defaultValue={service.headline}
            />
            <span className="ad-hint">اگر خالی بماند، همان عنوان بالا استفاده می‌شود</span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="s-excerpt">
              لید
            </label>
            <textarea
              id="s-excerpt"
              name="excerpt"
              className="ad-textarea"
              defaultValue={service.excerpt}
            />
            <span className="ad-hint">
              زیر تیتر می‌آید و همان چیزی است که در نتایج گوگل به‌عنوان توضیح دیده می‌شود
            </span>
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label">تصویر سرصفحه</label>
            <ImagePicker name="imageId" value={service.imageId} media={media} />
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label">ویدیو</label>
            <ImagePicker name="filmId" value={service.filmId} media={media} />
            <span className="ad-hint">
              یک فایل MP4 یا WebM؛ بی‌صدا و تکرارشونده پخش می‌شود. بدون ویدیو، این بخش اصلاً نمایش
              داده نمی‌شود.
            </span>
          </div>
        </div>
      </div>

      {/* ── بخش‌های صفحه ───────────────────────── */}
      <div className="ad-card">
        <h2>بخش‌های صفحه‌ی خدمت</h2>
        <p>
          معمولاً «چه می‌کنیم»، «چطور کار می‌کنیم» و «چه چیزی تحویل می‌گیرید». هر بخش یک تیتر دارد و
          یک متن با قالب‌بندی کامل.
        </p>

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
                      placeholder="عنوان بخش — مثلاً چه کاری انجام می‌دهیم"
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
          نوار افقی میان صفحه. ترتیب همین فهرست، ترتیب نمایش است؛ متن جایگزین هر تصویر از کتابخانه‌ی
          رسانه خوانده می‌شود. اگر خالی بماند، این بخش نمایش داده نمی‌شود.
        </p>

        <div style={{ marginTop: 14 }}>
          <GalleryPicker name="gallery" value={service.gallery} media={media} />
        </div>
      </div>

      {/* ── نمونه‌کارها ─────────────────────────── */}
      <div className="ad-card">
        <h2>نمونه‌کارها</h2>
        <p>
          پروژه‌های این خدمت از خود پروژه‌ها انتخاب می‌شوند، نه از اینجا: در صفحه‌ی ویرایش هر پروژه
          تیک این خدمت را بزنید تا در کاروسل و شبکه‌ی این صفحه بیاید.{" "}
          {service.projectCount > 0
            ? `الان ${service.projectCount.toLocaleString("fa-IR")} پروژه به این خدمت وصل است.`
            : "هنوز هیچ پروژه‌ای به این خدمت وصل نشده است."}
        </p>

        <div style={{ marginTop: 14 }}>
          <Link className="ad-btn ad-btn--sm" href="/admin/projects">
            رفتن به پروژه‌ها
          </Link>
        </div>
      </div>

      {/* ── سوالات متداول ─────────────────────── */}
      <div className="ad-card">
        <h2>سوالات متداول</h2>
        <p>
          پایین صفحه به شکل فهرست بازشونده می‌آید و به‌عنوان داده‌ی ساختاریافته هم برای موتورهای
          جست‌وجو فرستاده می‌شود. اگر سوالی اضافه نکنید، این بخش نمایش داده نمی‌شود.
        </p>

        <div style={{ marginTop: 14 }}>
          <FaqEditor faqs={service.faqs} />
        </div>
      </div>

      {/* ── فرم سفارش ──────────────────────────── */}
      <div className="ad-card">
        <h2>فرم سفارش</h2>
        <p>
          همان فرم صفحه‌ی «تماس با ما» است و به همان صندوق پیام‌ها می‌رسد؛ فقط موضوعش از قبل با نام
          این خدمت پر می‌شود. اگر این دو فیلد را خالی بگذارید، متن پیش‌فرض سایت استفاده می‌شود.
        </p>

        <div className="ad-fields" style={{ marginTop: 14 }}>
          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="s-cta-title">
              تیتر فرم
            </label>
            <input
              id="s-cta-title"
              name="ctaTitle"
              className="ad-input"
              defaultValue={service.ctaTitle}
              placeholder={`${service.title} می‌خواهید؟`}
            />
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="s-cta-note">
              توضیح زیر تیتر
            </label>
            <textarea
              id="s-cta-note"
              name="ctaNote"
              className="ad-textarea"
              defaultValue={service.ctaNote}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
        <Link className="ad-btn ad-btn--ghost" href="/admin/services">
          بازگشت به فهرست
        </Link>
      </div>

      <Toast toast={toast} />
    </form>
  );
}
