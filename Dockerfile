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
# builder stage needs a reachable Postgres — pass DATABASE_URL as a build arg
# pointing at a database already migrated to the current schema. See
# docker-compose.yml for how the `db` service is wired up for this.

FROM node:22-alpine AS base
# https://nextjs.org/docs/app/getting-started/deploying#docker (glibc shims for alpine)
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps: install once, cached as long as package.json/lockfile don't change
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
RUN npm ci

# ---- migrator: applies pending Prisma migrations to a running Postgres.
# Only needs the schema + migrations, not the rest of the source tree.
FROM deps AS migrator
COPY packages/db/prisma ./packages/db/prisma
WORKDIR /app/packages/db
ENTRYPOINT ["npx", "prisma", "migrate", "deploy"]

# ---- builder: full source, prisma client generation, next build
FROM deps AS builder
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npm run db:generate
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

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
