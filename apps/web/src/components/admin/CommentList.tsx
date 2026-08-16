"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteComment,
  setCommentApproved,
} from "@/app/admin/(panel)/comment-actions";
import Toast, { useToast } from "./Toast";

export type CommentRow = {
  id: string;
  author: string;
  body: string;
  approved: boolean;
  createdAt: string;
  postId: string;
  postTitle: string;
  postSlug: string;
};

const fa = (n: number) => n.toLocaleString("fa-IR");

const faWhen = (iso: string) =>
  new Date(iso).toLocaleDateString("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function CommentList({
  comments,
  pending: pendingCount,
  filter,
}: {
  comments: CommentRow[];
  pending: number;
  filter: "pending" | "approved" | "all";
}) {
  const router = useRouter();
  const { toast, show } = useToast();
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  const TABS = [
    { key: "pending" as const, label: "در انتظار بررسی" },
    { key: "approved" as const, label: "منتشرشده" },
    { key: "all" as const, label: "همه" },
  ];

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>نظرها</h1>
          <p>
            نظرهای خوانندگان زیر نوشته‌های مجله. هیچ نظری تا وقتی اینجا تأییدش نکنید در سایت
            دیده نمی‌شود.
            {pendingCount > 0 && ` ${fa(pendingCount)} نظر منتظر بررسی است.`}
          </p>
        </div>
      </div>

      <div className="ad-listbar">
        {TABS.map((t) => (
          <Link
            key={t.key}
            className="ad-btn ad-btn--sm"
            href={t.key === "pending" ? "/admin/comments" : `/admin/comments?filter=${t.key}`}
            aria-current={filter === t.key ? "page" : undefined}
            data-active={filter === t.key ? "" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {comments.length === 0 ? (
        <p className="ad-empty">
          {filter === "pending" ? "نظری در انتظار بررسی نیست." : "نظری اینجا نیست."}
        </p>
      ) : (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>نویسنده</th>
                <th>نظر</th>
                <th>نوشته</th>
                <th>تاریخ</th>
                <th>وضعیت</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {comments.map((c) => (
                <tr key={c.id}>
                  <td>
                    <b>{c.author}</b>
                  </td>

                  <td>
                    {/* pre-wrap so the line breaks the reader typed survive */}
                    <div className="ad-comment-body">{c.body}</div>
                  </td>

                  <td>
                    <Link className="ad-link" href={`/admin/posts/${c.postId}`}>
                      {c.postTitle}
                    </Link>
                    <div className="ad-sub" dir="ltr">
                      /magazine/{c.postSlug}
                    </div>
                  </td>

                  <td>{faWhen(c.createdAt)}</td>

                  <td>
                    {c.approved ? (
                      <span className="ad-badge ad-badge--ok">منتشرشده</span>
                    ) : (
                      <span className="ad-badge ad-badge--off">در انتظار</span>
                    )}
                  </td>

                  <td>
                    <div className="ad-item-tools">
                      <button
                        type="button"
                        className="ad-btn ad-btn--sm"
                        disabled={busy}
                        onClick={() =>
                          start(async () => {
                            const res = await setCommentApproved(c.id, !c.approved);
                            show(
                              res.ok
                                ? c.approved
                                  ? "از سایت برداشته شد"
                                  : "منتشر شد"
                                : res.error,
                              !res.ok,
                            );
                            router.refresh();
                          })
                        }
                      >
                        {c.approved ? "برداشتن" : "تأیید و انتشار"}
                      </button>

                      {c.approved && (
                        <Link
                          className="ad-btn ad-btn--sm"
                          href={`/magazine/${c.postSlug}`}
                          target="_blank"
                        >
                          دیدن
                        </Link>
                      )}

                      {confirming === c.id ? (
                        <>
                          <button
                            type="button"
                            className="ad-btn ad-btn--sm ad-btn--danger"
                            disabled={busy}
                            onClick={() =>
                              start(async () => {
                                const res = await deleteComment(c.id);
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
                          disabled={busy}
                          onClick={() => setConfirming(c.id)}
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
