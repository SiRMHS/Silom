/**
 * Persian dates for anything the magazine prints.
 *
 * The site is Jalali throughout, so an ISO timestamp is formatted rather than
 * shown — and a missing date renders as nothing instead of "Invalid Date".
 */

const LONG = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function faDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : LONG.format(d);
}

/** For <time dateTime> — the machine-readable half stays Gregorian. */
export function isoDay(iso: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export const faNumber = (n: number) => n.toLocaleString("fa-IR");
