FROM node:22-alpine AS builder
ARG VITE_BOTDOCK_WIDGET_URL=http://localhost:5173/botdock-widget.js
ARG VITE_BOTDOCK_API_BASE_URL=http://localhost:4000
ENV VITE_BOTDOCK_WIDGET_URL=$VITE_BOTDOCK_WIDGET_URL
ENV VITE_BOTDOCK_API_BASE_URL=$VITE_BOTDOCK_API_BASE_URL
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/demo-site/package.json apps/demo-site/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @botdock/demo-site build

FROM nginx:1.27-alpine AS runner
COPY infrastructure/docker/nginx-static.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/demo-site/dist /usr/share/nginx/html
EXPOSE 80
