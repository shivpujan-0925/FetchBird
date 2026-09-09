# FetchBird

A local-first YouTube media downloader built with MongoDB, Express, React (Vite + TypeScript), and Node.js. Styled with shadcn/ui principles — minimal, neutral, with light and dark mode, and real-time Socket.IO download progress.

---

## Features

- **Single-Column Workflow**: URL input & drag-and-drop ➔ Metadata & format selection ➔ Realtime download & muxing progress ➔ Direct native file save.
- **Realtime Updates**: Socket.IO streams percentage, download speed, ETA, and audio/video muxing state directly to the client.
- **Format Intelligence**: Curated resolutions (1080p, 720p, 480p, 360p) with FFmpeg audio/video muxing, plus high-quality MP3 audio extraction.
- **In-Memory Concurrency Queue**: Powered by `p-queue` to cap simultaneous downloads and prevent CPU starvation.
- **Self-Cleaning Storage**: Expired files in temporary storage are automatically swept every 15 minutes, paired with MongoDB TTL indexes.
- **Zero-Config Development**: Seamless fallback to in-memory MongoDB if no local `mongod` instance is currently running, and automatic `yt-dlp` binary management via `yt-dlp-wrap`.
- **Security & Safety**: Host validation (`youtube.com`, `youtu.be`), array-only argument execution to eliminate shell injection, rate limiting, and maximum video duration caps.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| UI & Styling | Radix UI primitives, Tailwind CSS, Lucide icons |
| Design Tokens | shadcn/ui neutral palette with cobalt blue accent, CSS variables |
| State & Query | TanStack Query (React Query) |
| Realtime | Socket.IO client & server |
| Backend | Node.js (ESM), Express, TypeScript (`tsx`) |
| Database | MongoDB + Mongoose (with in-memory fallback for local dev) |
| Media Engine | `yt-dlp` (`yt-dlp-wrap`) + `ffmpeg-static` + `fluent-ffmpeg` |
| Concurrency | `p-queue` |

---

## Quick Start

### 1. Prerequisites
- **Node.js** (v18 or higher; v24 recommended)
- **npm**

### 2. Installation

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Environment Variables

Create `server/.env` (or copy from `server/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/fetchbird
CLIENT_ORIGIN=http://localhost:5173
TEMP_DIR=./tmp
FILE_TTL_MINUTES=60
MAX_CONCURRENT_DOWNLOADS=2
MAX_VIDEO_DURATION_SECONDS=7200
```

> **Note on MongoDB**: If you have a local MongoDB daemon or Atlas connection, supply it in `MONGO_URI`. If none is available, the backend automatically starts an in-memory MongoDB instance for local testing.

### 4. Running Locally

Start the backend:
```bash
cd server
npm run dev
```

In a separate terminal, start the frontend:
```bash
cd client
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## Architecture & API Specification

### Endpoints

- `POST /api/info`
  - Body: `{ "url": "https://youtube.com/watch?v=..." }`
  - Returns video title, thumbnail, duration, channel, and available formats.
- `POST /api/download`
  - Body: `{ "url": "...", "formatId": "...", "title": "...", "ext": "mp4" }`
  - Creates a Job in MongoDB and pushes it to the worker queue. Returns `{ "jobId": "..." }`.
- `GET /api/status/:jobId`
  - Returns current job status (`pending`, `downloading`, `merging`, `ready`, `failed`) and progress percentage.
- `GET /api/file/:jobId`
  - Streams the completed file with `Content-Disposition: attachment` when `status === "ready"`. Returns 409 if still in progress.

### Realtime Events (Socket.IO)

- Client connects and emits: `socket.emit("subscribe", jobId)`
- Server emits to job room:
  ```json
  {
    "jobId": "...",
    "status": "downloading",
    "progress": 45,
    "speed": "3.5MiB/s",
    "eta": "00:05"
  }
  ```
- When muxing starts:
  ```json
  {
    "jobId": "...",
    "status": "merging",
    "progress": 95
  }
  ```
- When finished:
  ```json
  {
    "jobId": "...",
    "status": "ready",
    "progress": 100
  }
  ```

---

## Production Deployment Guide

Due to long-running media muxing (FFmpeg), large temporary video files (1080p/4K), persistent WebSockets (Socket.IO), and child processes (`yt-dlp`), FetchBird requires a persistent server or container rather than serverless functions.

### Option A: Docker & Docker Compose (Recommended)

FetchBird includes a production-ready multi-stage `Dockerfile` and `docker-compose.yml` that bundles Node 20, Python3, FFmpeg, the latest `yt-dlp`, and built client assets into a single unified container.

1. **Clone the repository on your VPS (Ubuntu/Debian, DigitalOcean, Hetzner, AWS EC2):**
   ```bash
   git clone https://github.com/yourusername/fetchbird.git
   cd fetchbird
   ```

2. **Launch with Docker Compose:**
   ```bash
   docker compose up -d --build
   ```
   This automatically:
   - Compiles the React Vite frontend into optimized static assets.
   - Compiles the TypeScript backend.
   - Installs system FFmpeg, Python 3, and `yt-dlp`.
   - Starts MongoDB with persistent volumes.
   - Starts the server on port `5000` (serving both the API, WebSockets, and frontend SPA).

3. **Configure Nginx Reverse Proxy with SSL:**
   Copy the pre-configured Nginx config from `deploy/nginx.conf`:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/fetchbird
   sudo ln -s /etc/nginx/sites-available/fetchbird /etc/nginx/sites-enabled/
   # Edit domain name in /etc/nginx/sites-available/fetchbird
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

### Option B: Bare-Metal / Standard VPS (PM2 + Nginx)

1. **Install System Dependencies:**
   ```bash
   # Node.js 20 LTS
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs ffmpeg python3 git nginx certbot python3-certbot-nginx

   # Install PM2 process manager
   sudo npm install -g pm2
   ```

2. **Clone & Build:**
   ```bash
   git clone https://github.com/yourusername/fetchbird.git /var/www/fetchbird
   cd /var/www/fetchbird

   # Install dependencies and build
   cd server && npm ci && npm run build
   cd ../client && npm ci && npm run build
   cd ..
   ```

3. **Configure Production Environment (`server/.env`):**
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/fetchbird
   TEMP_DIR=./tmp
   FILE_TTL_MINUTES=60
   MAX_CONCURRENT_DOWNLOADS=2
   MAX_VIDEO_DURATION_SECONDS=21600
   ```

4. **Start with PM2:**
   ```bash
   cd /var/www/fetchbird/server
   pm2 start dist/server.js --name "fetchbird"
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx & SSL:**
   Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/fetchbird` and obtain an SSL certificate via `certbot --nginx`.

---

### Option C: PaaS Cloud Deployment (Railway / Render)

1. Push your code to a GitHub repository.
2. In **Railway** or **Render**, create a **New Service** from your GitHub repo.
3. Choose **Dockerfile** as the build mechanism.
4. Set Environment Variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `MONGO_URI=mongodb+srv://...` (from MongoDB Atlas or Railway MongoDB service)
   - `MAX_CONCURRENT_DOWNLOADS=2`
5. Deploy! Railway and Render will automatically execute the multi-stage `Dockerfile` and expose your service.

---

## Scope & Legal Disclaimer

FetchBird is intended for personal media archiving and rights-cleared content (such as videos you have authored, Creative Commons licensed material, or media with authorized distribution permissions). Respect intellectual property rights and YouTube's Terms of Service.
