# ==========================================
# Stage 1: Build Frontend (Vite + React)
# ==========================================
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Build Backend (TypeScript)
# ==========================================
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# ==========================================
# Stage 3: Production Runtime
# ==========================================
FROM node:22-bookworm-slim AS runner

# Install FFmpeg, Python3, curl, unzip, ca-certificates, debianutils for yt-dlp & media muxing
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    unzip \
    ca-certificates \
    debianutils \
    && rm -rf /var/lib/apt/lists/*

# Install Deno (official recommended JS challenge solver for yt-dlp)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

# Install latest yt-dlp binary system-wide
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

ENV PATH="/usr/local/bin:${PATH}"

WORKDIR /app

# Copy server package files and install production dependencies only
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy compiled server code
COPY --from=server-builder /app/server/dist ./dist

# Copy built frontend into client/dist (served directly by Express SPA static handler)
COPY --from=client-builder /app/client/dist /app/client/dist

# Create runtime directories
RUN mkdir -p /app/server/tmp /app/server/bin

# Environment configuration
ENV NODE_ENV=production \
    PORT=5000 \
    TEMP_DIR=/app/server/tmp \
    CLIENT_DIST_PATH=/app/client/dist \
    FILE_TTL_MINUTES=60 \
    MAX_CONCURRENT_DOWNLOADS=2 \
    MAX_VIDEO_DURATION_SECONDS=21600

EXPOSE 5000

# Start server
CMD ["node", "dist/server.js"]
