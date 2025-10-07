# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Speed up installs
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# Only copy necessary files for install (relative to build context root ".")
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/service/package.json ./apps/service/package.json

# Install workspace deps
RUN pnpm install --frozen-lockfile

# Copy service sources
COPY apps/service ./apps/service

# Build service
WORKDIR /app/apps/service
RUN pnpm build

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
	PORT=9000 \
	PROTOCOL=http \
	HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

# Copy only dist and package manifest
COPY --from=builder /app/apps/service/package.json ./package.json
COPY --from=builder /app/apps/service/dist ./dist

# Install only production deps using npm to避免pnpm工作区复杂性
RUN npm install --omit=dev --no-audit --no-fund

USER nodeusr
EXPOSE 9000
CMD ["node", "dist/main.js"]
