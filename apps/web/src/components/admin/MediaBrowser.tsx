"use client";

import { useRef, useState } from "react";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import { ACCEPT_MEDIA, ThumbVideo, isVideoMedia, thumbStyle } from "./media-thumb";

/**
 * Modal over the media library: browse what's there, or upload on the spot.
 *
 * Shared by the image field on a record and by the rich text editor's image
 * button, so both get the same list and the same upload path.
 */
export default function MediaBrowser({
  media,
  selectedId,
  onPick,
  onClose,
  onUploaded,
  title = "انتخاب رسانه",
}: {
  media: MediaItem[];
  selectedId?: string | null;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
  onUploaded?: (item: MediaItem) => void;
  title?: string;
}) {
  const [pool, setPool] = useState(media);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "آپلود نشد");

      const item: MediaItem = json.media;
      setPool((prev) => [item, ...prev]);
      onUploaded?.(item);
      onPick(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "آپلود نشد");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="ad-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ad-modal-backdrop" onClick={onClose} />
      <div className="ad-modal-box">
        <div className="ad-modal-head">
          <b>{title}</b>
          <div className="ad-item-tools">
            <button
              type="button"
              className="ad-btn ad-btn--sm ad-btn--primary"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? "در حال آپلود…" : "آپلود تازه"}
            </button>
            <button type="button" className="ad-btn ad-btn--sm" onClick={onClose}>
              بستن
            </button>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_MEDIA}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />

        {error && <div className="ad-note ad-note--error">{error}</div>}

        {pool.length === 0 ? (
          <p className="ad-empty">هنوز رسانه‌ای آپلود نشده است.</p>
        ) : (
          <div className="ad-media-grid">
            {pool.map((m) => (
              <button
                key={m.id}
                type="button"
                className="ad-media-card"
                data-selected={m.id === selectedId ? "" : undefined}
                onClick={() => onPick(m)}
              >
                <span className="ad-media-thumb" style={thumbStyle(m)} aria-hidden="true">
                  {isVideoMedia(m) && <ThumbVideo src={m.url} />}
                </span>
                <span className="ad-media-meta">
                  <span>{m.filename}</span>
                  {m.width && m.height && (
                    <span dir="ltr">
                      {m.width}×{m.height}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
