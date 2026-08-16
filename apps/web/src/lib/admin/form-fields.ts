import "server-only";

import { sanitizeRichText } from "@rahyad/core/admin/sanitize";

/**
 * Reading the repeatable fields the panel's editors post.
 *
 * The project editor and the service editor render the same three repeaters —
 * ordered blocks of rich text, an ordered gallery and a list of questions — so
 * they post the same field names and are read here once. The index in a name is
 * the display order, never an id: rows are rewritten wholesale on save, which
 * is why reordering one in the browser needs no bookkeeping.
 */

export const HEX = /^#[0-9a-fA-F]{3,8}$/;

/** URL-safe, lowercase, no leading/trailing dashes; never empty. */
export function normaliseSlug(raw: string, fallback: string) {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || fallback
  );
}

export function readInt(formData: FormData, name: string, fallback: number) {
  const n = Number(String(formData.get(name) ?? "").trim());
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function readText(formData: FormData, name: string, max: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, max);
}

export function readTags(formData: FormData, name: string, max = 20) {
  return String(formData.get(name) ?? "")
    .split(/[,،]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function readColor(formData: FormData, name: string, fallback: string) {
  const v = readText(formData, name, 20);
  return HEX.test(v) ? v : fallback;
}

/**
 * Blocks arrive as sec.h.<i> (plain heading) and sec.p.<i> (editor HTML).
 * Index order is display order; a block empty on both sides is dropped.
 */
export function readSections(formData: FormData) {
  const blocks: { index: number; h: string; p: string }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^sec\.h\.(\d+)$/.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    blocks.push({
      index,
      h: String(value).trim().slice(0, 200),
      p: sanitizeRichText(String(formData.get(`sec.p.${index}`) ?? "")),
    });
  }

  return blocks
    .sort((a, b) => a.index - b.index)
    .filter((b) => b.h || b.p)
    .map((b) => ({ h: b.h, p: b.p }));
}

/**
 * FAQ rows arrive as faq.q.<i> / faq.a.<i>, index order being display order.
 * A row missing either half is dropped — a question with no answer is worse
 * than no question at all.
 */
export function readFaqs(formData: FormData) {
  const rows: { index: number; q: string; a: string }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^faq\.q\.(\d+)$/.exec(key);
    if (!match) continue;
    const index = Number(match[1]);
    rows.push({
      index,
      q: String(value).trim().slice(0, 300),
      a: String(formData.get(`faq.a.${index}`) ?? "")
        .trim()
        .slice(0, 2000),
    });
  }

  return rows
    .sort((a, b) => a.index - b.index)
    .filter((r) => r.q && r.a)
    .slice(0, 30)
    .map((r) => ({ q: r.q, a: r.a }));
}

/**
 * Gallery picks arrive as gallery.<i> = media id, index order being display
 * order. The ids are returned as posted — the caller checks them against the
 * library before writing, so a stale field from a deleted file can't break the
 * save with a foreign key error.
 */
export function readGalleryPicks(formData: FormData, max = 40) {
  const picked: { index: number; mediaId: string }[] = [];

  for (const [key, value] of formData.entries()) {
    const match = /^gallery\.(\d+)$/.exec(key);
    const mediaId = String(value).trim();
    if (!match || !mediaId) continue;
    picked.push({ index: Number(match[1]), mediaId });
  }

  return picked
    .sort((a, b) => a.index - b.index)
    .slice(0, max)
    .map((p) => p.mediaId);
}
