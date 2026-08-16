import path from "node:path";
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

export default nextConfig;
