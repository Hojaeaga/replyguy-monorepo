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

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove web app from workspace to exclude it from build
RUN sed -i '/apps\/web/d' pnpm-workspace.yaml

# Build applications (excluding web)
RUN npx turbo build --filter='./apps/ingestion' --filter='./apps/worker' --filter='./packages/*'

# Production image for Node.js services
FROM base AS runner-node
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 --ingroup nodejs nodejs

# Copy built applications
COPY --from=builder --chown=nodejs:nodejs /app/apps/ingestion/dist ./apps/ingestion/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/ingestion/package.json ./apps/ingestion/
COPY --from=builder --chown=nodejs:nodejs /app/apps/worker/package.json ./apps/worker/
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

# Python image for AI agent
FROM python:3.11-slim AS runner-python
WORKDIR /app

ENV PYTHONPATH=/app
ENV POETRY_NO_INTERACTION=1
ENV POETRY_VENV_IN_PROJECT=1
ENV POETRY_CACHE_DIR=/tmp/poetry_cache

RUN pip install poetry

COPY apps/ai_agent/pyproject.toml apps/ai_agent/poetry.lock ./
RUN poetry install --only=main && rm -rf $POETRY_CACHE_DIR

COPY --chown=1001:1001 apps/ai_agent ./

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Default to Node.js runner
FROM runner-node AS default
EXPOSE 3001 3002

# Create entrypoint script
COPY --chown=nodejs:nodejs scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]