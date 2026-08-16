/**
 * Client-safe helpers for the settings map.
 *
 * Kept apart from lib/content.ts, which is `server-only` — the client
 * components that render these strings need `pick` but must never pull the
 * database module into the browser bundle.
 */

export type SiteStrings = Record<string, string>;

/** Reads a key with a fallback, so a missing or blank row can't empty the UI. */
export function pick(map: SiteStrings, key: string, fallback = ""): string {
  const v = map[key];
  return v === undefined || v === "" ? fallback : v;
}
