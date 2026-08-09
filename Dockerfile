# Build a lean production image for Cloud Run
FROM node:lts-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0

# Non-root user for Cloud Run
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY index.js ./
COPY constants ./constants
COPY schema ./schema
COPY services ./services
COPY db ./db

USER nodejs

EXPOSE 8080

# Cloud Run sends SIGTERM on scale-down; Node handles it in index.js
CMD ["node", "index.js"]
