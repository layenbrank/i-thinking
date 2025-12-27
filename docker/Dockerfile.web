# Build selected front-end app and serve with Nginx
# Usage example:
#   docker build --build-arg APP_DIR=apps/extension -t web:latest -f docker/Dockerfile.web .
#   docker run -p 8080:80 web:latest

ARG NODE_IMAGE=node:22-alpine
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# Copy lockfiles and workspace
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps ./apps

# Which app to build (must contain a Vite/Vitepress build script)
ARG APP_DIR=apps/extension
ENV APP_DIR=${APP_DIR}

RUN pnpm install --frozen-lockfile
RUN pnpm --filter "./${APP_DIR}" build || pnpm --filter "./${APP_DIR}" build:web

# Nginx runtime
FROM nginx:alpine AS runtime

# Default Nginx config for single page apps
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets (dist or .vitepress/dist)
ARG APP_DIR=apps/extension
COPY --from=builder /app/${APP_DIR}/dist /usr/share/nginx/html
COPY --from=builder /app/${APP_DIR}/.vitepress/dist /usr/share/nginx/html 2>/dev/null || true

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
