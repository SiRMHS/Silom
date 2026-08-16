"use client";

/**
 * Thumbnail bits shared by the library, the browser modal and the picker field.
 *
 * Stills ride on the box's own `background`, which costs no extra element; a
 * clip can't, so it gets a real <video> layered over the same box.
 */

export type ThumbMedia = { url: string; mimeType: string };

export const isVideoMedia = (m: ThumbMedia | null | undefined) =>
  !!m?.mimeType.startsWith("video/");

/** Background for a still, nothing for a clip (the <video> covers it). */
export const thumbStyle = (m: ThumbMedia | null | undefined) =>
  m && !isVideoMedia(m) ? { backgroundImage: `url(${m.url})` } : undefined;

export function ThumbVideo({ src }: { src: string }) {
  return (
    <video className="ad-thumb-video" src={src} muted loop autoPlay playsInline preload="metadata" />
  );
}

export const ACCEPT_MEDIA = "image/*,video/mp4,video/webm";
