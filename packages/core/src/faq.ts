/**
 * Frequently asked questions, stored as a Json list on the row they belong to.
 *
 * Same shape and same reasoning as `Project.sections`: an FAQ is only ever read
 * together with its post or project, so a join table would buy nothing and cost
 * a query. Anything malformed in the column degrades to an empty list rather
 * than throwing on a page render.
 */

export type Faq = { q: string; a: string };

export function toFaqs(value: unknown): Faq[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((f) => ({
      q: String((f as Faq)?.q ?? ""),
      a: String((f as Faq)?.a ?? ""),
    }))
    .filter((f) => f.q && f.a);
}
