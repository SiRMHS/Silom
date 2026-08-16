"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { savePost } from "@/app/admin/(panel)/post-actions";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import ImagePicker from "./ImagePicker";
import RichTextEditor from "./RichTextEditor";
import FaqEditor from "./FaqEditor";
import Toast, { useToast } from "./Toast";
import { Icon } from "./Icons";
import type { Faq } from "@rahyad/core/faq";

export type PostDraft = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  accent: string;
  coverId: string | null;
  visible: boolean;
  publishedAt: string | null;
  faqs: Faq[];
};

export default function PostEditor({ post, media }: { post: PostDraft; media: MediaItem[] }) {
  const { toast, show } = useToast();
  const [pending, start] = useTransition();
  const [accent, setAccent] = useState(post.accent);

  return (
    <form
      action={(formData) =>
        start(async () => {
          const res = await savePost(post.id, formData);
          show(res.ok ? "ذخیره شد" : res.error, !res.ok);
        })
      }
    >
      <div className="ad-head">
        <div>
          <h1>{post.title}</h1>
          <p dir="ltr" style={{ textAlign: "right" }}>
            /magazine/{post.slug}
          </p>
        </div>
        <div className="ad-head-actions">
          <Link className="ad-btn ad-btn--ghost" href="/admin/posts">
            بازگشت
          </Link>
          {post.visible && (
            <Link className="ad-btn" href={`/magazine/${post.slug}`} target="_blank">
              <Icon name="external" size={14} />
              دیدن صفحه
            </Link>
          )}
          <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
            {pending ? "در حال ذخیره…" : "ذخیره"}
          </button>
        </div>
      </div>

      {/* ── مشخصات ────────────────────────────── */}
      <div className="ad-card">
        <h2>مشخصات</h2>
        <div className="ad-fields" style={{ marginTop: 14 }}>
          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="m-title">
              عنوان
            </label>
            <input
              id="m-title"
              name="title"
              className="ad-input"
              defaultValue={post.title}
              required
            />
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="m-slug">
              نشانی صفحه
            </label>
            <input
              id="m-slug"
              name="slug"
              className="ad-input is-ltr"
              dir="ltr"
              defaultValue={post.slug}
            />
            <span className="ad-hint">فقط حروف لاتین؛ اگر تکراری باشد خودکار شماره می‌گیرد</span>
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="m-category">
              دسته
            </label>
            <input
              id="m-category"
              name="category"
              className="ad-input"
              defaultValue={post.category}
              placeholder="مثلاً یادداشت"
            />
          </div>

          <div className="ad-field" data-span="half">
            <label className="ad-label" htmlFor="m-tags">
              برچسب‌ها
            </label>
            <input
              id="m-tags"
              name="tags"
              className="ad-input"
              defaultValue={post.tags.join("، ")}
            />
            <span className="ad-hint">با کاما جدا کنید</span>
          </div>

          <div className="ad-field" data-span="third">
            <label className="ad-label" htmlFor="m-accent">
              رنگ
            </label>
            <div className="ad-color">
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "#ef4444"}
                onChange={(e) => setAccent(e.target.value)}
                aria-label="انتخاب رنگ نوشته"
                tabIndex={-1}
              />
              <input
                id="m-accent"
                name="accent"
                className="ad-input"
                dir="ltr"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </div>
            <span className="ad-hint">رنگ دسته، کارت مجله و پرده‌ی گذار</span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label" htmlFor="m-excerpt">
              خلاصه
            </label>
            <textarea
              id="m-excerpt"
              name="excerpt"
              className="ad-textarea"
              defaultValue={post.excerpt}
            />
            <span className="ad-hint">
              روی کارت مجله و به‌عنوان توضیح در گوگل دیده می‌شود. خالی بگذارید تا از ابتدای متن
              ساخته شود.
            </span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-label">تصویر شاخص</label>
            <ImagePicker name="coverId" value={post.coverId} media={media} />
            <span className="ad-hint">
              بدون تصویر، کارت و سربرگ با رنگ خود نوشته کشیده می‌شوند.
            </span>
          </div>

          <div className="ad-field" data-span="full">
            <label className="ad-check">
              <input type="checkbox" name="visible" defaultChecked={post.visible} />
              انتشار در مجله
            </label>
            <span className="ad-hint">
              {post.publishedAt
                ? `تاریخ انتشار: ${new Date(post.publishedAt).toLocaleDateString(
                    "fa-IR-u-ca-persian",
                    { year: "numeric", month: "long", day: "numeric" },
                  )} — با ویرایش دوباره تغییر نمی‌کند.`
                : "تاریخ انتشار همان لحظه‌ای ثبت می‌شود که این گزینه را اولین بار تیک بزنید."}
            </span>
          </div>
        </div>
      </div>

      {/* ── متن ───────────────────────────────── */}
      <div className="ad-card">
        <h2>متن نوشته</h2>
        <p>زمان خواندن از روی همین متن حساب می‌شود و نیازی به وارد کردن ندارد.</p>

        <div style={{ marginTop: 14 }}>
          <RichTextEditor name="body" value={post.body} media={media} placeholder="متن نوشته…" />
        </div>
      </div>

      {/* ── سوالات متداول ─────────────────────── */}
      <div className="ad-card">
        <h2>سوالات متداول</h2>
        <p>
          پایین نوشته به شکل فهرست بازشونده می‌آید و به‌عنوان داده‌ی ساختاریافته هم برای موتورهای
          جست‌وجو فرستاده می‌شود. اگر سوالی اضافه نکنید، این بخش اصلاً نمایش داده نمی‌شود.
        </p>

        <div style={{ marginTop: 14 }}>
          <FaqEditor faqs={post.faqs} />
        </div>
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
        <Link className="ad-btn ad-btn--ghost" href="/admin/posts">
          بازگشت به فهرست
        </Link>
      </div>

      <Toast toast={toast} />
    </form>
  );
}
