// Next.js calls register() once per runtime as the server boots.
//
// The import is dynamic and inside the runtime check so the Sentry server SDK
// is never pulled into a runtime it does not support. There is no edge branch
// here because this app has no middleware and no route exports
// `runtime = "edge"` — add sentry.edge.config.ts alongside one if that changes.
//
// Server-side env vars are read when the process starts, not at build time, so
// the same image can be promoted between environments and still report to the
// right place.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

// Without this, errors thrown inside React Server Components are swallowed by
// Next's own error boundary and never reach Sentry.
export { captureRequestError as onRequestError } from "@sentry/nextjs";
