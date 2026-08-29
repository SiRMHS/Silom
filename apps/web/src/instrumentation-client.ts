// Browser-side error reporting. Next.js loads this file automatically on the
// client; it is the client counterpart to sentry.server.config.ts.
//
// NEXT_PUBLIC_ is required here and not merely conventional: this value is
// inlined into the client bundle at `next build`, so it is baked into the
// image rather than read from the container's environment. Changing the DSN
// therefore needs a rebuild, not just a restart.
//
// A DSN is not a secret — it only grants permission to *send* events, which
// is exactly what every visitor's browser has to do.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Bugsink stores errors only — see sentry.server.config.ts.
  tracesSampleRate: 0,
  environment: process.env.NODE_ENV,
});

// Lets Sentry tie a slow or failed client-side navigation to the error it
// produced. Cheap, and unrelated to tracing being off above.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
