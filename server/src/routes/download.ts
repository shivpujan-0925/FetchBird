import { Router, Request, Response } from "express";
import path from "path";
import Job from "../models/Job.js";
import { validateUrlMiddleware } from "../middleware/validateUrl.js";
import { downloadRateLimiter } from "../middleware/rateLimit.js";
import { enqueueDownload } from "../services/queue.service.js";
import { downloadToFile, formatUserFacingError } from "../services/ytdlp.service.js";
import { emitJobProgress } from "../sockets/progress.socket.js";

const router = Router();

// Sanitize filename helper
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

router.post("/download", downloadRateLimiter, validateUrlMiddleware, async (req: Request, res: Response) => {
  try {
    const { url, formatId = "best", title = "video", thumbnail, ext = "mp4" } = req.body;

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

    // Prepare destination file path in temp directory
    const tempDir = path.resolve(process.env.TEMP_DIR || "./tmp");
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

    // Enqueue task
    enqueueDownload(async () => {
      try {
        console.log(`[Queue] Starting download for job ${jobId}`);

        await Job.findByIdAndUpdate(jobId, { status: "downloading" });
        emitJobProgress(jobId, { jobId, status: "downloading", progress: 0 });

        let lastUpdatedProgress = 0;

        const actualPath = await downloadToFile(
          url,
          formatId,
          outPath,
          async (progress, speed, eta) => {
            // Emit realtime progress to socket subscribers
            emitJobProgress(jobId, {
              jobId,
              status: "downloading",
              progress,
              speed,
              eta,
            });

            // Update database periodically (every 10%)
            if (progress - lastUpdatedProgress >= 10 || progress === 100) {
              lastUpdatedProgress = progress;
              await Job.findByIdAndUpdate(jobId, { progress });
            }
          },
          async (status) => {
            console.log(`[Job ${jobId}] Status change -> ${status}`);
            await Job.findByIdAndUpdate(jobId, {
              status,
              progress: status === "merging" ? 95 : status === "ready" ? 100 : 0,
            });
            emitJobProgress(jobId, {
              jobId,
              status,
              progress: status === "merging" ? 95 : 100,
            });
          }
        );

        const finalSavedPath = actualPath || outPath;

        // Mark ready
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

        console.log(`[Job ${jobId}] Finished. File saved at ${outPath}`);
      } catch (err: any) {
        console.error(`[Job ${jobId}] Download failed:`, err);
        const errorMessage = formatUserFacingError(err.message || "Download failed");

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

    res.status(201).json({ jobId });
  } catch (error: any) {
    console.error("[Route /api/download] Error creating download job:", error);
    res.status(500).json({
      error: error.message || "Failed to create download job",
    });
  }
});

export default router;
