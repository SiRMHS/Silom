import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Serves admin-panel uploads off the mounted volume.
 *
 * These files can't come from Next's static handler: in production it
 * enumerates public/ exactly once at startup
 * (next/src/server/lib/router-utils/filesystem.ts) and only serves what was in
 * that snapshot, so anything uploaded while the server is running 404s until
 * the container restarts. In dev the same code stats the filesystem per
 * request, which is why this only ever broke on the server.
 *
 * The URL space is unchanged — `Media.url` rows stay `/uploads/<name>` — so
 * files that *were* present at boot keep being served by the static handler and
 * never reach this route. It exists for everything uploaded after that.
 */

// Matches api/admin/upload/route.ts, which writes here and stores /uploads/<name>.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// Upload filenames end in random hex, so a given URL is always the same bytes.
const CACHE = "public, max-age=31536000, immutable";

/** Resolves under UPLOAD_DIR or returns null — the whole path-traversal class. */
function resolveWithin(segments: string[]) {
  const target = path.resolve(UPLOAD_DIR, ...segments);
  const root = path.resolve(UPLOAD_DIR) + path.sep;
  return target.startsWith(root) ? target : null;
}

/** Parses a single `bytes=` range; null means "send the whole file". */
function parseRange(header: string | null, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header ?? "");
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return null;

  // A suffix range (`bytes=-500`) asks for the final N bytes.
  const start = rawStart === "" ? Math.max(0, size - Number(rawEnd)) : Number(rawStart);
  const end = rawStart === "" || rawEnd === "" ? size - 1 : Number(rawEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return "unsatisfiable" as const;

  return { start, end: Math.min(end, size - 1) };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  const filePath = resolveWithin(segments);
  if (!filePath) return new Response("Not found", { status: 404 });

  let info;
  try {
    info = await stat(filePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!info.isFile()) return new Response("Not found", { status: 404 });

  const ext = path.extname(filePath).toLowerCase();
  const type = TYPE_BY_EXT[ext];
  // Anything not on the upload route's allowlist could have predated it or been
  // dropped in by hand; refuse rather than guess a type for it.
  if (!type) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": type,
    "Cache-Control": CACHE,
    "Accept-Ranges": "bytes",
    // Stops a browser from re-interpreting a file as something more dangerous
    // than the extension we matched on.
    "X-Content-Type-Options": "nosniff",
  });

  // An SVG is an executable document, and this is our own origin. `<img src>`
  // renders it either way (and can't run script there), but navigating straight
  // to the URL would — so force that case to download instead. Same reasoning
  // as the upload route's comment on accepting SVG at all.
  if (ext === ".svg") {
    headers.set("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
  }

  const range = parseRange(request.headers.get("range"), info.size);

  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${info.size}`);
    return new Response(null, { status: 416, headers });
  }

  // Video needs this: without range support a browser can't seek, it can only
  // play what it has downloaded from the start.
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${info.size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    const stream = createReadStream(filePath, { start: range.start, end: range.end });
    return new Response(Readable.toWeb(stream) as ReadableStream, { status: 206, headers });
  }

  headers.set("Content-Length", String(info.size));
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    status: 200,
    headers,
  });
}
