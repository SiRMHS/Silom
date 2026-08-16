"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import MediaBrowser from "./MediaBrowser";
import { MoveDownIcon, MoveUpIcon } from "./Icons";

/**
 * Ordered list of images for a case study's gallery.
 *
 * Each row writes a hidden `gallery.<i>` input, so the enclosing form posts the
 * order it shows — saveProject rewrites the join rows from that sequence. The
 * same media file may appear twice; the id is not the row key for that reason.
 */
export default function GalleryPicker({
  name,
  value,
  media,
}: {
  name: string;
  value: string[];
  media: MediaItem[];
}) {
  const [rows, setRows] = useState(() => value.map((id, i) => ({ key: `g${i}`, id })));
  const [seq, setSeq] = useState(value.length);
  const [open, setOpen] = useState(false);
  // Uploads made from this field before the server list catches up
  const [uploaded, setUploaded] = useState<MediaItem[]>([]);

  const pool = useMemo(() => {
    const known = new Set(media.map((m) => m.id));
    return [...uploaded.filter((m) => !known.has(m.id)), ...media];
  }, [media, uploaded]);

  const add = (item: MediaItem) => {
    setRows((prev) => [...prev, { key: `n${seq}`, id: item.id }]);
    setSeq((n) => n + 1);
  };

  const remove = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const move = (key: string, dir: -1 | 1) =>
    setRows((prev) => {
      const i = prev.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="ad-gallery">
      {rows.length === 0 && (
        <p className="ad-hint">
          هنوز تصویری اضافه نشده — تا وقتی خالی بماند، گالری صفحه‌ی پروژه با رنگ پروژه پر می‌شود.
        </p>
      )}

      <ul className="ad-gallery-grid">
        {rows.map((row, i) => {
          const item = pool.find((m) => m.id === row.id);
          return (
            <li className="ad-gallery-item" key={row.key}>
              <input type="hidden" name={`${name}.${i}`} value={row.id} />

              <span
                className="ad-gallery-thumb"
                style={item ? { backgroundImage: `url(${item.url})` } : undefined}
                aria-hidden="true"
              />

              <span className="ad-gallery-name" title={item?.filename ?? row.id}>
                {item?.filename ?? "تصویر حذف‌شده"}
              </span>

              <span className="ad-gallery-tools">
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                  disabled={i === 0}
                  onClick={() => move(row.key, -1)}
                  aria-label={`جابه‌جایی تصویر ${i + 1} به عقب`}
                  title="جلوتر"
                >
                  <MoveUpIcon />
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--ghost ad-btn--icon"
                  disabled={i === rows.length - 1}
                  onClick={() => move(row.key, 1)}
                  aria-label={`جابه‌جایی تصویر ${i + 1} به جلو`}
                  title="عقب‌تر"
                >
                  <MoveDownIcon />
                </button>
                <button
                  type="button"
                  className="ad-btn ad-btn--sm ad-btn--danger"
                  onClick={() => remove(row.key)}
                >
                  حذف
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <button type="button" className="ad-btn ad-btn--sm" onClick={() => setOpen(true)}>
        افزودن تصویر
      </button>

      {open && (
        <MediaBrowser
          media={pool}
          title="افزودن به گالری"
          onUploaded={(item) => setUploaded((prev) => [item, ...prev])}
          onPick={(item) => {
            add(item);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
