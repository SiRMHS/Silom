"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { createPost, deletePost, setPostVisible } from "@/app/admin/(panel)/post-actions";
import Toast, { useToast } from "./Toast";

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  accent: string;
  visible: boolean;
  readMinutes: number;
  publishedAt: string | null;
  cover: string | null;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

const faDay = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fa-IR-u-ca-persian", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

export default function PostList({
  posts,
  page,
  pageCount,
  total,
  size,
  sizes,
  q,
}: {
  posts: PostRow[];
  page: number;
  pageCount: number;
  total: number;
  size: number;
  sizes: number[];
  q: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast, show } = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [term, setTerm] = useState(q);

  /** Builds a URL that keeps the other query params intact. */
  const linkTo = (next: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") sp.delete(key);
      else sp.set(key, String(value));
    }
    const qs = sp.toString();
    return `/admin/posts${qs ? `?${qs}` : ""}`;
  };

  const search = (value: string) => {
    setTerm(value);
    // A new search invalidates the current page number
    start(() => router.push(linkTo({ q: value, page: undefined })));
  };

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>مجله</h1>
          <p>
            نوشته‌های <code dir="ltr">/magazine</code>. ترتیب نمایش بر اساس تاریخ انتشار است —
            تازه‌ترین بالا — و تاریخ فقط بار اول که نوشته منتشر می‌شود ثبت می‌گردد.
          </p>
        </div>
        <div className="ad-head-actions">
          <form action={createPost}>
            <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
              نوشته‌ی تازه
            </button>
          </form>
        </div>
      </div>

      <div className="ad-listbar">
        <input
          className="ad-input"
          value={term}
          placeholder="جست‌وجو در عنوان، نشانی، دسته یا برچسب…"
          aria-label="جست‌وجوی نوشته"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search(term);
            }
          }}
        />
        <button type="button" className="ad-btn" onClick={() => search(term)} disabled={pending}>
          جست‌وجو
        </button>
        {q && (
          <button type="button" className="ad-btn ad-btn--ghost" onClick={() => search("")}>
            پاک‌کردن
          </button>
        )}

        <span className="ad-listbar-spacer" />

        <label className="ad-label" htmlFor="page-size">
          در هر صفحه
        </label>
        <select
          id="page-size"
          className="ad-select"
          style={{ width: "auto" }}
          value={size}
          onChange={(e) =>
            start(() => router.push(linkTo({ size: e.target.value, page: undefined })))
          }
        >
          {sizes.map((s) => (
            <option key={s} value={s}>
              {fa(s)}
            </option>
          ))}
        </select>
      </div>

      {total === 0 ? (
        <p className="ad-empty">{q ? "چیزی پیدا نشد." : "هنوز نوشته‌ای ساخته نشده است."}</p>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th style={{ width: 46 }} />
                <th>عنوان</th>
                <th>دسته</th>
                <th>تاریخ انتشار</th>
                <th>زمان خواندن</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span
                      className="ad-thumb"
                      style={
                        p.cover ? { backgroundImage: `url(${p.cover})` } : { background: p.accent }
                      }
                      aria-hidden="true"
                    />
                  </td>

                  <td>
                    <Link className="ad-link" href={`/admin/posts/${p.id}`}>
                      {p.title}
                    </Link>
                    <div className="ad-sub" dir="ltr">
                      /magazine/{p.slug}
                    </div>
                  </td>

                  <td>{p.category || "—"}</td>
                  <td>{faDay(p.publishedAt)}</td>
                  <td>{fa(p.readMinutes)} دقیقه</td>

                  <td>
                    {p.visible ? (
                      <span className="ad-badge ad-badge--ok">منتشرشده</span>
                    ) : (
                      <span className="ad-badge ad-badge--off">پیش‌نویس</span>
                    )}
                  </td>

                  <td>
                    <div className="ad-item-tools">
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await setPostVisible(p.id, !p.visible);
                            show(
                              res.ok ? (p.visible ? "پیش‌نویس شد" : "منتشر شد") : res.error,
                              !res.ok,
                            );
                            router.refresh();
                          })
                        }
                      >
                        {p.visible ? "پیش‌نویس کن" : "منتشر کن"}
                      </button>

                      <Link className="ad-btn ad-btn--sm" href={`/admin/posts/${p.id}`}>
                        ویرایش
                      </Link>

                      {confirming === p.id ? (
                        <>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--danger"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const res = await deletePost(p.id);
                                show(res.ok ? "حذف شد" : res.error, !res.ok);
                                setConfirming(null);
                                router.refresh();
                              })
                            }
                          >
                            مطمئنم
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost"
                            onClick={() => setConfirming(null)}
                          >
                            انصراف
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ad-btn ad-btn--sm ad-btn--danger"
                          disabled={pending}
                          onClick={() => setConfirming(p.id)}
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav className="ad-pager" aria-label="صفحه‌بندی">
          <Link
            className="ad-btn ad-btn--sm"
            href={linkTo({ page: page - 1 })}
            aria-disabled={page === 1}
            data-disabled={page === 1 ? "" : undefined}
          >
            قبلی
          </Link>

          <span className="ad-pager-info">
            صفحه‌ی {fa(page)} از {fa(pageCount)} — {fa(total)} نوشته
          </span>

          <Link
            className="ad-btn ad-btn--sm"
            href={linkTo({ page: page + 1 })}
            aria-disabled={page === pageCount}
            data-disabled={page === pageCount ? "" : undefined}
          >
            بعدی
          </Link>
        </nav>
      )}

      <Toast toast={toast} />
    </>
  );
}
