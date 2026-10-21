# My Page app image (Next.js + Prisma), for the Hetzner server.
# Built and run by docker-compose.prod.yml; see DEPLOY.md.
#
# Debian slim rather than Alpine: Prisma's query engine and sharp both ship
# glibc builds, and Prisma needs OpenSSL present at generate and run time.

FROM node:22-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time,
# so the site URL has to be known here, not only at runtime.
ARG NEXT_PUBLIC_SITE_URL=https://mypage.cv
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    STORAGE_DIR=/app/storage
# The full node_modules (dev dependencies included) stays in the image: the
# prisma CLI and tsx are needed on the server for `prisma db push`, the seeds
# and scripts/migrate-sqlite-to-postgres.ts. server.js is the entry point, so
# Next's standalone output is not an option (see the comment in server.js).
COPY --from=build --chown=node:node /app /app
COPY --chmod=755 deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
