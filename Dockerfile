# Multi-stage Dockerfile for ReplyGuy monorepo
# Excludes apps/web as it can be hosted separately

FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY apps/ingestion/package.json ./apps/ingestion/
COPY apps/worker/package.json ./apps/worker/

RUN corepack enable pnpm && pnpm install --frozen-lockfile
ENV PATH="/root/.local/share/pnpm:$PATH"

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Enable pnpm in builder stage
RUN corepack enable pnpm
ENV PATH="/root/.local/share/pnpm:$PATH"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove web app from workspace to exclude it from build
RUN sed -i '/apps\/web/d' pnpm-workspace.yaml

# Build applications (excluding web)
RUN pnpm turbo build --filter='./apps/ingestion' --filter='./apps/worker' --filter='./packages/*'

# Production image for Node.js services
FROM base AS runner-node
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nodejs

# Copy built applications and install production dependencies
COPY --from=builder --chown=nodejs:nodejs /app/apps/ingestion/dist ./apps/ingestion/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/ingestion/package.json ./apps/ingestion/
COPY --from=builder --chown=nodejs:nodejs /app/apps/worker/package.json ./apps/worker/
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./

# Install production dependencies
RUN corepack enable pnpm && pnpm install --prod --frozen-lockfile

USER nodejs

# Python image for AI agent
FROM python:3.11-slim AS runner-python
WORKDIR /app

ENV PYTHONPATH=/app

RUN pip install poetry

# Copy the entire ai_agent directory first
COPY apps/ai_agent ./

# Install dependencies and activate virtual environment
RUN poetry config virtualenvs.create false && \
    poetry install --only=main

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Default to Node.js runner
FROM runner-node AS default
EXPOSE 3001 3002

# Create entrypoint script
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]