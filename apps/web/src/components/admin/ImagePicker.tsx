"use client";

import { useMemo, useState } from "react";
import type { MediaItem } from "@/app/admin/(panel)/media-actions";
import MediaBrowser from "./MediaBrowser";
import { ThumbVideo, isVideoMedia, thumbStyle } from "./media-thumb";

/**
 * Hidden-input backed image field: keeps the chosen media id in the enclosing
 * form while showing a preview and a modal browser over the library.
 *
 * The library list is handed down from the page rather than fetched per field,
 * so a screen with a dozen pickers still costs one query.
 */
export default function ImagePicker({
  name,
  value,
  media,
}: {
  name: string;
  value: string | null;
  media: MediaItem[];
}) {
  const [selected, setSelected] = useState<string | null>(value);
  const [open, setOpen] = useState(false);
  // Uploads made from this field before the server list catches up. Derived
  // rather than synced into state, so no effect has to chase the prop.
  const [uploaded, setUploaded] = useState<MediaItem[]>([]);

  const pool = useMemo(() => {
    const known = new Set(media.map((m) => m.id));
    return [...uploaded.filter((m) => !known.has(m.id)), ...media];
  }, [media, uploaded]);

  const current = pool.find((m) => m.id === selected) ?? null;

  return (
    <div className="ad-picker">
      <input type="hidden" name={name} value={selected ?? ""} />

      <span className="ad-picker-preview" style={thumbStyle(current)} aria-hidden="true">
        {isVideoMedia(current) && current && <ThumbVideo src={current.url} />}
      </span>

      <button type="button" className="ad-btn ad-btn--sm" onClick={() => setOpen(true)}>
        {current ? "تغییر رسانه" : "انتخاب رسانه"}
      </button>

      {current && (
        <button
          type="button"
          className="ad-btn ad-btn--sm ad-btn--ghost"
          onClick={() => setSelected(null)}
        >
          برداشتن
        </button>
      )}

      {open && (
        <MediaBrowser
          media={pool}
          selectedId={selected}
          onUploaded={(item) => setUploaded((prev) => [item, ...prev])}
          onPick={(item) => {
            setSelected(item.id);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
