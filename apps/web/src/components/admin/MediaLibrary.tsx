"use client";

import { useRef, useState, useTransition } from "react";
import { deleteMedia, updateMediaAlt, type MediaItem } from "@/app/admin/(panel)/media-actions";
import Toast, { useToast } from "./Toast";
import { ACCEPT_MEDIA, ThumbVideo, isVideoMedia, thumbStyle } from "./media-thumb";

const kb = (n: number) =>
  n > 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

export default function MediaLibrary({ items }: { items: MediaItem[] }) {
  const { toast, show } = useToast();
  const [pool, setPool] = useState(items);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const uploadAll = async (files: FileList) => {
    setBusy(true);
    let added = 0;
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "آپلود نشد");
        setPool((prev) => [json.media as MediaItem, ...prev]);
        added += 1;
      } catch (e) {
        show(e instanceof Error ? e.message : "آپلود نشد", true);
      }
    }
    if (added) show(`${added.toLocaleString("fa-IR")} فایل آپلود شد`);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div className="ad-head">
        <div>
          <h1>کتابخانه‌ی رسانه</h1>
          <p>
            تصویر و ویدیو در <code dir="ltr">public/uploads</code> ذخیره می‌شوند. حذف یک فایل آن را
            از هر جایی که استفاده شده هم برمی‌دارد. تصویر تا ۸ و ویدیو تا ۲۴ مگابایت.
          </p>
        </div>
        <div className="ad-head-actions">
          <button
            type="button"
            className="ad-btn ad-btn--primary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? "در حال آپلود…" : "آپلود رسانه"}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_MEDIA}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void uploadAll(e.target.files);
        }}
      />

      {pool.length === 0 ? (
        <p className="ad-empty">هنوز رسانه‌ای آپلود نشده است.</p>
      ) : (
        <div className="ad-media-grid">
          {pool.map((m) => (
            <div className="ad-media-card" key={m.id}>
              <a
                className="ad-media-thumb"
                style={thumbStyle(m)}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                aria-label={m.filename}
              >
                {isVideoMedia(m) && <ThumbVideo src={m.url} />}
              </a>
              <div className="ad-media-meta">
                <span>{m.filename}</span>
                <span dir="ltr">
                  {m.width && m.height ? `${m.width}×${m.height} · ` : ""}
                  {kb(m.size)}
                </span>

                <input
                  className="ad-input"
                  style={{ fontSize: 12, padding: "5px 8px" }}
                  defaultValue={m.alt}
                  placeholder="متن جایگزین"
                  aria-label={`متن جایگزین ${m.filename}`}
                  onBlur={(e) => {
                    const alt = e.target.value;
                    if (alt === m.alt) return;
                    start(async () => {
                      await updateMediaAlt(m.id, alt);
                      show("متن جایگزین ذخیره شد");
                    });
                  }}
                />

                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--danger"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await deleteMedia(m.id);
                      if (res.ok) {
                        setPool((prev) => prev.filter((x) => x.id !== m.id));
                        show("حذف شد");
                      } else {
                        show(res.error, true);
                      }
                    })
                  }
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast toast={toast} />
    </>
  );
}
