"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createService,
  deleteService,
  duplicateService,
  moveService,
  setServiceVisible,
} from "@/app/admin/(panel)/service-actions";
import { MoveDownIcon, MoveUpIcon } from "./Icons";
import Toast, { useToast } from "./Toast";

/**
 * The services screen.
 *
 * A studio has a handful of services, not a hundred, so this list is not
 * paginated or searchable: the whole set is on screen and the arrows order it,
 * which is the order both the home page's accordion and the /services hub use.
 */

export type ServiceRow = {
  id: string;
  slug: string;
  indexLabel: string;
  title: string;
  accent: string;
  visible: boolean;
  image: string | null;
  sectionCount: number;
  projectCount: number;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function ServiceList({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const { toast, show } = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>خدمات</h1>
          <p>
            هر خدمت هم ردیف آکاردئون صفحه‌ی اصلی است، هم کارت فهرست{" "}
            <code dir="ltr">/services</code>، هم صفحه‌ی کامل خودش.
          </p>
        </div>
        <div className="ad-head-actions">
          <Link className="ad-btn ad-btn--ghost" href="/services" target="_blank">
            دیدن فهرست خدمات
          </Link>
          <form action={createService}>
            <button className="ad-btn ad-btn--primary" type="submit" disabled={pending}>
              خدمت تازه
            </button>
          </form>
        </div>
      </div>

      {services.length === 0 ? (
        <p className="ad-empty">هنوز خدمتی ساخته نشده است.</p>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th style={{ width: 46 }} />
                <th>عنوان</th>
                <th>شماره</th>
                <th>بخش‌ها</th>
                <th>پروژه‌ها</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <span
                      className="ad-thumb"
                      style={
                        s.image ? { backgroundImage: `url(${s.image})` } : { background: s.accent }
                      }
                      aria-hidden="true"
                    />
                  </td>

                  <td>
                    <Link className="ad-link" href={`/admin/services/${s.id}`}>
                      {s.title}
                    </Link>
                    <div className="ad-sub" dir="ltr">
                      /services/{s.slug}
                    </div>
                  </td>

                  <td>{s.indexLabel || "—"}</td>
                  <td>{s.sectionCount ? fa(s.sectionCount) : "—"}</td>
                  <td>{s.projectCount ? fa(s.projectCount) : "—"}</td>

                  <td>
                    {s.visible ? (
                      <span className="ad-badge ad-badge--ok">منتشرشده</span>
                    ) : (
                      <span className="ad-badge ad-badge--off">پنهان</span>
                    )}
                  </td>

                  <td>
                    <div className="ad-item-tools">
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                        aria-label="بالا"
                        title="بالا"
                        disabled={pending || i === 0}
                        onClick={() =>
                          start(async () => {
                            const res = await moveService(s.id, "up");
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
                        disabled={pending || i === services.length - 1}
                        onClick={() =>
                          start(async () => {
                            const res = await moveService(s.id, "down");
                            show(res.ok ? "جابه‌جا شد" : res.error, !res.ok);
                            router.refresh();
                          })
                        }
                      >
                        <MoveDownIcon />
                      </button>

                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await setServiceVisible(s.id, !s.visible);
                            show(s.visible ? "پنهان شد" : "منتشر شد");
                            router.refresh();
                          })
                        }
                      >
                        {s.visible ? "پنهان کن" : "منتشر کن"}
                      </button>

                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            const res = await duplicateService(s.id);
                            if (res.ok && res.id) router.push(`/admin/services/${res.id}`);
                            else if (!res.ok) show(res.error, true);
                          })
                        }
                      >
                        رونوشت
                      </button>

                      <Link className="ad-btn ad-btn--sm" href={`/admin/services/${s.id}`}>
                        ویرایش
                      </Link>

                      {confirming === s.id ? (
                        <>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--danger"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const res = await deleteService(s.id);
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
                          onClick={() => setConfirming(s.id)}
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

      <Toast toast={toast} />
    </>
  );
}
