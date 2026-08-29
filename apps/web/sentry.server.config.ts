// Server-side error reporting. Loaded by instrumentation.ts on the Node
// runtime; see the notes there about why the DSN is read at runtime.
//
// The collector is Bugsink (errors.rahyad.com), not sentry.io — sentry.io
// refuses connections from this server's region. Bugsink speaks the Sentry
// ingest protocol, so the stock SDK works unchanged, but it only stores
// errors: tracing, profiling and replays have no backend to land in, so
// they stay off rather than costing bandwidth for events nothing reads.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
  environment: process.env.NODE_ENV,
});
