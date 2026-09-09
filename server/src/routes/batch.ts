import { Router, Request, Response } from "express";
import path from "path";
import Job from "../models/Job.js";
import { isValidYouTubeUrl } from "../middleware/validateUrl.js";
import { infoRateLimiter, downloadRateLimiter } from "../middleware/rateLimit.js";
import {
  fetchInfo,
  downloadToFile,
  formatUserFacingError,
  isBotDetectionError,
} from "../services/ytdlp.service.js";
import { enqueueDownload } from "../services/queue.service.js";
import { emitJobProgress } from "../sockets/progress.socket.js";

const router = Router();

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

// POST /api/batch-info
// Accepts: { urls: string[] }
router.post("/batch-info", infoRateLimiter, async (req: Request, res: Response) => {
  try {
    const { urls } = req.body;

    if (!Array.isArray(urls) || urls.length === 0) {
      res.status(400).json({ error: "Please provide an array of YouTube URLs" });
      return;
    }

    // Limit batch to max 10 URLs per request to avoid overwhelming workers
    const targetUrls = urls.slice(0, 10);

    const results = await Promise.all(
      targetUrls.map(async (rawUrl) => {
        const trimmed = (rawUrl || "").trim();
        if (!isValidYouTubeUrl(trimmed)) {
          return {
            url: trimmed,
            success: false,
            error: "Invalid YouTube URL",
          };
        }

        try {
          const info = await fetchInfo(trimmed);
          return {
            url: trimmed,
            success: true,
            info,
          };
        } catch (err: any) {
          const rawMsg = err.message || "";
          const cleanMsg = formatUserFacingError(rawMsg);
          return {
            url: trimmed,
            success: false,
            error: cleanMsg,
            isBotChallenge: isBotDetectionError(rawMsg),
          };
        }
      })
    );

    res.json({ results });
  } catch (error: any) {
    console.error("[Route /api/batch-info] Error:", error);
    res.status(500).json({ error: error.message || "Failed to process batch info" });
  }
});

export interface BatchDownloadItem {
  url: string;
  formatId?: string;
  title?: string;
  thumbnail?: string;
  ext?: string;
}

// POST /api/batch-download
// Accepts: { items: BatchDownloadItem[] }
router.post("/batch-download", downloadRateLimiter, async (req: Request, res: Response) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Please provide an array of download items" });
      return;
    }

    const tempDir = path.resolve(process.env.TEMP_DIR || "./tmp");
    const createdJobs = [];

    for (const item of items.slice(0, 10)) {
      const { url, formatId = "best", title = "video", thumbnail, ext = "mp4" } = item;

      if (!isValidYouTubeUrl(url)) {
        continue;
      }

      // Create Job in DB
      const job = await Job.create({
        url,
        title,
        thumbnail,
        formatId,
        status: "pending",
        progress: 0,
      });

      const jobId = job._id.toString();
      const safeTitle = sanitizeFilename(title);
      const isAudioOnly =
        !formatId.includes("bestvideo") &&
        !formatId.includes("direct") &&
        (ext === "mp3" ||
          formatId === "bestaudio/best" ||
          formatId === "bestaudio" ||
          formatId === "audio-mp3");
      const fileExt = isAudioOnly ? "mp3" : "mp4";
      const outPath = path.join(tempDir, `${jobId}_${safeTitle}.${fileExt}`);

      // Enqueue download task in p-queue
      enqueueDownload(async () => {
        try {
          console.log(`[Queue] Starting batch task for job ${jobId}`);

          await Job.findByIdAndUpdate(jobId, { status: "downloading" });
          emitJobProgress(jobId, { jobId, status: "downloading", progress: 0 });

          let lastUpdatedProgress = 0;

          const actualPath = await downloadToFile(
            url,
            formatId,
            outPath,
            async (progress, speed, eta) => {
              emitJobProgress(jobId, {
                jobId,
                status: "downloading",
                progress,
                speed,
                eta,
              });

              if (progress - lastUpdatedProgress >= 10 || progress === 100) {
                lastUpdatedProgress = progress;
                await Job.findByIdAndUpdate(jobId, { progress });
              }
            },
            async (status) => {
              await Job.findByIdAndUpdate(jobId, {
                status,
                progress: status === "merging" ? 95 : 100,
              });
              emitJobProgress(jobId, {
                jobId,
                status,
                progress: status === "merging" ? 95 : 100,
              });
            }
          );

          const finalSavedPath = actualPath || outPath;

          await Job.findByIdAndUpdate(jobId, {
            status: "ready",
            progress: 100,
            filePath: finalSavedPath,
          });

          emitJobProgress(jobId, {
            jobId,
            status: "ready",
            progress: 100,
            filePath: finalSavedPath,
          });
        } catch (err: any) {
          console.error(`[Job ${jobId}] Batch item failed:`, err);
          const rawMsg = err.message || "Download failed";
          const errorMessage = formatUserFacingError(rawMsg);
          await Job.findByIdAndUpdate(jobId, {
            status: "failed",
            errorMessage,
          });
          emitJobProgress(jobId, {
            jobId,
            status: "failed",
            progress: 0,
            error: errorMessage,
          });
        }
      });

      createdJobs.push({
        jobId,
        url,
        title,
        thumbnail,
        formatId,
        ext: fileExt,
      });
    }

    res.status(201).json({ jobs: createdJobs });
  } catch (error: any) {
    console.error("[Route /api/batch-download] Error:", error);
    res.status(500).json({ error: error.message || "Failed to create batch downloads" });
  }
});

export default router;
