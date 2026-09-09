import { Router, Request, Response } from "express";
import { validateUrlMiddleware } from "../middleware/validateUrl.js";
import { infoRateLimiter } from "../middleware/rateLimit.js";
import { fetchInfo, formatUserFacingError, isBotDetectionError } from "../services/ytdlp.service.js";

const router = Router();

router.post("/info", infoRateLimiter, validateUrlMiddleware, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const info = await fetchInfo(url);
    res.json(info);
  } catch (error: any) {
    console.error("[Route /api/info] Error fetching metadata:", error);
    const rawMsg = error.message || "";
    const cleanMsg = formatUserFacingError(rawMsg);
    const isBot = isBotDetectionError(rawMsg);
    const isClientError =
      rawMsg.includes("exceeds maximum allowed duration") ||
      rawMsg.includes("Private video") ||
      rawMsg.includes("unavailable") ||
      rawMsg.includes("Sign in to confirm your age");

    res.status(isClientError ? 400 : isBot ? 429 : 500).json({
      error: cleanMsg || "Failed to fetch video information",
      isBotChallenge: isBot,
    });
  }
});

export default router;
