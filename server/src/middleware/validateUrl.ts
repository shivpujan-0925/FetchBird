import { Request, Response, NextFunction } from "express";

const ALLOWED_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

export function isValidYouTubeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(hostname)) {
      // For youtu.be, ensure pathname has video ID
      if (hostname.includes("youtu.be")) {
        return parsed.pathname.length > 1;
      }
      // For youtube.com, ensure either /watch?v=... or /shorts/... or /live/...
      if (parsed.pathname === "/watch") {
        return Boolean(parsed.searchParams.get("v"));
      }
      if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/live/")) {
        return parsed.pathname.split("/")[2]?.length > 0;
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export function validateUrlMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: "Missing required 'url' parameter" });
    return;
  }

  if (!isValidYouTubeUrl(url)) {
    res.status(400).json({
      error: "Invalid URL. Please provide a valid YouTube URL (youtube.com or youtu.be).",
    });
    return;
  }

  next();
}
