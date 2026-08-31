# syntax=docker/dockerfile:1
#
# Monorepo (npm workspaces): apps/web is the Next.js app, packages/db and
# packages/core ship TypeScript source that Next transpiles itself
# (transpilePackages in next.config.ts) — no separate package build step.
#
# apps/web/next.config.ts sets `output: "standalone"` and points
# `outputFileTracingRoot` at the repo root, so `next build` (run from
# apps/web) writes the traced app to:
#   apps/web/.next/standalone/apps/web/server.js
#   apps/web/.next/standalone/node_modules/...
#   apps/web/.next/standalone/packages/db/...
# i.e. paths are nested under the tracing root, not flattened.
#
# `next build` runs generateStaticParams / page-level data fetching against
# the real database (see apps/web/src/app/page.tsx, [slug] routes), so the
# builder stage needs a reachable Postgres — pass DATABASE_URL as a build arg.
# The builder applies pending migrations itself before building, so the
# database only has to be reachable, not already up to date.

FROM node:22-alpine AS base
# https://nextjs.org/docs/app/getting-started/deploying#docker (glibc shims for alpine)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps: install once, cached as long as package.json/lockfile/schema don't change.
# packages/db/prisma and prisma.config.ts have to be in here (not just the
# migrator/builder stages below) because root's `postinstall` runs `prisma
# generate` for @rahyad/db — it needs the schema to generate from, and
# prisma.config.ts (not schema.prisma) is where this project's datasource
# url comes from, since the schema's `datasource` block has no `url` field.
FROM base AS deps
# prisma.config.ts reads DATABASE_URL from process.env. `generate` (below,
# via postinstall) never connects to it, but Prisma's config loader still
# needs *a* string here, before the real DATABASE_URL is set (that only
# happens in `builder`). Scoped to `deps` so it doesn't leak into `runner`,
# which is built FROM base, not FROM deps.
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY packages/db/prisma ./packages/db/prisma
RUN npm ci

# ---- migrator: brings a running Postgres up to date — schema first, then the
# committed content snapshot. Needs only the schema and migrations (already in
# `deps`) plus the snapshot copied below — not the rest of the source tree.
#
# The import is part of this rather than a stage of its own so the server's
# deploy sequence stays one command; it rewrites the content tables from
# packages/db/content-snapshot.json and leaves accounts, comments and the
# contact inbox alone (see prisma/content-models.ts).
FROM deps AS migrator
WORKDIR /app/packages/db
# Copied on its own, after `npm ci` in `deps`, so editing content doesn't
# invalidate the dependency layer and force a reinstall on every push.
COPY packages/db/content-snapshot.json ./content-snapshot.json
# `create-admin` is run by hand against this stage (see docs/DEPLOYMENT.md) and
# is the only thing here that needs a file from src/. `deps` copies no source,
# just the generated client that `prisma generate` wrote into src/generated, so
# this one dependency-free file is added rather than the whole tree.
COPY packages/db/src/password.ts ./src/password.ts
ENTRYPOINT ["sh", "-c", "npm run migrate:deploy && npm run import"]

# ---- builder: full source, prisma client generation, next build
FROM deps AS builder
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate
# `next build` below reads the database, so the schema has to be current before
# it runs — otherwise adding a migration breaks the build until someone applies
# it by hand. Same command the `migrator` stage runs; `npm run -w` puts the cwd
# on packages/db, which is where prisma.config.ts resolves its paths from.
RUN npm run migrate:deploy -w @rahyad/db
# Deliberately no `db:import` here. Every public page is prerendered by
# `next build` against this database, and the snapshot exists so a build against
# an empty CI database still produces real pages rather than blank ones. But on
# Coolify DATABASE_URL points at the production Postgres, where the content
# already is — and the import treats the snapshot as authoritative, deleting any
# row it doesn't contain (see packages/db/prisma/import-content.ts). Running it
# here wiped every media item and edit the admin panel had added since the
# snapshot was last exported, on every single deploy.
#
# The server is the source of truth for content; `db:export` is how it comes
# back into git. Restore this line only for a build whose DATABASE_URL is a
# throwaway database.
# The one place that has both the script and a live connection. The runtime
# image is the traced standalone output — no tsx, no Prisma CLI, no
# packages/db source — so this cannot be done by exec'ing into the running
# container later, and nothing else on any deploy path creates a user
# (migrations only move the schema; the snapshot deliberately skips accounts).
#
# Idempotent, and it only reaches the live database when DATABASE_URL points at
# it, which is the case on Coolify where the build talks to the managed
# Postgres. On the GitHub Actions path DATABASE_URL is a throwaway container,
# so there this writes a user nobody sees and the account is made on the server
# instead — see docs/DEPLOYMENT.md.
RUN npm run db:create-admin
RUN npm run build

# ---- runner: minimal production image, no node_modules/source beyond what was traced
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

WORKDIR /app/apps/web

COPY --from=builder /app/apps/web/.next/standalone /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static

# Local upload storage (apps/web/src/app/api/admin/upload/route.ts writes
# under process.cwd()/public/uploads) — docker-compose mounts a volume here.
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

# Uploads committed to the repo are kept outside the mount point as well, since
# the volume hides ./public/uploads at runtime; the entrypoint copies in
# whatever the volume is missing. Without this, a `Media` row from the content
# snapshot could point at a file the running container cannot see.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public/uploads /app/seed-uploads
COPY --chown=nextjs:nodejs apps/web/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
