FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
ARG NEXT_PUBLIC_BOTDOCK_API_BASE_URL=http://localhost:4000
ARG NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID=local-botdock-labs
ENV NEXT_PUBLIC_BOTDOCK_API_BASE_URL=$NEXT_PUBLIC_BOTDOCK_API_BASE_URL
ENV NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID=$NEXT_PUBLIC_BOTDOCK_ORGANISATION_ID
COPY . .
RUN pnpm --filter @botdock/contracts build
RUN pnpm --filter @botdock/ui build
RUN pnpm --filter @botdock/web build

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
