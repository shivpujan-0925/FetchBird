import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import infoRouter from "./routes/info.js";
import downloadRouter from "./routes/download.js";
import fileRouter from "./routes/file.js";
import batchRouter from "./routes/batch.js";
import { getServiceDiagnostics, runRawFormats } from "./services/ytdlp.service.js";

const app = express();

// Trust reverse proxy headers from Render/cloud load balancers (required by express-rate-limit)
app.set("trust proxy", 1);

const clientOrigin = process.env.CLIENT_ORIGIN;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin SPA)
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.endsWith(".onrender.com") ||
        origin.endsWith(".railway.app") ||
        origin === clientOrigin
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// API Routes
app.use("/api", infoRouter);
app.use("/api", downloadRouter);
app.use("/api", fileRouter);
app.use("/api", batchRouter);

// Health check & Diagnostics
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "FetchBird Server" });
});

app.get("/api/status", (_req, res) => {
  res.json({
    status: "ok",
    service: "FetchBird Server",
    diagnostics: getServiceDiagnostics(),
  });
});

app.get("/api/raw-formats", async (req, res) => {
  try {
    const url = (req.query.url as string) || "https://www.youtube.com/watch?v=E4ZJxhyAaH8";
    const result = await runRawFormats(url);
    res.type("text/plain").send(`Command: ${result.command}\n\nSTDOUT:\n${result.stdout}\n\nSTDERR:\n${result.stderr}`);
  } catch (err: any) {
    res.status(500).type("text/plain").send(`Error: ${err.message}`);
  }
});

app.get("/api/cookies-debug", (_req, res) => {
  const secretPath = "/etc/secrets/cookies.txt";
  const tempPath = path.resolve(process.env.TEMP_DIR || "./tmp", "cookies_runtime.txt");

  const inspect = (p: string) => {
    if (!fs.existsSync(p)) return { exists: false };
    const stat = fs.statSync(p);
    const text = fs.readFileSync(p, "utf-8");
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    const cookieNames = lines.map((l) => {
      const parts = l.split(/\t+/);
      return parts[5] || parts[0]?.slice(0, 20);
    });
    return {
      exists: true,
      size: stat.size,
      linesCount: lines.length,
      firstLinePreview: text.slice(0, 60),
      cookieNames: [...new Set(cookieNames)].slice(0, 20),
    };
  };

  res.json({
    secretFile: inspect(secretPath),
    runtimeFile: inspect(tempPath),
    envYoutubeCookiesPresent: Boolean(process.env.YOUTUBE_COOKIES),
    envYoutubeCookiesLength: process.env.YOUTUBE_COOKIES?.length || 0,
  });
});

// Production Static Client Serving (SPA)
const clientDistPath =
  process.env.CLIENT_DIST_PATH ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/health")) {
      return next();
    }
    const indexPath = path.join(clientDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

export default app;
