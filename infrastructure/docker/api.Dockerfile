FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/widget/package.json apps/widget/package.json
COPY packages/ai-core/package.json packages/ai-core/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/logger/package.json packages/logger/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
# Public, unversioned URL the built-in widget bundle talks to by default
# (see apps/widget/src/main.ts) — this API image serves that same bundle at
# /widget.js, so it must be baked in pointing at itself.
ARG VITE_PUBLIC_API_URL=http://localhost:4000
ENV VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL
COPY . .
RUN pnpm db:generate
RUN pnpm --filter @botdock/database build
RUN pnpm --filter @botdock/config build
RUN pnpm --filter @botdock/contracts build
RUN pnpm --filter @botdock/logger build
RUN pnpm --filter @botdock/ai-core build
RUN pnpm --filter @botdock/sdk build
RUN pnpm --filter @botdock/widget build
RUN pnpm --filter @botdock/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
# Stable, unversioned path (see deployment.service.ts embed snippet) served
# directly by the API — apps/widget's vite config emits a versioned
# v1/botdock-widget.js so old embeds keep resolving after a future v2 bump.
COPY --from=builder /app/apps/widget/dist/v1/botdock-widget.js ./public/widget.js
EXPOSE 4000
# Migrations run against DIRECT_DATABASE_URL (see schema.prisma) because Neon's
# pooled endpoint cannot hold the advisory lock `migrate deploy` needs.
CMD ["sh", "-c", "packages/database/node_modules/.bin/prisma migrate deploy --schema packages/database/prisma/schema.prisma && node apps/api/dist/main.js"]
