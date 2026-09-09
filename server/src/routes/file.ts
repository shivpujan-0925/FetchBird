import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import Job from "../models/Job.js";

const router = Router();

// GET /api/status/:jobId
router.get("/status/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json({
      jobId: job._id,
      status: job.status,
      progress: job.progress,
      title: job.title,
      thumbnail: job.thumbnail,
      errorMessage: job.errorMessage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch job status" });
  }
});

// GET /api/file/:jobId
router.get("/file/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    let job = await Job.findById(jobId).catch(() => null);

    const tempDir = path.resolve(process.env.TEMP_DIR || "./tmp");
    let actualFilePath = job?.filePath;

    // If job not found in DB or path doesn't exist, search tempDir directly
    if (!actualFilePath || !fs.existsSync(actualFilePath)) {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const match = files.find(
          (f) => f.startsWith(`${jobId}_`) && !f.endsWith(".part") && !f.includes(".temp.")
        );
        if (match) {
          actualFilePath = path.join(tempDir, match);
        }
      }
    }

    if (!actualFilePath || !fs.existsSync(actualFilePath)) {
      if (job && job.status !== "ready") {
        res.status(409).json({
          error: "File is not ready yet",
          status: job.status,
          progress: job.progress,
        });
        return;
      }
      res.status(404).json({ error: "File not found or has expired from server" });
      return;
    }

    const filename = path.basename(actualFilePath);
    const ext = path.extname(filename) || (actualFilePath.endsWith(".mp3") ? ".mp3" : ".mp4");
    const isAudio = ext.toLowerCase() === ".mp3";

    // Extract title from job or filename (stripping jobId_ prefix)
    let rawTitle = job?.title;
    if (!rawTitle) {
      const baseName = path.parse(filename).name;
      rawTitle = baseName.startsWith(`${jobId}_`) ? baseName.slice(jobId.length + 1) : baseName;
    }

    const sanitizedBase = rawTitle.replace(/[^\w\s.-]/gi, "_").trim() || "download";
    const finalDownloadFilename = `${sanitizedBase}${ext}`;
    const asciiFilename = finalDownloadFilename.replace(/[^\x20-\x7E]/g, "_");

    const stat = fs.statSync(actualFilePath);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(finalDownloadFilename)}`
    );
    res.setHeader("Content-Type", isAudio ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Length", stat.size.toString());

    const fileStream = fs.createReadStream(actualFilePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error("[Route /api/file] Error streaming file:", error);
    res.status(500).json({ error: error.message || "Failed to download file" });
  }
});

export default router;
