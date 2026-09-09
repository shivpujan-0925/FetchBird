import http from "http";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { setupSocketIO } from "./sockets/progress.socket.js";
import { startCleanupScheduler } from "./services/cleanup.service.js";
import { getYtDlp } from "./services/ytdlp.service.js";

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const server = http.createServer(app);

// Setup Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".railway.app") ||
        origin === CLIENT_ORIGIN
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setupSocketIO(io);

async function startServer() {
  try {
    // 1. Connect database
    await connectDB();

    // 2. Start background cleanup scheduler
    startCleanupScheduler(15);

    // 3. Pre-warm or check yt-dlp binary asynchronously
    getYtDlp().catch((err) => {
      console.warn("[Server] yt-dlp binary init warning:", err.message);
    });

    // 4. Start HTTP & Socket server
    server.listen(PORT, () => {
      console.log(`[FetchBird Server] Running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log("\n[Server] Shutting down gracefully...");
  server.close(async () => {
    await disconnectDB();
    console.log("[Server] Closed HTTP and DB connections.");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

startServer();
