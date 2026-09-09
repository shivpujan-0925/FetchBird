import { Router, Request, Response } from "express";
import { validateUrlMiddleware } from "../middleware/validateUrl.js";
import { infoRateLimiter } from "../middleware/rateLimit.js";
import { fetchInfo } from "../services/ytdlp.service.js";

const router = Router();

function cleanYtDlpError(rawMsg: string): string {
  if (!rawMsg) return "Failed to fetch video information";
  if (rawMsg.includes("exceeds maximum allowed duration")) {
    return rawMsg;
  }
  const match = rawMsg.match(/ERROR:\s*(?:\[[^\]]+\]\s*)?(?:[^\s:]+:\s*)?([^\r\n]+)/);
  if (match) {
    return match[1].trim();
  }
  return rawMsg.replace(/^Error code: Error: Command failed:[^\r\n]*/, "").trim() || rawMsg;
}

router.post("/info", infoRateLimiter, validateUrlMiddleware, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    const info = await fetchInfo(url);
    res.json(info);
  } catch (error: any) {
    console.error("[Route /api/info] Error fetching metadata:", error);
    const rawMsg = error.message || "";
    const cleanMsg = cleanYtDlpError(rawMsg);
    const isClientError =
      rawMsg.includes("exceeds maximum allowed duration") ||
      rawMsg.includes("Private video") ||
      rawMsg.includes("unavailable") ||
      rawMsg.includes("Sign in to confirm your age");

    res.status(isClientError ? 400 : 500).json({
      error: cleanMsg || "Failed to fetch video information",
    });
  }
});

export default router;
