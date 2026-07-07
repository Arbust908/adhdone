# ---- Build stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Install build-time deps for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:24-alpine AS runner

WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/.output .output

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", ".output/server/index.mjs"]
