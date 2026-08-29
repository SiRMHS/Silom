import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

// Next runs with the app directory as the working directory, so the repo root
// is two levels up regardless of where the npm script was invoked from.
const repoRoot = path.join(process.cwd(), "../..");

const nextConfig: NextConfig = {
  reactStrictMode: false,

  // Emits a self-contained apps/web/.next/standalone/apps/web/server.js with
  // only the traced dependencies, so the Docker image doesn't need node_modules
  // installed at runtime.
  output: "standalone",

  // The workspace packages ship TypeScript source, so Next compiles them
  // alongside the app instead of expecting a build step in each package.
  transpilePackages: ["@rahyad/db", "@rahyad/core"],

  // Standalone traces are rooted at the app by default, which would miss the
  // packages one level up.
  outputFileTracingRoot: repoRoot,
};

// Wires the SDK into the build: instruments the server bundle and rewrites
// stack frames so they point at source rather than compiled output.
//
// Source map *upload* is off because it targets Sentry's release API, which
// Bugsink does not implement — leaving it on makes every build spend time on
// an upload that ends in a warning. Server-side stack traces stay readable
// regardless; only minified browser traces lose their original line numbers.
export default withSentryConfig(nextConfig, {
  sourcemaps: { disable: true },
  // The build must not fail because the error collector is unreachable — that
  // link is far less reliable than the rest of the build (see Dockerfile).
  silent: true,
});
