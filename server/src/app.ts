import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import infoRouter from "./routes/info.js";
import downloadRouter from "./routes/download.js";
import fileRouter from "./routes/file.js";
import batchRouter from "./routes/batch.js";

const app = express();

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

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "FetchBird Server" });
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
