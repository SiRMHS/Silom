"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createProject,
  deleteProject,
  duplicateProject,
  moveProject,
  setProjectVisible,
} from "@/app/admin/(panel)/project-actions";
import { MoveDownIcon, MoveUpIcon } from "./Icons";
import Toast, { useToast } from "./Toast";

export type ProjectRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  year: string;
  color: string;
  visible: boolean;
  tags: string[];
  image: string | null;
  sectionCount: number;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function ProjectList({
  projects,
  page,
  pageCount,
  total,
  size,
  sizes,
  q,
  canReorder,
  isFirstPage,
  isLastPage,
}: {
  projects: ProjectRow[];
  page: number;
  pageCount: number;
  total: number;
  size: number;
  sizes: number[];
  q: string;
  canReorder: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
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
    return `/admin/projects${qs ? `?${qs}` : ""}`;
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
          <h1>پروژه‌ها</h1>
          <p>
            هر پروژه هم کارت بوم <code dir="ltr">/projects</code> است، هم کارت «کارهای منتخب»
            صفحه‌ی اصلی، هم صفحه‌ی مطالعه‌ی موردی خودش.
          </p>
        </div>
        <div className="ad-head-actions">
          <form action={createProject}>
            <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
              پروژه‌ی تازه
            </button>
          </form>
        </div>
      </div>

      <div className="ad-listbar">
        <input
          className="ad-input"
          value={term}
          placeholder="جست‌وجو در عنوان، نشانی، دسته، کارفرما یا برچسب…"
          aria-label="جست‌وجوی پروژه"
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
          onChange={(e) => start(() => router.push(linkTo({ size: e.target.value, page: undefined })))}
        >
          {sizes.map((s) => (
            <option key={s} value={s}>
              {fa(s)}
            </option>
          ))}
        </select>
      </div>

      {total === 0 ? (
        <p className="ad-empty">{q ? "چیزی پیدا نشد." : "هنوز پروژه‌ای ساخته نشده است."}</p>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th style={{ width: 46 }} />
                <th>عنوان</th>
                <th>دسته</th>
                <th>سال</th>
                <th>بخش‌ها</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <span
                      className="ad-thumb"
                      style={
                        p.image
                          ? { backgroundImage: `url(${p.image})` }
                          : { background: p.color }
                      }
                      aria-hidden="true"
                    />
                  </td>

                  <td>
                    <Link className="ad-link" href={`/admin/projects/${p.id}`}>
                      {p.title}
                    </Link>
                    <div className="ad-sub" dir="ltr">
                      /projects/{p.slug}
                    </div>
                  </td>

                  <td>{p.category || "—"}</td>
                  <td>{p.year || "—"}</td>
                  <td>{p.sectionCount ? fa(p.sectionCount) : "—"}</td>

                  <td>
                    {p.visible ? (
                      <span className="ad-badge ad-badge--ok">منتشرشده</span>
                    ) : (
                      <span className="ad-badge ad-badge--off">پنهان</span>
                    )}
                  </td>

                  <td>
                    <div className="ad-item-tools">
                      {canReorder && (
                        <>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                            aria-label="بالا"
                            title="بالا"
                            disabled={pending || (isFirstPage && i === 0)}
                            onClick={() =>
                              start(async () => {
                                const res = await moveProject(p.id, "up");
                                show(res.ok ? "جابه‌جا شد" : res.error, !res.ok);
                                router.refresh();
                              })
                            }
                          >
                            <MoveUpIcon />
                          </button>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                            aria-label="پایین"
                            title="پایین"
                            disabled={pending || (isLastPage && i === projects.length - 1)}
                            onClick={() =>
                              start(async () => {
                                const res = await moveProject(p.id, "down");
                                show(res.ok ? "جابه‌جا شد" : res.error, !res.ok);
                                router.refresh();
                              })
                            }
                          >
                            <MoveDownIcon />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await setProjectVisible(p.id, !p.visible);
                            show(p.visible ? "پنهان شد" : "منتشر شد");
                            router.refresh();
                          })
                        }
                      >
                        {p.visible ? "پنهان کن" : "منتشر کن"}
                      </button>

                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await duplicateProject(p.id);
                            if (res.ok && res.id) router.push(`/admin/projects/${res.id}`);
                            else if (!res.ok) show(res.error, true);
                          })
                        }
                      >
                        رونوشت
                      </button>

                      <Link className="ad-btn ad-btn--sm" href={`/admin/projects/${p.id}`}>
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
                                const res = await deleteProject(p.id);
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

      {!canReorder && total > 0 && (
        <p className="ad-hint" style={{ marginTop: 10 }}>
          ترتیب پروژه‌ها سراسری است، پس دکمه‌های جابه‌جایی هنگام جست‌وجو نمایش داده نمی‌شوند.
        </p>
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
            صفحه‌ی {fa(page)} از {fa(pageCount)} — {fa(total)} پروژه
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
