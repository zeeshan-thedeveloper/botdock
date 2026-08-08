FROM node:22-alpine AS builder
ARG VITE_PUBLIC_API_URL=http://localhost:4000
ENV VITE_PUBLIC_API_URL=$VITE_PUBLIC_API_URL
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/widget/package.json apps/widget/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @botdock/contracts build
RUN pnpm --filter @botdock/sdk build
RUN pnpm --filter @botdock/widget build

FROM nginx:1.27-alpine AS runner
COPY infrastructure/docker/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/widget/dist /usr/share/nginx/html
EXPOSE 80
