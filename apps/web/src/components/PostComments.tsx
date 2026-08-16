"use client";

import { useRef, useState, useTransition } from "react";
import { submitComment } from "@/app/magazine/comment-actions";
import { faDate, faNumber, isoDay } from "@/lib/fa-date";
import type { PostComment } from "@rahyad/core";

/**
 * Comments under an article.
 *
 * Everything already approved is rendered from the server; the form posts a new
 * one and then says so, because a comment that has to be moderated would
 * otherwise look like it vanished.
 */
export default function PostComments({
  slug,
  comments,
}: {
  slug: string;
  comments: PostComment[];
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (formData: FormData) =>
    start(async () => {
      const res = await submitComment(slug, formData);
      if (res.ok) {
        setError(null);
        setSent(true);
        formRef.current?.reset();
      } else {
        setError(res.error);
      }
    });

  return (
    <section className="post-comments post-measure" aria-labelledby="comments-heading">
      <h2 className="post-comments-title" id="comments-heading">
        نظرها
        {comments.length > 0 && (
          <span className="post-comments-count">{faNumber(comments.length)}</span>
        )}
      </h2>

      {comments.length > 0 && (
        <ol className="comment-list">
          {comments.map((c) => (
            <li className="comment" key={c.id}>
              <div className="comment-head">
                <span className="comment-author">{c.author}</span>
                <span className="mag-dot" aria-hidden="true" />
                <time className="comment-date" dateTime={isoDay(c.createdAt)}>
                  {faDate(c.createdAt)}
                </time>
              </div>
              {/* Plain text, rendered as text — a comment is never HTML */}
              <p className="comment-body">{c.body}</p>
            </li>
          ))}
        </ol>
      )}

      {sent ? (
        <p className="comment-sent" role="status">
          ممنون — نظرتان ثبت شد و پس از بررسی منتشر می‌شود.
        </p>
      ) : (
        <form ref={formRef} className="comment-form" action={onSubmit}>
          <p className="comment-form-hint">
            {comments.length === 0
              ? "اولین نظر را شما بنویسید."
              : "نظرتان را بنویسید."}{" "}
            نظرها پس از بررسی منتشر می‌شوند.
          </p>

          <div className="comment-field">
            <label className="comment-label" htmlFor="comment-author">
              نام
            </label>
            <input
              id="comment-author"
              name="author"
              className="comment-input"
              maxLength={60}
              required
              autoComplete="name"
            />
          </div>

          <div className="comment-field">
            <label className="comment-label" htmlFor="comment-body">
              نظر
            </label>
            <textarea
              id="comment-body"
              name="body"
              className="comment-input comment-textarea"
              maxLength={2000}
              rows={5}
              required
            />
          </div>

          {/* Honeypot — hidden from people, irresistible to bots */}
          <div className="comment-trap" aria-hidden="true">
            <label htmlFor="comment-website">وب‌سایت</label>
            <input id="comment-website" name="website" tabIndex={-1} autoComplete="off" />
          </div>

          {error && (
            <p className="comment-error" role="alert">
              {error}
            </p>
          )}

          <button className="comment-submit" type="submit" disabled={pending}>
            {pending ? "در حال ارسال…" : "ثبت نظر"}
          </button>
        </form>
      )}
    </section>
  );
}
